/**
 * Fuzz tests: random legal-choice drivers, determinism verification.
 */

import { describe, it, expect } from 'vitest';
import { createGame } from '../src/state';
import { applyAction } from '../src/apply';
import { legalActions } from '../src/actions';
import { DEFAULT_CONFIG, type GameConfig } from '../src/config';
import type { BidAction, PlayAction } from '../src/actions';

function makeConfig(overrides: Partial<GameConfig> = {}): GameConfig {
  return { ...DEFAULT_CONFIG, ...overrides };
}

describe('fuzz tests', () => {
  it('20 random seeded games: no throws, bids reach playing phase', () => {
    for (let i = 0; i < 20; i++) {
      const config = makeConfig({ deckMode: 'plain' as const, targetScore: 200 });
      const state = createGame(config, `fuzz-${i}`);
      let s = state;

      // Bid all 4
      for (let j = 0; j < 4; j++) {
        const legal = legalActions(s);
        const bidActions = legal.filter((a) => a.type === 'Bid' && a.kind === 'number');
        if (bidActions.length === 0) {
          throw new Error(`No bid actions available at step ${j}`);
        }
        s = applyAction(s, bidActions[0] as BidAction).state;
      }

      // Should be in playing phase
      expect(s.phase).toBe('playing');
    }
  });

  it('replay determinism: two runs same seed = same events', () => {
    const config = makeConfig({ deckMode: 'jokers' });
    const seed = 'fuzz-determ';

    const events1: string[] = [];
    const events2: string[] = [];

    for (let run = 0; run < 2; run++) {
      const state = createGame(config, seed);
      let s = state;
      const runEvents: string[] = [];

      // Bid
      for (let i = 0; i < 4; i++) {
        s = applyAction(s, { type: 'Bid', kind: 'number', amount: 3 }).state;
      }

      // Collect events
      runEvents.push(...s.events.map((e) => JSON.stringify(e)));

      if (run === 0) events1.push(...runEvents);
      else events2.push(...runEvents);
    }

    expect(events1).toEqual(events2);
  });

  it('no illegal moves accepted in 50 fuzz runs', () => {
    for (let i = 0; i < 50; i++) {
      const configs: GameConfig[] = [
        makeConfig({ deckMode: 'plain', targetScore: 200 }),
        makeConfig({ deckMode: 'jokers', targetScore: 300 }),
        makeConfig({ deckMode: 'jjdd', promotedDeuces: ['C', 'D'], targetScore: 250 }),
      ];
      const config = configs[i % configs.length];
      const state = createGame(config, `no-illegal-${i}`);
      let s = state;

      // Bid all 4
      for (let j = 0; j < 4; j++) {
        const legal = legalActions(s);
        const bidActions = legal.filter((a) => a.type === 'Bid' && a.kind === 'number');
        s = applyAction(s, bidActions[0] as BidAction).state;
      }

      // Try some illegal actions — should throw
      // Bid from gameOver phase
      s.phase = 'gameOver';
      const bid: BidAction = { type: 'Bid', kind: 'number', amount: 5 };
      expect(() => applyAction(s, bid)).toThrow();
    }
  });
});
