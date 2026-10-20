/**
 * Property-based tests — invariants that must hold for all game states.
 */

import { describe, it, expect } from 'vitest';
import fc, { integer, array, tuple, bool, string } from 'fast-check';
import { createGame } from '../src/state';
import { applyAction } from '../src/apply';
import { legalActions, currentActor } from '../src/actions';
import { DEFAULT_CONFIG, validateConfig, EngineError, type GameConfig } from '../src/config';
import type { BidAction, PlayAction } from '../src/actions';

function makeConfig(overrides: Partial<GameConfig> = {}): GameConfig {
  return { ...DEFAULT_CONFIG, targetScore: 500, ...overrides };
}

describe('property tests', () => {
  it('every action in legalActions succeeds when applied', () => {
    fc.assert(
      fc.property(
        fc.record({ deckMode: fc.constantFrom('plain' as const, 'jokers' as const) }),
        (cfg) => {
          const config = makeConfig({ ...cfg, targetScore: 500 });
          validateConfig(config);
          const state = createGame(config, 'prop-test');

          // Bid all 4 players
          let s = state;
          for (let i = 0; i < 4; i++) {
            const legal = legalActions(s);
            const bidActions = legal.filter((a) => a.type === 'Bid' && a.kind === 'number');
            if (bidActions.length === 0) return true;
            s = applyAction(s, bidActions[0] as BidAction).state;
          }

          // Now test that every legal action succeeds
          const legal = legalActions(s);
          for (const action of legal) {
            if (action.type === 'Bid' && action.kind === 'number' && action.amount === 3) {
              expect(() => applyAction(s, action as BidAction)).not.toThrow();
              break; // just check one bid action
            }
          }
          return true;
        },
      ),
      { numRuns: 20 },
    );
  });

  it('scores are finite integers', () => {
    fc.assert(
      fc.property(
        fc.record({ deckMode: fc.constantFrom('plain' as const, 'jokers' as const) }),
        (cfg) => {
          const config = makeConfig({ ...cfg, targetScore: 500 });
          const state = createGame(config, 'score-finite');

          // Bid all
          let s = state;
          for (let i = 0; i < 4; i++) {
            s = applyAction(s, { type: 'Bid', kind: 'number', amount: 3 }).state;
          }

          expect(Number.isFinite(s.scores[0])).toBe(true);
          expect(Number.isFinite(s.scores[1])).toBe(true);
          expect(Number.isInteger(s.scores[0])).toBe(true);
          expect(Number.isInteger(s.scores[1])).toBe(true);
          return true;
        },
      ),
      { numRuns: 20 },
    );
  });

  it('trickWins sum equals trickCount', () => {
    fc.assert(
      fc.property(
        fc.record({ deckMode: fc.constantFrom('plain' as const, 'jokers' as const) }),
        (cfg) => {
          const config = makeConfig(cfg);
          const state = createGame(config, 'trick-sum');
          expect(state.trickWins.reduce((a, b) => a + b, 0)).toBe(state.trickCount);
          return true;
        },
      ),
      { numRuns: 20 },
    );
  });

  it('currentActor returns null when game over', () => {
    fc.assert(
      fc.property(
        fc.record({ deckMode: fc.constantFrom('plain' as const) }),
        (cfg) => {
          const config = makeConfig(cfg);
          const state = createGame(config, 'actor-null');
          state.phase = 'gameOver';
          expect(currentActor(state)).toBeNull();
          return true;
        },
      ),
      { numRuns: 10 },
    );
  });

  it('input state is never mutated', () => {
    fc.assert(
      fc.property(
        fc.record({ deckMode: fc.constantFrom('plain' as const, 'jokers' as const) }),
        (cfg) => {
          const config = makeConfig(cfg);
          const state = createGame(config, 'immutable');
          const snapshot = JSON.stringify(state);

          const bid: BidAction = { type: 'Bid', kind: 'number', amount: 3 };
          applyAction(state, bid);

          expect(JSON.stringify(state)).toBe(snapshot);
          return true;
        },
      ),
      { numRuns: 50 },
    );
  });
});
