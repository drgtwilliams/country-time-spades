/**
 * End-to-end hand play — exercises trick resolution, scoring, and game flow.
 */

import { describe, it, expect } from 'vitest';
import { createGame, cardIndex } from '../src/state';
import { applyAction } from '../src/apply';
import { legalActions } from '../src/actions';
import { DEFAULT_CONFIG, type GameConfig } from '../src/config';
import type { BidAction, PlayAction } from '../src/actions';
import type { EngineEvent } from '../src/events';

function makeConfig(overrides: Partial<GameConfig> = {}): GameConfig {
  return { ...DEFAULT_CONFIG, ...overrides };
}

/**
 * Deterministic trick driver: at each trick, the card at index `winner`
 * in the leader's legal plays always wins. This is achieved by ensuring
 * the winning card is the highest trump or highest of led suit.
 *
 * Simpler approach: just play cards in order until trick is complete.
 * Each seat plays the first legal card available.
 */
function playHand(state: ReturnType<typeof createGame>): { state: typeof state; events: EngineEvent[] } {
  let s = state;
  const allEvents: EngineEvent[] = [];

  // Bid all 4
  for (let i = 0; i < 4; i++) {
    const legal = legalActions(s);
    const bids = legal.filter((a) => a.type === 'Bid' && a.kind === 'number');
    if (bids.length === 0) break;
    s = applyAction(s, bids[0] as BidAction).state;
    allEvents.push(...s.events.filter((e) => !state.events.map((se) => JSON.stringify(se)).includes(JSON.stringify(e))));
  }

  if (s.phase !== 'playing') return { state: s, events: allEvents };

  let trickCount = 0;
  const maxTricks = 13;

  while (trickCount < maxTricks && s.phase === 'playing') {
    const legal = legalActions(s);
    const plays = legal.filter((a) => a.type === 'Play') as PlayAction[];
    if (plays.length === 0) break;

    const result = applyAction(s, plays[0]);
    s = result.state;
    allEvents.push(...result.events);
    trickCount = s.trickCount;
  }

  return { state: s, events: allEvents };
}

describe('full hand end-to-end', () => {
  it('plain mode: deal → bid → 13 tricks → handOver', () => {
    const config = makeConfig({ deckMode: 'plain' });
    const state = createGame(config, 'e2e-full-plain');
    const result = playHand(state);

    // After playing, should be at handOver (13 tricks complete)
    expect(result.state.phase).toBe('handOver');
    expect(result.state.trickCount).toBe(13);

    // Count trick events
    const trickEvents = result.events.filter((e) => e.type === 'TrickWon');
    expect(trickEvents.length).toBe(13);

    // Scores should be finite
    expect(Number.isFinite(result.state.scores[0])).toBe(true);
    expect(Number.isFinite(result.state.scores[1])).toBe(true);
  });

  it('jokers mode: deal → bid → 13 tricks → handOver', () => {
    const config = makeConfig({ deckMode: 'jokers' });
    const state = createGame(config, 'e2e-full-jokers');
    const result = playHand(state);

    expect(result.state.phase).toBe('handOver');
    expect(result.state.trickCount).toBe(13);
  });

  it('JJDD mode: deal → bid → 13 tricks → handOver', () => {
    const config = makeConfig({ deckMode: 'jjdd', promotedDeuces: ['C', 'D'] });
    const state = createGame(config, 'e2e-full-jjdd');
    const result = playHand(state);

    expect(result.state.phase).toBe('handOver');
    expect(result.state.trickCount).toBe(13);
  });

  it('BreakSpades fires exactly once per hand', () => {
    const config = makeConfig({ deckMode: 'plain' });
    const state = createGame(config, 'break-once');
    const result = playHand(state);

    const breakEvents = result.events.filter((e) => e.type === 'BreakSpades');
    expect(breakEvents.length).toBe(1);
  });

  it('NextHand → new deal', () => {
    const config = makeConfig({ deckMode: 'plain' });
    const state = createGame(config, 'next-hand');
    const result = playHand(state);

    // Play NextHand
    result.state.phase = 'handOver';
    const nhResult = applyAction(result.state, { type: 'NextHand' });

    expect(nhResult.state.handNumber).toBe(1);
    expect(nhResult.state.phase).toBe('bidding');
    expect(nhResult.state.dealer).toBe(((result.state.dealer + 1) % 4) as 0 | 1 | 2 | 3);

    const dealEvents = nhResult.events.filter((e) => e.type === 'DealComplete');
    expect(dealEvents.length).toBe(1);
  });
});
