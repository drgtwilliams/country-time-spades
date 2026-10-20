/**
 * Game state tests.
 */

import { describe, it, expect } from 'vitest';
import { createGame, cardIndex, cloneState } from '../src/state';
import { DEFAULT_CONFIG, validateConfig, EngineError, type GameConfig } from '../src/config';

function makeConfig(overrides: Partial<GameConfig> = {}): GameConfig {
  return { ...DEFAULT_CONFIG, ...overrides };
}

describe('createGame', () => {
  it('plain: phase bidding, 52 dealt, no kitty, empty bids, scores [0,0]', () => {
    const state = createGame(makeConfig({ deckMode: 'plain' }), 'state-test');
    expect(state.phase).toBe('bidding');
    expect(state.kitty).toHaveLength(0);
    expect(state.bids).toHaveLength(0);
    expect(state.scores).toEqual([0, 0]);
    expect(state.bagCount).toEqual([0, 0]);
    expect(state.gameOver).toBeNull();
    for (let i = 0; i < 4; i++) expect(state.hands[i]!.length).toBe(13);
  });

  it('jjdd: kitty length 2', () => {
    const state = createGame(makeConfig({ deckMode: 'jjdd', promotedDeuces: ['C', 'D'] }), 'jjdd-state');
    expect(state.kitty).toHaveLength(2);
    expect(state.phase).toBe('bidding');
  });

  it('rejects invalid config', () => {
    expect(() => createGame(makeConfig({ deckMode: 'jjdd' }), 'bad')).toThrow(EngineError);
  });

  it('dealer is deterministic', () => {
    const s1 = createGame(makeConfig({ deckMode: 'plain' }), 'dealer-det');
    const s2 = createGame(makeConfig({ deckMode: 'plain' }), 'dealer-det');
    expect(s1.dealer).toBe(s2.dealer);
  });

  it('cards map covers all deck cards', () => {
    const config = makeConfig({ deckMode: 'jokers' });
    const state = createGame(config, 'cards-map');
    const deckCards = new Set(state.cards.keys());
    expect(deckCards.size).toBe(54);
  });
});

describe('cardIndex', () => {
  it('maps every deck id back to its Card', () => {
    const config = makeConfig({ deckMode: 'jokers' });
    const map = cardIndex(config);
    expect(map.size).toBe(54);
    // Check a few known cards
    const as = map.get('S14');
    expect(as?.suit).toBe('S');
    expect(as?.rank).toBe(14);
    const jb = map.get('JB');
    expect(jb?.kind).toBe('big');
  });

  it('plain has 52 cards', () => {
    const map = cardIndex(makeConfig({ deckMode: 'plain' }));
    expect(map.size).toBe(52);
  });
});

describe('cloneState', () => {
  it('creates an independent deep copy', () => {
    const state = createGame(makeConfig({ deckMode: 'plain' }), 'clone-test');
    const clone = cloneState(state);

    // Mutate clone
    clone.hands[0] = ['S14'] as any;
    clone.scores = [100, 0] as [number, number];

    // Original unchanged
    expect(state.hands[0]!.length).toBe(13);
    expect(state.scores).toEqual([0, 0]);
  });
});
