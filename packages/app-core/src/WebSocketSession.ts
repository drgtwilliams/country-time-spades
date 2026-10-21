/**
 * WebSocketSession — multiplayer session driver.
 *
 * Implements the same interface as GameSession so the UI doesn't care
 * whether running locally or over WebSocket. The client connects to
 * the M4 server, sends actions, and receives state snapshots + events.
 *
 * M4: real-time multiplayer via WebSocket
 * M5: auto-reconnect with exponential backoff
 */

import type { Action, EngineEvent, GameState } from 'engine';
import type { GameConfig } from 'engine';

/**
 * Session interface shared by GameSession (local) and WebSocketSession (remote).
 *
 * UI hooks call these methods regardless of mode.
 */
export interface ISession {
  /** Apply a player action. */
  apply(action: Action): EngineEvent[];
  /** Read-only access to the current game state. */
  readonly state: GameState;
  /** Read-only access to the event log. */
  readonly events: readonly EngineEvent[];
  /** Clear consumed events from the log. */
  clearEvents(): void;
  /** Start the next hand. */
  startNextHand(): EngineEvent[];
}

/**
 * WebSocketSession — runs the engine on a remote server via WebSocket.
 *
 * Connection flow:
 *   1. Connect to wss://server/ws
 *   2. Send CreateRoom or JoinRoom
 *   3. Receive initial RoomState with full GameState
 *   4. Send Action messages → receive RoomState snapshots
 *   5. UI updates from state.events
 *
 * Reconnection (M5): on disconnect, auto-reconnect and request full state snapshot.
 */
export class WebSocketSession implements ISession {
  private ws: WebSocket | null = null;
  private _state: GameState | null = null;
  private _events: EngineEvent[] = [];
  private pendingActions: Action[] = [];

  /** Server WebSocket URL. */
  private readonly serverUrl: string;
  /** Room invite code. */
  private readonly roomCode: string;
  /** Player name. */
  private readonly playerName: string;
  /** Whether to auto-create a room on connect. */
  private readonly isHost: boolean;
  /** Game config (only used by host when creating room). */
  private readonly config: GameConfig | null;

  /** Callback when full state is received. */
  onStateReady?: (state: GameState, code: string) => void;
  /** Callback when a room error occurs. */
  onError?: (message: string) => void;
  /** Callback when the room closes. */
  onRoomClosed?: () => void;

  constructor(options: {
    serverUrl: string;
    roomCode?: string;
    playerName?: string;
    isHost?: boolean;
    config?: GameConfig | null;
  }) {
    this.serverUrl = options.serverUrl;
    this.roomCode = options.roomCode ?? '';
    this.playerName = options.playerName ?? 'Player';
    this.isHost = options.isHost ?? false;
    this.config = options.config ?? null;

    this.connect();
  }

  /**
   * Open WebSocket connection and join/create room.
   */
  private connect(): void {
    this.ws = new WebSocket(this.serverUrl);

    this.ws.onopen = () => {
      if (this.isHost) {
        // Create a new room
        this.ws!.send(JSON.stringify({
          type: 'CreateRoom',
          config: this.config,
          name: this.playerName,
          isHuman: true,
        }));
      } else if (this.roomCode) {
        // Join existing room
        this.ws!.send(JSON.stringify({
          type: 'JoinRoom',
          code: this.roomCode,
          name: this.playerName,
          isHuman: true,
        }));
      }
    };

    this.ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data.toString());
        this.handleServerMessage(msg);
      } catch {
        console.error('WebSocketSession: failed to parse message', event.data);
      }
    };

    this.ws.onclose = () => {
      // M5: auto-reconnect with exponential backoff
      // For M4: notify UI
    };

    this.ws.onerror = () => {
      // M5: handle connection errors gracefully
    };
  }

  /**
   * Handle incoming server messages.
   */
  private handleServerMessage(msg: Record<string, unknown>): void {
    switch (msg.type) {
      case 'RoomState': {
        const state = msg.state as GameState;
        const code = msg.code as string | undefined;
        const events = msg.events as EngineEvent[] | undefined;

        this._state = state;
        if (events && events.length > 0) {
          this._events.push(...events);
        }

        if (code && this.onStateReady) {
          this.onStateReady(state, code);
        }
        break;
      }
      case 'Events': {
        const events = msg.events as EngineEvent[] | undefined;
        if (events && events.length > 0) {
          this.events.push(...events);
        }
        break;
      }
      case 'Error': {
        const message = msg.message as string;
        if (this.onError) {
          this.onError(message);
        }
        break;
      }
      case 'RoomClosed': {
        if (this.onRoomClosed) {
          this.onRoomClosed();
        }
        break;
      }
      case 'Pong':
        // Heartbeat response
        break;
    }
  }

  /**
   * Apply a player action.
   * Sends the action to the server; events arrive via WebSocket.
   */
  apply(action: Action): EngineEvent[] {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      // Queue action while reconnecting
      this.pendingActions.push(action);
      return [];
    }

    this.ws.send(JSON.stringify({ type: 'Action', action }));
    return []; // Events arrive asynchronously
  }

  /**
   * Start the next hand.
   */
  startNextHand(): EngineEvent[] {
    return this.apply({ type: 'NextHand' });
  }

  get state(): GameState {
    if (!this._state) {
      throw new Error('WebSocketSession: state not yet received');
    }
    return this._state;
  }

  get events(): readonly EngineEvent[] {
    return [...this._events];
  }

  clearEvents(): void {
    this._events = [];
  }

  /**
   * Start the game (host only).
   */
  startGame(): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
    this.ws.send(JSON.stringify({ type: 'StartGame' }));
  }

  /**
   * Leave the room.
   */
  leave(): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
    this.ws.send(JSON.stringify({ type: 'LeaveRoom' }));
  }

  /**
   * Close the WebSocket connection.
   */
  disconnect(): void {
    this.leave();
    this.ws?.close();
    this.ws = null;
  }

  /**
   * Check if the session is connected.
   */
  get isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  /**
   * Send a heartbeat ping.
   */
  ping(): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
    this.ws.send(JSON.stringify({ type: 'Ping' }));
  }
}
