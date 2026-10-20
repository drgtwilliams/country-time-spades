/**
 * Game configuration: all house-rule dials.
 *
 * No user-facing strings — copy lives in `packages/content`.
 */

import type { Suit } from './types';

export type DeckMode = 'plain' | 'jokers' | 'jjdd';

export interface GameConfig {
  /** Deck mode: plain (52), jokers (54), or JJDD (54 with promoted deuces). */
  deckMode: DeckMode;

  /** Which non-spade suits' deuces become trump in JJDD. */
  promotedDeuces: Suit[];

  /** Whether nil bids are allowed. */
  allowNil: boolean;

  /** Whether blind nil bids are allowed (requires allowNil). */
  allowBlindNil: boolean;

  /** Points awarded for making a nil bid. */
  nilBonus: number;

  /** Points deducted for failing a nil bid. */
  nilPenalty: number;

  /** Points awarded for making a blind nil bid. */
  blindNilBonus: number;

  /** Points deducted for failing a blind nil bid. */
  blindNilPenalty: number;

  /** Whether the bag penalty system is active. */
  bagPenaltyEnabled: boolean;

  /** Number of bags to trigger a penalty. */
  bagThreshold: number;

  /** Points deducted when bag threshold is hit. */
  bagPenalty: number;

  /** Set (under) penalty mode. */
  setPenalty: 'zero' | 'minusBoard';

  /** How renege (follow-suit violation) is handled. */
  rene: 'prevent' | 'penalty';

  /** Penalty applied when renege is detected. */
  renePenalty: 'loseHand' | 'threeTricks';

  /** Score target to win the game. */
  targetScore: number;
}

/** Default configuration: jokers game, nil on, 10-bag penalty, target 500. */
export const DEFAULT_CONFIG: GameConfig = {
  deckMode: 'jokers',
  promotedDeuces: [],
  allowNil: true,
  allowBlindNil: true,
  nilBonus: 100,
  nilPenalty: 100,
  blindNilBonus: 200,
  blindNilPenalty: 200,
  bagPenaltyEnabled: true,
  bagThreshold: 10,
  bagPenalty: 100,
  setPenalty: 'zero',
  rene: 'prevent',
  renePenalty: 'loseHand',
  targetScore: 500,
};

/** Error codes for engine operations. */
export type EngineErrorCode = 'INVALID_CONFIG' | 'ILLEGAL_ACTION' | 'WRONG_ACTOR' | 'WRONG_PHASE';

/** Engine error with a discriminated code. */
export class EngineError extends Error {
  readonly code: EngineErrorCode;

  constructor(code: EngineErrorCode, detail?: string) {
    super(detail ? `${code}: ${detail}` : code);
    this.name = 'EngineError';
    this.code = code;
  }
}

/**
 * Validate a `GameConfig`. Throws `EngineError` on failure.
 */
export function validateConfig(config: GameConfig): void {
  const { deckMode, promotedDeuces, allowNil, allowBlindNil, bagPenaltyEnabled, bagThreshold } = config;

  if (deckMode === 'jjdd') {
    if (!promotedDeuces || promotedDeuces.length === 0) {
      throw new EngineError('INVALID_CONFIG', 'JJDD mode requires at least one promoted deuce');
    }
    if (promotedDeuces.includes('S')) {
      throw new EngineError('INVALID_CONFIG', 'Spades cannot be in promotedDeuces');
    }
  }

  if (deckMode !== 'jjdd' && promotedDeuces && promotedDeuces.length > 0) {
    throw new EngineError('INVALID_CONFIG', `Non-JJDD mode (${deckMode}) must have empty promotedDeuces`);
  }

  if (allowBlindNil && !allowNil) {
    throw new EngineError('INVALID_CONFIG', 'allowBlindNil requires allowNil');
  }

  if (bagPenaltyEnabled && bagThreshold < 1) {
    throw new EngineError('INVALID_CONFIG', 'bagThreshold must be >= 1 when bagPenaltyEnabled');
  }

  if (config.nilBonus < 0) throw new EngineError('INVALID_CONFIG', 'nilBonus must be >= 0');
  if (config.nilPenalty < 0) throw new EngineError('INVALID_CONFIG', 'nilPenalty must be >= 0');
  if (config.blindNilBonus < 0) throw new EngineError('INVALID_CONFIG', 'blindNilBonus must be >= 0');
  if (config.blindNilPenalty < 0) throw new EngineError('INVALID_CONFIG', 'blindNilPenalty must be >= 0');
  if (config.bagPenalty < 0) throw new EngineError('INVALID_CONFIG', 'bagPenalty must be >= 0');
  if (config.targetScore < 1) throw new EngineError('INVALID_CONFIG', 'targetScore must be >= 1');

  if (!Number.isInteger(config.nilBonus) || !Number.isInteger(config.nilPenalty)) {
    throw new EngineError('INVALID_CONFIG', 'nil values must be integers');
  }
  if (!Number.isInteger(config.blindNilBonus) || !Number.isInteger(config.blindNilPenalty)) {
    throw new EngineError('INVALID_CONFIG', 'blind nil values must be integers');
  }
}
