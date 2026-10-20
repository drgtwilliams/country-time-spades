/**
 * rene.ts — Follow-suit, renege, and all-trump detection.
 *
 * Pure helpers used by `actions.ts` (legal move generation) and
 * `apply.ts` (penalty-mode renege recording).
 */

import type { Seat, CardId, Suit } from './types';
import type { GameConfig } from './config';
import type { GameState } from './state';
import { isJoker, isTrump } from './deck';

/**
 * Does the seat hold at least one card of the led suit?
 *
 * Promoted deuces (JJDD) are trump for all purposes and do NOT count
 * as their printed suit. Jokers also never follow a suit.
 */
export function canFollowLed(state: GameState, seat: Seat, ledSuit: Suit | null): boolean {
  if (ledSuit === null) return false;

  const hand = state.hands[seat as number]!;
  for (const cardId of hand) {
    const card = state.cards.get(cardId);
    if (!card || isJoker(card)) continue;
    // A promoted deuce of the led suit is still a valid follower
    // (it IS of the led suit even though it's also trump)
    if (card.suit === ledSuit) return true;
  }
  return false;
}

/**
 * Is playing `cardId` a renege?
 */
export function isRenege(state: GameState, seat: Seat, cardId: CardId, ledSuit: Suit): boolean {
  const card = state.cards.get(cardId);
  if (!card || isJoker(card)) return false;
  if (card.suit === ledSuit) return false;
  return canFollowLed(state, seat, ledSuit);
}

/**
 * Does the seat hold ONLY trump cards?
 */
export function allTrump(seat: Seat, state: GameState, config: GameConfig): boolean {
  const hand = state.hands[seat as number]!;
  for (const cardId of hand) {
    const card = state.cards.get(cardId);
    if (!card) return false;
    if (!isTrump(card, config)) return false;
  }
  return hand.length > 0;
}

/**
 * Is `cardId` a legal lead?
 *
 * Non-trump always legal. Trump led only if spades broken or all-trump hand.
 */
export function isLegalLead(state: GameState, seat: Seat, cardId: CardId, config: GameConfig): boolean {
  const card = state.cards.get(cardId);
  if (!card) return false;

  if (!isTrump(card, config)) return true;
  if (state.spadesBroken) return true;
  return allTrump(seat, state, config);
}
