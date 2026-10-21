/**
 * House-rule presets — plain-language table settings.
 *
 * Each preset maps to a `GameConfig` that the engine validates.
 * These are data, not logic: reviewable, extendable, ready for future voice binding.
 */

import type { GameConfig } from 'engine';
import type { Suit } from 'engine';

/** A named house-rule preset the user selects on the setup screen. */
export interface HouseRulePreset {
  /** Human-readable label shown on the setup screen. */
  name: string;

  /** Engine config derived from this preset. */
  config: GameConfig;
}

/** Standard family cookout: plain 52-card deck, nil on, no blind nil, 100-point set. */
export const COOKOUT_PRESET: HouseRulePreset = {
  name: 'The Cookout',
  config: {
    deckMode: 'plain',
    promotedDeuces: [],
    allowNil: true,
    allowBlindNil: false,
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
  },
};

/** Jokers in the deck, blind nil allowed, standard penalties. */
export const JOKERS_WILD_PRESET: HouseRulePreset = {
  name: 'Jokers Wild',
  config: {
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
  },
};

/** John's Family — JJDD, renege allowed, higher stakes. */
export const JOHNS_FAMILY_PRESET: HouseRulePreset = {
  name: "John's Family",
  config: {
    deckMode: 'jjdd',
    promotedDeuces: ['C' as Suit, 'D' as Suit],
    allowNil: true,
    allowBlindNil: true,
    nilBonus: 150,
    nilPenalty: 150,
    blindNilBonus: 300,
    blindNilPenalty: 300,
    bagPenaltyEnabled: true,
    bagThreshold: 10,
    bagPenalty: 150,
    setPenalty: 'minusBoard',
    rene: 'penalty',
    renePenalty: 'loseHand',
    targetScore: 500,
  },
};

/** All presets indexed by a machine-friendly key. */
export const HOUSE_RULE_PRESETS: Record<string, HouseRulePreset> = {
  cookout: COOKOUT_PRESET,
  jokersWild: JOKERS_WILD_PRESET,
  johnsFamily: JOHNS_FAMILY_PRESET,
};
