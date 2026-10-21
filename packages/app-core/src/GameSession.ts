/**
 * GameSession — the session driver that wraps the engine.
 *
 * All game logic flows through this class. UI components never import
 * engine source directly; they call session methods and react to events.
 *
 * M2: minimal session driver (apply actions, expose state).
 * M3: banter queue, character relationship filtering.
 * M4: server authoritative mode (same class, remote engine).
 * M5: persistence layer (load/save sessions).
 */

import { createGame, applyAction, type GameState, type Action, type EngineEvent } from 'engine';
import type { GameConfig } from 'engine';

export interface GameSessionOptions {
  config: GameConfig;
  seed: string;
}

export class GameSession {
  private state: GameState;
  private events: EngineEvent[] = [];

  constructor(options: GameSessionOptions) {
    this.state = createGame(options.config, options.seed);
  }

  /** Apply a player action and return the events it produced. */
  apply(action: Action): EngineEvent[] {
    const result = applyAction(this.state, action);
    this.state = result.state;
    this.events.push(...result.events);
    return result.events;
  }

  /** Read-only access to the current game state. */
  get state(): GameState {
    return this.state;
  }

  /** Read-only access to the event log. */
  get events(): readonly EngineEvent[] {
    return [...this.events];
  }

  /** Clear consumed events from the log. */
  clearEvents(): void {
    this.events = [];
  }

  /** Start a new hand (advances dealer, re-deals). */
  startNextHand(): EngineEvent[] {
    const action: Action = { type: 'NextHand' } as Action;
    return this.apply(action);
  }
}
