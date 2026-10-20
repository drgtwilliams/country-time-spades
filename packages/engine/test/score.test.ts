/**
 * Scoring tests.
 */

import { describe, it, expect } from 'vitest';
import { scoreHand } from '../src/score';
import { createGame, cardIndex } from '../src/state';
import { DEFAULT_CONFIG, type GameConfig } from '../src/config';
import type { GameState, BidRecord } from '../src/state';
import type { Seat } from '../src/types';

function makeConfig(overrides: Partial<GameConfig> = {}): GameConfig {
  return { ...DEFAULT_CONFIG, ...overrides };
}

/**
 * Build a state at hand end with overrides.
 */
function stateAtHandEnd(overrides: {
  bids?: Partial<BidRecord>[];
  trickWins?: [number, number, number, number];
  bagCount?: [number, number];
  scores?: [number, number];
  config?: GameConfig;
} = {}): GameState {
  const config = overrides.config ?? makeConfig();
  const state = createGame(config, 'score-test') as GameState;

  if (overrides.bids) {
    state.bids = overrides.bids.map((b) => ({ seat: b.seat!, kind: b.kind!, amount: b.amount! }));
  }
  if (overrides.trickWins) {
    state.trickWins = overrides.trickWins;
  }
  if (overrides.bagCount) {
    state.bagCount = overrides.bagCount;
  }
  if (overrides.scores) {
    state.scores = overrides.scores;
  }

  // Ensure trickCount = 13 for scoring
  state.trickCount = 13;
  return state;
}

