/**
 * Engine event types — the complete event stream the personality layer consumes.
 *
 * Exactly 14 event types, no more, no fewer. The engine emits these;
 * the shell reacts. Events are pure data.
 */

import type { Seat, Team, CardId } from './types';

/** Deal complete: dealer seat is known. */
export type DealCompleteEvent = { readonly type: 'DealComplete'; readonly dealer: Seat };

/** A player made a numeric bid. */
export type BidMadeEvent = {
  readonly type: 'BidMade';
  readonly seat: Seat;
  readonly amount: number;
  readonly kind: 'number';
};

/** A player declared nil (non-blind). */
export type NilDeclaredEvent = {
  readonly type: 'NilDeclared';
  readonly seat: Seat;
  readonly blind: false;
};

/** A player declared blind nil. */
export type BlindNilDeclaredEvent = {
  readonly type: 'BlindNilDeclared';
  readonly seat: Seat;
  readonly blind: true;
};

/** Spades were broken — first trump played. */
export type BreakSpadesEvent = {
  readonly type: 'BreakSpades';
  readonly seat: Seat;
  readonly card: CardId;
};

/** A trick was won. */
export type TrickWonEvent = {
  readonly type: 'TrickWon';
  readonly trick: number;       // 1-indexed
  readonly winner: Seat;
  readonly wasBag: boolean;     // winner's team tricks just exceeded board
  readonly spiked: boolean;     // trick taken from own partner
};

/** A renege (follow-suit violation) was detected. */
export type RenegeDetectedEvent = {
  readonly type: 'RenegeDetected';
  readonly seat: Seat;
  readonly trick: number;
};

/** A partnership failed to meet its board (went set). */
export type SetEvent = { readonly type: 'Set'; readonly team: Team };

/** A player took all 13 tricks (Boston). */
export type BostonEvent = { readonly type: 'Boston'; readonly seat: Seat };

/** A nil bidder succeeded. */
export type NilMadeEvent = {
  readonly type: 'NilMade';
  readonly seat: Seat;
  readonly blind: boolean;
};

/** A nil bidder failed (caught). */
export type NilCaughtEvent = {
  readonly type: 'NilCaught';
  readonly seat: Seat;
  readonly blind: boolean;
};

/** A team hit the bag penalty threshold. */
export type BagThresholdHitEvent = { readonly type: 'BagThresholdHit'; readonly team: Team };

/** A team's score crossed zero. */
export type ScoreMilestoneEvent = {
  readonly type: 'ScoreMilestone';
  readonly team: Team;
  readonly milestone: 'inTheHole' | 'outTheHole';
};

/** The game is over. */
export type GameOverEvent = {
  readonly type: 'GameOver';
  readonly winningTeam: Team;
  readonly scores: [number, number];
};

/** All engine events. */
export type EngineEvent =
  | DealCompleteEvent
  | BidMadeEvent
  | NilDeclaredEvent
  | BlindNilDeclaredEvent
  | BreakSpadesEvent
  | TrickWonEvent
  | RenegeDetectedEvent
  | SetEvent
  | BostonEvent
  | NilMadeEvent
  | NilCaughtEvent
  | BagThresholdHitEvent
  | ScoreMilestoneEvent
  | GameOverEvent;
