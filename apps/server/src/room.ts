/**
 * EngineHost + Room — server-side game state and multiplayer logic.
 *
 * The server runs the same `engine` package that powers solo play.
 * `EngineHost` applies actions on top of the immutable GameState,
 * tracking events in a log. `Room` manages player connections,
 * seat assignment, and WebSocket broadcasting.
 *
 * Key principle: the engine is sacred. The server never bypasses
 * `applyAction()` or `legalActions()` for game logic.
 */

import type {
  Action as EngineAction,
  EngineEvent,
  GameConfig,
  GameState,
} from 'engine';
import {
  applyAction,
  cloneState,
  createGame,
  legalActions,
  currentActor,
} from 'engine';

/* ------------------------------------------------------------------ */
/*  RoomPlayer                                                         */
/* ------------------------------------------------------------------ */

/** A player connected to a room via WebSocket. */
export interface RoomPlayer {
  /** Unique session ID for this connection. */
  id: string;
  /** WebSocket connection — use native WebSocket interface. */
  ws: { send: (msg: string) => void; readyState: number };
  /** Player name (shown at the table). */
  name: string;
  /** Seat index (0–3), null when not yet seated. */
  seat: number | null;
  /** Whether this player is human (true) or AI (false). */
  isHuman: boolean;
  /** Whether this player has disconnected. */
  disconnected: boolean;
}

/* ------------------------------------------------------------------ */
/*  ServerMessage                                                      */
/* ------------------------------------------------------------------ */

/** Server → Client message sent over WebSocket. */
export interface ServerMessage {
  /** Message type discriminator. */
  type:
    | 'RoomState'
    | 'Events'
    | 'PlayerJoined'
    | 'PlayerLeft'
    | 'RoomFull'
    | 'Error'
    | 'Pong'
    | 'StartGame'
    | 'RoomClosed';
  /** Full game state (sent on join/after action). */
  state?: GameState;
  /** New events since last state (sent as deltas). */
  events?: EngineEvent[];
  /** Player info (joined/left messages). */
  seat?: number;
  name?: string;
  /** Error details. */
  message?: string;
  /** Room invite code. */
  code?: string;
}

/* ------------------------------------------------------------------ */
/*  Room                                                               */
/* ------------------------------------------------------------------ */

/**
 * A multiplayer room running a Spades game.
 *
 * State machine:
 *   lobby (0–4 players connected) → playing → scored → lobby → ... → gameOver
 *
 * The room owns an EngineHost and broadcasts state to all connected players.
 */
export class Room {
  /** Unique room invite code (6-char alphanumeric). */
  readonly code: string;
  /** The engine host running this room's game. */
  private engineHost: EngineHost;
  /** Players connected, keyed by seat (0–3). Gaps = empty slots. */
  private playersBySeat: Map<number, RoomPlayer> = new Map();
  /** All known player session IDs (for lookup by ID). */
  private playersById: Map<string, RoomPlayer> = new Map();
  /** The seat of the player who created this room (host). */
  hostId: number = 0;
  /** Game config inherited from host's setup. */
  readonly config: GameConfig;
  /** Seeded random string — deterministic deals. */
  readonly seed: string;
  /** Current game phase at the room level. */
  gamePhase: 'lobby' | 'playing' | 'scored' | 'gameOver' = 'lobby';

  /**
   * Create a new room.
   * @param config — house-rule settings for this game
   * @param seed — deterministic deal seed
   */
  constructor(config: GameConfig, seed: string) {
    this.code = generateInviteCode();
    this.config = config;
    this.seed = seed;
    this.engineHost = new EngineHost(config, seed);
  }

  /**
   * Get the current engine state (for broadcasting on join).
   */
  get engineHostState(): GameState {
    return this.engineHost.currentState;
  }

