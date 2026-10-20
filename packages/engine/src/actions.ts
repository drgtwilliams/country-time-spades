/**
 * Action types and legal move generation.
 *
 * The engine adjudicates; the UI asks `legalActions()` and renders
 * affordances. The UI never decides legality.
 */

import type { Seat, CardId, Card } from './types';
import type { GameConfig } from './config';
import type { GameState, BidRecord } from './state';
import { isJoker, isTrump } from './deck';
import { canFollowLed, allTrump, isLegalLead } from './rene';

/** A bid action. */
export interface BidAction {
  readonly type: 'Bid';
  readonly kind: 'number' | 'nil' | 'blindNil';
  readonly amount: number;
}

/** An exchange action (blind nil card swap). */
export interface ExchangeAction {
  readonly type: 'Exchange';
  readonly out: readonly CardId[];
}

/** A play action. */
export interface PlayAction {
  readonly type: 'Play';
  readonly cardId: CardId;
}

/** Advance to the next hand. */
export interface NextHandAction {
  readonly type: 'NextHand';
}

/** All possible actions. */
export type Action = BidAction | ExchangeAction | PlayAction | NextHandAction;

/**
 * Return the current actor (the player whose turn it is).
 */
export function currentActor(state: GameState): Seat | null {
  switch (state.phase) {
    case 'bidding': {
      for (let offset = 0; offset < 4; offset++) {
        const seat = ((state.dealer + 1 + offset) % 4) as Seat;
        if (!state.bids.find((b) => b.seat === seat)) return seat;
      }
      return null;
    }
    case 'exchanging': {
      if (state.pendingExchange.length > 0) return state.pendingExchange[0]!;
      return null;
    }
    case 'playing': {
      if (!state.currentTrick || state.currentTrick.plays.length === 0) {
        return ((state.dealer + 1) % 4) as Seat;
      }
      const lastPlay = state.currentTrick.plays[state.currentTrick.plays.length - 1]!;
      return ((lastPlay.seat + 1) % 4) as Seat;
    }
    case 'handOver':
      return state.dealer;
    case 'gameOver':
      return null;
  }
}

/**
 * Return all legal actions for the current actor.
 */
export function legalActions(state: GameState): Action[] {
  const actor = currentActor(state);
  if (actor === null) return [];

  switch (state.phase) {
    case 'bidding':
      return biddingActions(state, actor);
    case 'exchanging':
      return exchangeActions(state, actor);
    case 'playing':
      return playActions(state, actor);
    case 'handOver':
      return [{ type: 'NextHand' }] as Action[];
    case 'gameOver':
      return [];
  }
}

function biddingActions(state: GameState, _seat: Seat): BidAction[] {
  const actions: BidAction[] = [];
  for (let i = 1; i <= 13; i++) actions.push({ type: 'Bid', kind: 'number', amount: i });
  if (state.config.allowNil) actions.push({ type: 'Bid', kind: 'nil', amount: 0 });
  if (state.config.allowBlindNil && state.config.allowNil) actions.push({ type: 'Bid', kind: 'blindNil', amount: 0 });
  return actions;
}

function exchangeActions(state: GameState, seat: Seat): ExchangeAction[] {
  const hand = state.hands[seat as number]!;
  const actions: ExchangeAction[] = [];
  if (state.kitty.length !== 2) return actions;
  for (let i = 0; i < hand.length; i++) {
    for (let j = i + 1; j < hand.length; j++) {
      actions.push({ type: 'Exchange', out: [hand[i]!, hand[j]!] });
    }
  }
  return actions;
}

function playActions(state: GameState, seat: Seat): PlayAction[] {
  const hand = state.hands[seat as number]!;
  const config = state.config;
  const actions: PlayAction[] = [];

  if (!state.currentTrick || state.currentTrick.plays.length === 0) {
    // Leading
    for (const cardId of hand) {
      if (isLegalLead(state, seat, cardId, config)) {
        actions.push({ type: 'Play', cardId });
      } else if (config.rene === 'penalty') {
        // In penalty mode, non-trump leads are always legal (renege class)
        const card = state.cards.get(cardId);
        if (card && !isTrump(card, config)) {
          actions.push({ type: 'Play', cardId });
        }
      }
    }
  } else {
    // Following
    const firstPlay = state.currentTrick.plays[0]!;
    const firstCard = state.cards.get(firstPlay.cardId);

    if (!firstCard || isJoker(firstCard)) {
      // Joker led — no suit to follow
      for (const cardId of hand) actions.push({ type: 'Play', cardId });
    } else {
      const ledSuit = firstCard.suit;
      const canFollow = canFollowLed(state, seat, ledSuit);

      if (canFollow) {
        for (const cardId of hand) {
          const card = state.cards.get(cardId);
          if (card && !isJoker(card) && card.suit === ledSuit) {
            actions.push({ type: 'Play', cardId });
          }
        }
      } else {
        for (const cardId of hand) actions.push({ type: 'Play', cardId });
      }
    }
  }

  return actions;
}

/** Check if an action is in the legal set. */
export function isLegalAction(state: GameState, action: Action): boolean {
  const legal = legalActions(state);
  return legal.some((la) => actionsEqual(la, action));
}

function actionsEqual(a: Action, b: Action): boolean {
  if (a.type !== b.type) return false;
  if (a.type === 'Bid' && b.type === 'Bid') return a.kind === b.kind && a.amount === b.amount;
  if (a.type === 'Exchange' && b.type === 'Exchange') return a.out[0] === b.out[0] && a.out[1] === b.out[1];
  if (a.type === 'Play' && b.type === 'Play') return a.cardId === b.cardId;
  if (a.type === 'NextHand' && b.type === 'NextHand') return true;
  return false;
}
