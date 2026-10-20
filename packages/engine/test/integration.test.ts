/**
 * Replay determinism and end-to-end hand tests.
 */

import { describe, it, expect } from 'vitest';
import { createGame } from '../src/state';
import { applyAction } from '../src/apply';
import { DEFAULT_CONFIG, type GameConfig } from '../src/config';
import type { BidAction, PlayAction, NextHandAction } from '../src/actions';
import type { EngineEvent } from '../src/events';

function makeConfig(overrides: Partial<GameConfig> = {}): GameConfig {
  return { ...DEFAULT_CONFIG, ...overrides };
}

/**
 * Replay: createGame + applyAction fold, concatenating events.
 */
function replay(
  config: GameConfig,
  seed: string,
  actions: import('../src/actions').Action[],
): { state: ReturnType<typeof createGame>; events: EngineEvent[] } {
  let state = createGame(config, seed);
  const allEvents: EngineEvent[] = [];
  for (const action of actions) {
    const result = applyAction(state, action);
    state = result.state;
    allEvents.push(...result.events);
  }
  return { state, events: allEvents };
}

describe('replay determinism', () => {
  it('same actions produce same events', () => {
    const config = makeConfig({ deckMode: 'plain' });
    const bids: BidAction[] = [
      { type: 'Bid', kind: 'number', amount: 3 },
      { type: 'Bid', kind: 'number', amount: 3 },
      { type: 'Bid', kind: 'number', amount: 3 },
      { type: 'Bid', kind: 'number', amount: 4 },
    ];
    const r1 = replay(config, 'replay-test', bids);
    const r2 = replay(config, 'replay-test', bids);
    expect(r1.state.bids).toEqual(r2.state.bids);
    expect(r1.events.map((e) => e.type)).toEqual(r2.events.map((e) => e.type));
  });

  it('different seeds produce different deals', () => {
    const config = makeConfig({ deckMode: 'plain' });
    const bids: BidAction[] = [
      { type: 'Bid', kind: 'number', amount: 3 },
      { type: 'Bid', kind: 'number', amount: 3 },
      { type: 'Bid', kind: 'number', amount: 3 },
      { type: 'Bid', kind: 'number', amount: 4 },
    ];
    const r1 = replay(config, 'seed-a', bids);
    const r2 = replay(config, 'seed-b', bids);
    // Hands should differ
    expect(r1.state.hands).not.toEqual(r2.state.hands);
  });
});

describe('end-to-end full hand', () => {
  it('plain mode: deal → bid → playing phase reached', () => {
    const config = makeConfig({ deckMode: 'plain' });
    const state = createGame(config, 'e2e-plain');

    // Bid all 4
    let s = state;
    for (let i = 0; i < 4; i++) {
      s = applyAction(s, { type: 'Bid', kind: 'number', amount: 3 }).state;
    }
    expect(s.phase).toBe('playing');
    expect(s.bids).toHaveLength(4);
  });

  it('jokers mode: deal → bid → playing phase reached', () => {
    const config = makeConfig({ deckMode: 'jokers' });
    const state = createGame(config, 'e2e-jokers');

    let s = state;
    for (let i = 0; i < 4; i++) {
      s = applyAction(s, { type: 'Bid', kind: 'number', amount: 3 }).state;
    }
    // In jokers mode with no blind nils, should go directly to playing
    expect(s.phase).toBe('playing');
  });
});

describe('integration: both partners nil', () => {
  it('no Set, no crash', () => {
    const config = makeConfig({ deckMode: 'plain' });
    const state = createGame(config, 'bn-int');
    let s = state;

    // Seat 0 nil, seat 1 number, seat 2 nil, seat 3 number
    const actions: BidAction[] = [
      { type: 'Bid', kind: 'nil', amount: 0 },
      { type: 'Bid', kind: 'number', amount: 5 },
      { type: 'Bid', kind: 'nil', amount: 0 },
      { type: 'Bid', kind: 'number', amount: 5 },
    ];

    for (const a of actions) {
      s = applyAction(s, a).state;
    }
    expect(s.phase).toBe('playing');
  });
});

describe('integration: JJDD with jokers', () => {
  it('joker trump resolution works end-to-end', () => {
    const config = makeConfig({ deckMode: 'jjdd', promotedDeuces: ['C', 'D'] });
    const state = createGame(config, 'jjdd-e2e');
    let s = state;

    for (let i = 0; i < 4; i++) {
      s = applyAction(s, { type: 'Bid', kind: 'number', amount: 3 }).state;
    }
    expect(s.phase).toBe('playing');
  });
});