  /**
   * Register a player and assign a seat if available.
   * @returns the seat assigned (0–3), or null if room is full
   */
  join(player: RoomPlayer): number | null {
    // Find first empty seat
    for (const seat of [0, 1, 2, 3]) {
      if (!this.playersBySeat.has(seat)) {
        player.seat = seat;
        this.playersBySeat.set(seat, player);
        this.playersById.set(player.id, player);
        this.broadcastPlayerUpdate();
        return seat;
      }
    }
    return null; // room full
  }

  /**
   * Remove a player from the room.
   * If the host leaves, a new host is assigned from remaining players.
   * @returns seat and name of the leaving player, or null if not found
   */
  leave(playerId: string): { seat: number; name: string } | null {
    const player = this.playersById.get(playerId);
    if (!player || player.seat === null) return null;

    const seat = player.seat;
    const name = player.name;
    const wasHost = seat === this.hostId;

    // Remove from seat map
    this.playersBySeat.delete(seat);
    this.playersById.delete(playerId);

    // Reassign host if needed
    if (wasHost) {
      const firstPlayer = this.playersById.values().next().value;
      if (firstPlayer && firstPlayer.seat !== null) {
        this.hostId = firstPlayer.seat;
      } else {
        this.hostId = 0;
      }
    }

    this.broadcastPlayerUpdate();
    return { seat, name };
  }

  /**
   * Apply an action from a player.
   * Validates via the engine, applies state, broadcasts result.
   */
  applyAction(playerId: string, action: EngineAction): void {
    const player = this.playersById.get(playerId);
    if (!player) {
      throw new Error(`Player ${playerId} not found in room`);
    }
    if (player.seat === null) {
      throw new Error(`Player ${playerId} not seated`);
    }

    // Validate phase
    if (this.gamePhase === 'lobby') {
      throw new Error('Game not started — host must start the game');
    }

    // Validate actor — is this player the current actor?
    if (action.type !== 'NextHand') {
      const current = this.engineHost.currentActor();
      if (current !== null && current !== player.seat) {
        throw new Error(
          `Not your turn — it's ${seatName(current)}'s turn`
        );
      }
    }

    // Validate legality
    if (!this.engineHost.isLegal(action)) {
      throw new Error(
        `Illegal action: ${player.name} cannot ${action.type}${action.type === 'Play' ? ` ${action.cardId}` : ''}`
      );
    }

    // Apply via engine
    const result = this.engineHost.apply(action);

    // Check for game phase transitions
    if (result.state.phase === 'handOver') {
      this.gamePhase = 'scored';
    } else if (result.state.phase === 'gameOver') {
      this.gamePhase = 'gameOver';
    } else {
      this.gamePhase = 'playing';
    }

    // Broadcast to all players
    this.broadcastState(result.state, result.events);
  }

  /**
   * Start the game (move from lobby to bidding).
   * The engine's createGame already starts at bidding phase.
   */
  startGame(): void {
    this.gamePhase = 'playing';
    this.broadcastState(
      this.engineHost.currentState,
      this.engineHost.currentEvents
    );
  }

  /**
   * Check if the room can start (≥2 players connected).
   */
  canStart(): boolean {
    return this.playersBySeat.size >= 2 && this.gamePhase === 'lobby';
  }

  /**
   * Get the list of players in the room (for UI display).
   */
  getPlayerList(): Array<{
    id: string;
    name: string;
    seat: number;
    isHuman: boolean;
    disconnected: boolean;
  }> {
    const result: Array<{
      id: string;
      name: string;
      seat: number;
      isHuman: boolean;
      disconnected: boolean;
    }> = [];
    for (let seat = 0; seat < 4; seat++) {
      const player = this.playersBySeat.get(seat);
      if (player && player.seat !== null) {
        result.push({
          id: player.id,
          name: player.name,
          seat: player.seat,
          isHuman: player.isHuman,
          disconnected: player.disconnected,
        });
      }
    }
    return result;
  }

  /**
   * Get total player count (connected + disconnected).
   */
  get playerCount(): number {
    return this.playersById.size;
  }