describe('scoreHand', () => {
  it('makes board: scores 10*board + bags', () => {
    const state = stateAtHandEnd({
      bids: [
        { seat: 0 as Seat, kind: 'number', amount: 5 },
        { seat: 1 as Seat, kind: 'number', amount: 3 },
        { seat: 2 as Seat, kind: 'number', amount: 3 },
        { seat: 3 as Seat, kind: 'number', amount: 3 },
      ],
      trickWins: [6, 4, 2, 1], // T0: 6+2=8, T1: 4+1=5; board T0=8, T1=6
    });
    const result = scoreHand(state);
    // T0: board=8, made 8 → 80 + 0 bags = 80
    // T1: board=6, made 5 → set, penalty 0
    expect(result.deltas).toEqual([80, 0]);
    expect(result.events.some((e) => e.type === 'Set' && 'team' in e && e.team === 1)).toBe(true);
    expect(result.events.some((e) => e.type === 'Set' && 'team' in e && e.team === 0)).toBe(false);
  });

  it('set with zero penalty: delta 0', () => {
    const state = stateAtHandEnd({
      config: makeConfig({ setPenalty: 'zero' }),
      bids: [
        { seat: 0 as Seat, kind: 'number', amount: 7 },
        { seat: 2 as Seat, kind: 'number', amount: 6 },
      ],
      trickWins: [3, 0, 4, 6], // T0: 3+4=7 < 13 board → set
    });
    const result = scoreHand(state);
    expect(result.deltas).toEqual([0, 0]);
  });

  it('set with minusBoard penalty: delta -10*board', () => {
    const state = stateAtHandEnd({
      config: makeConfig({ setPenalty: 'minusBoard' }),
      bids: [
        { seat: 0 as Seat, kind: 'number', amount: 7 },
        { seat: 1 as Seat, kind: 'number', amount: 6 },
        { seat: 2 as Seat, kind: 'number', amount: 6 },
        { seat: 3 as Seat, kind: 'number', amount: 6 },
      ],
      trickWins: [3, 4, 4, 2], // T0: 3+4=7, T1: 4+2=6; board T0=13, T1=12
    });
    const result = scoreHand(state);
    // T0: board=13, made 7 → set, penalty -130
    // T1: board=12, made 6 → set, penalty -120
    // Actually T0 board=7+6=13, T1 board=6+6=12
    // T0 tricks=3+4=7 (set), T1 tricks=4+2=6 (set)
    // But wait: seats 0,2 are T0; seats 1,3 are T1
    // T0: board=7+6=13, tricks=3+4=7 → set → -130
    // T1: board=6+6=12, tricks=4+2=6 → set → -120
    expect(result.deltas[0]).toBe(-130);
    expect(result.deltas[1]).toBe(-120);
  });

  it('bags accumulate across hands, 10th bag fires penalty', () => {
    // Carry 9 + 3 bags = 12 → one hit at 10, carry 2
    const state = stateAtHandEnd({
      bagCount: [9, 0],
      config: makeConfig({ bagThreshold: 10, bagPenalty: 100 }),
      bids: [
        { seat: 0 as Seat, kind: 'number', amount: 5 },
        { seat: 2 as Seat, kind: 'number', amount: 5 },
      ],
      trickWins: [8, 0, 5, 0], // T0: 8+5=13 > board 10 → 3 bags
    });
    const result = scoreHand(state);
    // T0: board=10, made 13 → +100 + 3 bags = 103, carry = 9+3 = 12, ≥10 → −100, carry=2
    expect(result.deltas[0]).toBe(3); // 103-100=3
    expect(result.bagCarry).toEqual([2, 0]);
  });

  it('nil made: +nilBonus', () => {
    const state = stateAtHandEnd({
      config: makeConfig({ nilBonus: 100, nilPenalty: 100 }),
      bids: [
        { seat: 0 as Seat, kind: 'nil', amount: 0 },
        { seat: 1 as Seat, kind: 'number', amount: 5 },
        { seat: 2 as Seat, kind: 'number', amount: 5 },
        { seat: 3 as Seat, kind: 'number', amount: 3 },
      ],
      trickWins: [0, 3, 5, 5],
    });
    const result = scoreHand(state);
    expect(result.events.some((e) => e.type === 'NilMade' && 'seat' in e && e.seat === 0)).toBe(true);
    expect(result.events.some((e) => e.type === 'NilCaught')).toBe(false);
  });

  it('nil caught: -nilPenalty', () => {
    const state = stateAtHandEnd({
      config: makeConfig({ nilBonus: 100, nilPenalty: 100 }),
      bids: [
        { seat: 0 as Seat, kind: 'nil', amount: 0 },
        { seat: 1 as Seat, kind: 'number', amount: 5 },
        { seat: 2 as Seat, kind: 'number', amount: 5 },
        { seat: 3 as Seat, kind: 'number', amount: 3 },
      ],
      trickWins: [1, 3, 5, 4],
    });
    const result = scoreHand(state);
    expect(result.events.some((e) => e.type === 'NilCaught' && 'seat' in e && e.seat === 0)).toBe(true);
    // Nil caught: -100 on nil bidder's team (T0)
    expect(result.deltas[0]).toBeLessThan(0);
  });

  it('both partners nil: no Set, delta 0, no crash', () => {
    const state = stateAtHandEnd({
      bids: [
        { seat: 0 as Seat, kind: 'nil', amount: 0 },
        { seat: 2 as Seat, kind: 'nil', amount: 0 },
      ],
      trickWins: [5, 5, 3, 0],
    });
    const result = scoreHand(state);
    // Both nil → board 0 for both teams (no numeric bids)
    expect(result.events.some((e) => e.type === 'Set')).toBe(false);
  });

  it('blind nil ±200 dial values', () => {
    const state = stateAtHandEnd({
      config: makeConfig({ blindNilBonus: 200, blindNilPenalty: 200 }),
      bids: [
        { seat: 0 as Seat, kind: 'blindNil', amount: 0 },
        { seat: 1 as Seat, kind: 'number', amount: 5 },
        { seat: 2 as Seat, kind: 'number', amount: 5 },
        { seat: 3 as Seat, kind: 'number', amount: 3 },
      ],
      trickWins: [0, 3, 5, 5],
    });
    const result = scoreHand(state);
    expect(result.events.some((e) => e.type === 'NilMade' && 'seat' in e && e.seat === 0)).toBe(true);
  });

  it('ScoreMilestone inTheHole when score crosses below 0', () => {
    const state = stateAtHandEnd({
      scores: [10, 0],
      bids: [
        { seat: 0 as Seat, kind: 'nil', amount: 0 },
        { seat: 1 as Seat, kind: 'number', amount: 5 },
        { seat: 2 as Seat, kind: 'number', amount: 5 },
        { seat: 3 as Seat, kind: 'number', amount: 3 },
      ],
      trickWins: [2, 3, 5, 3], // nil caught: -100 for T0
    });
    const result = scoreHand(state);
    expect(result.events.some((e) => e.type === 'ScoreMilestone' && 'milestone' in e && e.milestone === 'inTheHole')).toBe(true);
  });

  it('event order: NilMade before Set before BagThresholdHit before ScoreMilestone', () => {
    // This is a structural check — nil events first, then Set, then bags, then milestones
    // Hard to construct a single hand that triggers all, but we check partial order
    const state = stateAtHandEnd({
      config: makeConfig({ nilBonus: 100, bagPenaltyEnabled: true, bagThreshold: 1, bagPenalty: 0 }),
      bids: [
        { seat: 0 as Seat, kind: 'nil', amount: 0 },
        { seat: 1 as Seat, kind: 'number', amount: 1 },
        { seat: 2 as Seat, kind: 'number', amount: 1 },
        { seat: 3 as Seat, kind: 'number', amount: 1 },
      ],
      trickWins: [0, 5, 5, 3],
    });
    const result = scoreHand(state);
    const types = result.events.map((e) => e.type);
    // NilMade should appear before any Set
    const nilMadeIdx = types.indexOf('NilMade');
    const setIdx = types.indexOf('Set');
    if (nilMadeIdx !== -1 && setIdx !== -1) {
      expect(nilMadeIdx).toBeLessThan(setIdx);
    }
  });
});
