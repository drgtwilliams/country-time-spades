/**
 * Country Time Spades — Rules Engine
 *
 * Public API surface. All types, functions, and constants are documented
 * in their source modules.
 */

// Core types
export type { Suit, Rank, CardId, PlayingCard, Joker, Card, Seat, Team } from './types';
export { SEATS, teamOf, nextSeat } from './types';

// Configuration
export type { GameConfig, DeckMode } from './config';
export { DEFAULT_CONFIG, validateConfig, EngineError } from './config';

// Events
export type { EngineEvent } from './events';
export type {
  DealCompleteEvent,
  BidMadeEvent,
  NilDeclaredEvent,
  BlindNilDeclaredEvent,
  BreakSpadesEvent,
  TrickWonEvent,
  RenegeDetectedEvent,
  SetEvent,
  BostonEvent,
  NilMadeEvent,
  NilCaughtEvent,
  BagThresholdHitEvent,
  ScoreMilestoneEvent,
  GameOverEvent,
} from './events';

// Game state
export type { GameState, Phase, BidRecord, PlayRecord } from './state';
export { createGame, cardIndex, cloneState } from './state';

// Actions
export type { Action, BidAction, ExchangeAction, PlayAction, NextHandAction } from './actions';
export { legalActions, currentActor, isLegalAction } from './actions';

// Core engine
export { applyAction } from './apply';

// Scoring
export { scoreHand } from './score';
export type { HandScore } from './score';

// Deck / trump
export { buildDeck, isTrump, trumpRank, trickWinnerResolved } from './deck';

// Dealing
export { firstDealerOf, dealerForHand, deal } from './deal';

// RNG helpers
export { mulberry32, hashString, rngForHand, shuffle, drawInt } from './rng';

// Game-over flow
export { checkGameOver } from './flow';

// Replay
export { replay } from './replay';