  /**
   * Get connected player count.
   */
  get connectedCount(): number {
    return this.playersBySeat.size;
  }

  /**
   * Check if this room is empty and can be garbage collected.
   */
  isEmpty(): boolean {
    return this.playersBySeat.size === 0 && this.playersById.size === 0;
  }

  // ---- Broadcasting helpers ----

  /**
   * Broadcast a full state snapshot + delta events to all connected players.
   */
  private broadcastState(
    state: GameState,
    events: readonly EngineEvent[],
  ): void {
    const msg: ServerMessage = {
      type: 'RoomState',
      state,
      events: [...events],
    };
    const data = JSON.stringify(msg);

    for (const player of this.playersById.values()) {
      if (!player.disconnected) {
        try {
          player.ws.send(data);
        } catch {
          // Connection closed; player will be cleaned up on next message
        }
      }
    }
  }

  /**
   * Broadcast a player list update (presence change, no game state).
   */
  private broadcastPlayerUpdate(): void {
    const msg: ServerMessage = {
      type: 'PlayerJoined',
      state: this.engineHost.currentState,
    };
    const data = JSON.stringify(msg);

    for (const player of this.playersById.values()) {
      if (!player.disconnected) {
        try {
          player.ws.send(data);
        } catch {
          // Connection closed
        }
      }
    }
  }
}

/* ------------------------------------------------------------------ */
/*  EngineHost                                                         */
/* ------------------------------------------------------------------ */

/**
 * Wraps the engine in a mutable state machine for server-side rooms.
 *
 * Holds the immutable GameState and applies actions on top. Tracks events
 * in a running log so the room can broadcast snapshots and deltas to clients.
 *
 * Does NOT depend on engine internals (MutState, cloneState) — uses only
 * the public API: createGame, applyAction, legalActions, currentActor.
 */
class EngineHost {
  private state: GameState;
  private events: EngineEvent[] = [];

  constructor(config: GameConfig, seed: string) {
    this.state = createGame(config, seed);
    // Capture initial events from createGame
    this.events = [...this.state.events];
  }

  get currentState(): GameState {
    return this.state;
  }

  get currentEvents(): readonly EngineEvent[] {
    return [...this.events];
  }

  /**
   * Return the current actor (the player whose turn it is).
   * Mirrors engine.currentActor for validation.
   */
  currentActor(): number | null {
    return currentActor(this.state);
  }

  /**
   * Check if an action is legal for the current actor.
   */
  isLegal(action: EngineAction): boolean {
    const state = this.state;
    const actor = this.currentActor();
    if (actor === null) return false;

    const legal = legalActions(state);
    return legal.some((la) => actionsEqual(la, action));
  }

  /**
   * Apply an action to the current game state.
   * Updates internal state and appends events.
   */
  apply(action: EngineAction): { state: GameState; events: EngineEvent[] } {
    const result = applyAction(this.state, action);
    this.state = result.state;
    this.events.push(...result.events);
    return { state: result.state, events: result.events };
  }
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

/**
 * Generate a 6-character alphanumeric invite code.
 * Omits confusing characters (I, l, O, 0, 1).
 */
function generateInviteCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

/**
 * Get the seat letter name for display.
 */
function seatName(seat: number): string {
  return ['S', 'E', 'N', 'W'][seat] ?? '?';
}

/**
 * Check if two actions are equal.
 */
function actionsEqual(a: EngineAction, b: EngineAction): boolean {
  if (a.type !== b.type) return false;
  if (a.type === 'Bid' && b.type === 'Bid') return a.kind === b.kind && a.amount === b.amount;
  if (a.type === 'Exchange' && b.type === 'Exchange') return a.out[0] === b.out[0] && a.out[1] === b.out[1];
  if (a.type === 'Play' && b.type === 'Play') return a.cardId === b.cardId;
  if (a.type === 'NextHand' && b.type === 'NextHand') return true;
  return false;
}
