/**
 * Game UI types — types specific to the UI layer, not the engine.
 */

import type { Seat, Action, EngineEvent } from 'engine';

/** Represents a player at the table — either human or AI. */
export interface Player {
  /** Seat position (0-3). */
  seat: Seat;
  /** Display name for the character. */
  name: string;
  /** Whether this seat is controlled by a human. */
  isHuman: boolean;
  /** Whether this seat is controlled by AI. */
  isAI: boolean;
}

/** Current state of the bid pad UI. */
export interface BidPadState {
  /** Digits entered so far. */
  digits: number;
  /** Whether a bid is being entered. */
  active: boolean;
  /** Seat currently bidding. */
  activeSeat: Seat | null;
}

/** A selected card in the hand (for trick play). */
export interface SelectedCard {
  cardId: string;
  seat: Seat;
}

/** Props for the game session context. */
export interface GameContextValue {
  /** The current game session. */
  session: import('app-core').GameSession;
  /** Latest events from the session. */
  events: readonly EngineEvent[];
  /** Apply an action and get events. */
  doAction: (action: Action) => EngineEvent[];
  /** Whether the game is in a human-controlled turn. */
  isHumanTurn: boolean;
  /** Human seat index, or -1 if all-AI table. */
  humanSeat: number;
}
