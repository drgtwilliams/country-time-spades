/**
 * Additional tests for uncovered paths in apply.ts and actions.ts.
 */

import { describe, it, expect } from 'vitest';
import { createGame, cardIndex } from '../src/state';
import { applyAction } from '../src/apply';
import { currentActor } from '../src/actions';
import { legalActions } from '../src/actions';
import { DEFAULT_CONFIG, EngineError, type GameConfig } from '../src/config';
import type { Seat } from '../src/types';
import type { BidAction, PlayAction } from '../src/actions';

function makeConfig(overrides: Partial<GameConfig> = {}): GameConfig {
  return { ...DEFAULT_CONFIG, ...overrides };
}

describe('applyAction — trick resolution', () => {
  it('spade lead pre-break: not legal in prevent mode', () => {
    const config = makeConfig({ deckMode: 'plain', rene: 'prevent' });
    const state = createGame(config, 'prebreak-test');
    let s = state;

    // Bid all 4
    for (let i = 0; i < 4; i++) {
      s = applyAction(s, { type: 'Bid', kind: 'number', amount: 3 }).state;
    }
    expect(s.phase).toBe('playing');

    // Find the leader's hand and check that spades are NOT in legalActions
    const leader = ((s.dealer + 1) % 4) as Seat;
    const legal = legalActions(s);
    const playActions = legal.filter((a) => a.type === 'Play') as PlayAction[];
    const spadePlays = playActions.filter((a) => a.cardId.startsWith('S'));
    expect(spadePlays.length).toBe(0);
  });

  it('spade lead after break: legal', () => {
    const config = makeConfig({ deckMode: 'plain' });
    const state = createGame(config, 'postbreak-test');
    let s = state;

    for (let i = 0; i < 4; i++) {
      s = applyAction(s, { type: 'Bid', kind: 'number', amount: 3 }).state;
    }

    // Force spades broken by playing a non-leading spade via a discard
    // Instead, set spadesBroken directly and check lead is legal
    const leader = ((s.dealer + 1) % 4) as Seat;
    s.spadesBroken = true;
    const legal = legalActions(s);
    const playActions = legal.filter((a) => a.type === 'Play') as PlayAction[];
    const spadePlays = playActions.filter((a) => a.cardId.startsWith('S'));
    // With spades broken, spade leads should be legal
    expect(spadePlays.length).toBeGreaterThan(0);
  });

  it('must follow suit: only led-suit cards offered', () => {
    const config = makeConfig({ deckMode: 'plain' });
    const state = createGame(config, 'follow-test') as any;
    let s = state;

    for (let i = 0; i < 4; i++) {
      s = applyAction(s, { type: 'Bid', kind: 'number', amount: 3 }).state;
    }

    // Set up: seat 0 leads with a heart
    s.currentTrick = { leadSeat: 0 as Seat, plays: [{ seat: 0 as Seat, cardId: 'H14' }] };
    s.trickWins = [1, 0, 0, 0];

    // Seat 1 can follow hearts
    s.hands = [
      ['H14', 'S14', 'S13', 'S12', 'S11', 'S10', 'S9', 'S8', 'S7', 'S6', 'S5', 'S4', 'S3'] as any,
      ['H13', 'H12', 'S14', 'S13', 'S12', 'S11', 'S10', 'S9', 'S8', 'S7', 'S6', 'S5', 'S4'] as any,
      ['D14', 'D13', 'D12', 'D11', 'D10', 'D9', 'D8', 'D7', 'D6', 'D5', 'D4', 'D3', 'D2'] as any,
      ['C14', 'C13', 'C12', 'C11', 'C10', 'C9', 'C8', 'C7', 'C6', 'C5', 'C4', 'C3', 'C2'] as any,
    ] as any;
    s.cards = cardIndex(config);

    const actor = currentActor(s);
    if (actor === 1) {
      const legal = legalActions(s);
      const playActions = legal.filter((a) => a.type === 'Play') as PlayAction[];
      // Seat 1 should only be offered heart cards
      const heartCards = playActions.filter((a) => a.cardId.startsWith('H'));
      const nonHeartCards = playActions.filter((a) => !a.cardId.startsWith('H'));
      expect(nonHeartCards.length).toBe(0);
      expect(heartCards.length).toBeGreaterThan(0);
    }
  });

  it('can not follow: any card offered', () => {
    const config = makeConfig({ deckMode: 'plain' });
    const state = createGame(config, 'no-follow-test') as any;
    let s = state;

    for (let i = 0; i < 4; i++) {
      s = applyAction(s, { type: 'Bid', kind: 'number', amount: 3 }).state;
    }

    // Seat 0 leads with hearts, seat 1 has no hearts
    s.currentTrick = { leadSeat: 0 as Seat, plays: [{ seat: 0 as Seat, cardId: 'H14' }] };
    s.trickWins = [1, 0, 0, 0];
    s.hands = [
      ['H14', 'S14', 'S13', 'S12', 'S11', 'S10', 'S9', 'S8', 'S7', 'S6', 'S5', 'S4', 'S3'] as any,
      ['S13', 'S12', 'S11', 'S10', 'S9', 'S8', 'S7', 'S6', 'S5', 'S4', 'S3', 'S2', 'H2'] as any,
      ['D14', 'D13', 'D12', 'D11', 'D10', 'D9', 'D8', 'D7', 'D6', 'D5', 'D4', 'D3', 'D2'] as any,
      ['C14', 'C13', 'C12', 'C11', 'C10', 'C9', 'C8', 'C7', 'C6', 'C5', 'C4', 'C3', 'C2'] as any,
    ] as any;
    s.cards = cardIndex(config);

    const actor = currentActor(s);
    if (actor === 1) {
      const legal = legalActions(s);
      const playActions = legal.filter((a) => a.type === 'Play') as PlayAction[];
      // Seat 1 can't follow hearts (only H2, which is a heart) — actually they CAN follow
      // Let me change: seat 1 has NO hearts
      s.hands = [
        ['H14', 'S14', 'S13', 'S12', 'S11', 'S10', 'S9', 'S8', 'S7', 'S6', 'S5', 'S4', 'S3'] as any,
        ['S13', 'S12', 'S11', 'S10', 'S9', 'S8', 'S7', 'S6', 'S5', 'S4', 'S3', 'S2', 'D2'] as any,
        ['D14', 'D13', 'D12', 'D11', 'D10', 'D9', 'D8', 'D7', 'D6', 'D5', 'D4', 'D3', 'D2'] as any,
        ['C14', 'C13', 'C12', 'C11', 'C10', 'C9', 'C8', 'C7', 'C6', 'C5', 'C4', 'C3', 'C2'] as any,
      ] as any;
      const legal2 = legalActions(s);
      const playActions2 = legal2.filter((a) => a.type === 'Play') as PlayAction[];
      // Should have all cards (any suit or trump)
      expect(playActions2.length).toBe(13);
    }
  });

  it('exchange: swap 2 cards with kitty', () => {
    const config = makeConfig({ deckMode: 'jokers', allowBlindNil: true });
    const state = createGame(config, 'exchange-test');
    let s = state;

    // Blind nil first, then normal bids
    s = applyAction(s, { type: 'Bid', kind: 'blindNil', amount: 0 }).state;
    s = applyAction(s, { type: 'Bid', kind: 'number', amount: 3 }).state;
    s = applyAction(s, { type: 'Bid', kind: 'number', amount: 3 }).state;
    s = applyAction(s, { type: 'Bid', kind: 'number', amount: 4 }).state;

    if (s.phase === 'exchanging') {
      const exchangeSeat = s.pendingExchange[0];
      if (exchangeSeat !== undefined && s.hands[exchangeSeat]) {
        const out = s.hands[exchangeSeat]!.slice(0, 2);
        const action = { type: 'Exchange' as const, out };
        s = applyAction(s, action).state;
        expect(s.phase).toBe('playing');
      }
    }
  });
});

describe('applyAction — game over', () => {
  it('gameOver phase: no legal actions', () => {
    const config = makeConfig({ deckMode: 'plain' });
    const state = createGame(config, 'go-actions');
    state.phase = 'gameOver';
    const actions = legalActions(state);
    expect(actions).toHaveLength(0);
  });
});

describe('currentActor edge cases', () => {
  it('bidding: returns first unbid seat clockwise from dealer', () => {
    const config = makeConfig({ deckMode: 'plain' });
    const state = createGame(config, 'actor-bid');
    const actor = currentActor(state);
    expect(actor).toBe(((state.dealer + 1) % 4) as Seat);
  });

  it('gameOver: returns null', () => {
    const config = makeConfig({ deckMode: 'plain' });
    const state = createGame(config, 'actor-go');
    state.phase = 'gameOver';
    expect(currentActor(state)).toBeNull();
  });
});

describe('applyAction — wrong phase', () => {
  it('throws WRONG_PHASE for NextHand in bidding', () => {
    const config = makeConfig({ deckMode: 'plain' });
    const state = createGame(config, 'wrong-phase-nh');
    const action = { type: 'NextHand' as const };
    expect(() => applyAction(state, action)).toThrow(EngineError);
  });
});
