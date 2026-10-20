import { describe, it, expect } from 'vitest';
import {
  DEFAULT_CONFIG,
  validateConfig,
  type GameConfig,
  type DeckMode,
} from '../src/config';
import { EngineError } from '../src/config';

function makeConfig(overrides: Partial<GameConfig> = {}): GameConfig {
  return { ...DEFAULT_CONFIG, ...overrides };
}

describe('DEFAULT_CONFIG', () => {
  it('validates without error', () => {
    expect(() => validateConfig(DEFAULT_CONFIG)).not.toThrow();
  });

  it('has expected defaults', () => {
    expect(DEFAULT_CONFIG.deckMode).toBe('jokers');
    expect(DEFAULT_CONFIG.promotedDeuces).toEqual([]);
    expect(DEFAULT_CONFIG.allowNil).toBe(true);
    expect(DEFAULT_CONFIG.allowBlindNil).toBe(true);
    expect(DEFAULT_CONFIG.nilBonus).toBe(100);
    expect(DEFAULT_CONFIG.nilPenalty).toBe(100);
    expect(DEFAULT_CONFIG.blindNilBonus).toBe(200);
    expect(DEFAULT_CONFIG.blindNilPenalty).toBe(200);
    expect(DEFAULT_CONFIG.bagPenaltyEnabled).toBe(true);
    expect(DEFAULT_CONFIG.bagThreshold).toBe(10);
    expect(DEFAULT_CONFIG.bagPenalty).toBe(100);
    expect(DEFAULT_CONFIG.setPenalty).toBe('zero');
    expect(DEFAULT_CONFIG.rene).toBe('prevent');
    expect(DEFAULT_CONFIG.renePenalty).toBe('loseHand');
    expect(DEFAULT_CONFIG.targetScore).toBe(500);
  });
});

describe('validateConfig', () => {
  it.each([
    ['jjdd without promotedDeuces', { deckMode: 'jjdd' as DeckMode }],
    ['jjdd with Spades in promotedDeuces', makeConfig({ deckMode: 'jjdd' as DeckMode, promotedDeuces: ['S'] as GameConfig['promotedDeuces'] })],
    ['plain with non-empty promotedDeuces', makeConfig({ deckMode: 'plain' as DeckMode, promotedDeuces: ['C'] as GameConfig['promotedDeuces'] })],
    ['jokers with non-empty promotedDeuces', makeConfig({ deckMode: 'jokers' as DeckMode, promotedDeuces: ['D'] as GameConfig['promotedDeuces'] })],
    ['blindNil without nil', makeConfig({ allowNil: false, allowBlindNil: true })],
    ['bagThreshold < 1 with bagPenaltyEnabled', makeConfig({ bagPenaltyEnabled: true, bagThreshold: 0 })],
    ['nilBonus < 0', makeConfig({ nilBonus: -1 })],
    ['nilPenalty < 0', makeConfig({ nilPenalty: -1 })],
    ['blindNilBonus < 0', makeConfig({ blindNilBonus: -1 })],
    ['blindNilPenalty < 0', makeConfig({ blindNilPenalty: -1 })],
    ['bagPenalty < 0', makeConfig({ bagPenalty: -1 })],
    ['targetScore < 1', makeConfig({ targetScore: 0 })],
  ])('throws for invalid config: %s', (_name, config) => {
    expect(() => validateConfig(config)).toThrow(EngineError);
  });

  it('accepts jjdd with valid promotedDeuces', () => {
    const config = makeConfig({ deckMode: 'jjdd', promotedDeuces: ['C', 'D'] });
    expect(() => validateConfig(config)).not.toThrow();
  });
});
