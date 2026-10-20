/**
 * Deck construction, trump logic, and trick resolution.
 *
 * All functions are pure and deterministic; no I/O, no randomness.
 */

import type { Card, CardId, PlayingCard, Joker, Seat, Suit } from './types';
import type { GameConfig } from './config';
import { teamOf } from './types';

/* ------------------------------------------------------------------ */
/*  Deck construction                                                  */
/* ------------------------------------------------------------------ */

const SUITS: Suit[] = ['S', 'H', 'D', 'C'];

/**
 * Build a deck according to `config`.
 *
 * Order: spades (A→2), hearts (A→2), diamonds (A→2), clubs (A→2),
 * then jokers (JB, JL) when present.
 */
export function buildDeck(config: GameConfig): Card[] {
  const cards: Card[] = [];
  for (const suit of SUITS) {
    for (let rank = 14; rank >= 2; rank--) {
      cards.push({ id: `${suit}${rank}`, suit, rank: rank as PlayingCard['rank'] });
    }
  }
  if (config.deckMode !== 'plain') {
    cards.push({ id: 'JB', kind: 'big' });
    cards.push({ id: 'JL', kind: 'little' });
  }
  return cards;
}

/* ------------------------------------------------------------------ */
/*  Trump detection                                                    */
/* ------------------------------------------------------------------ */

/** Type guard: is this a joker? */
export function isJoker(card: Card): card is Joker {
  return 'kind' in card;
}

/**
 * Is `card` a trump card under `config`?
 *
 * - Spades always trump.
 * - Jokers trump when `deckMode !== 'plain'`.
 * - A deuce (rank 2) of a suit listed in `promotedDeuces` trumps in JJDD mode.
 */
export function isTrump(card: Card, config: GameConfig): boolean {
  if (isJoker(card)) {
    return config.deckMode !== 'plain';
  }
  if (card.suit === 'S') return true;
  if (config.deckMode === 'jjdd' && card.rank === 2 && config.promotedDeuces.includes(card.suit)) {
    return true;
  }
  return false;
}

/**
 * Return a numeric rank for trump comparison, or `null` if the card is not trump.
 *
 * Higher number = stronger.
 * - Big Joker: 100
 * - Little Joker: 99
 * - Promoted deuce: 90 - index in `promotedDeuces`
 * - Spade: its face value (2–14)
 */
export function trumpRank(card: Card, config: GameConfig): number | null {
  if (isJoker(card)) {
    return card.kind === 'big' ? 100 : 99;
  }
  if (card.suit === 'S') return card.rank;
  if (config.deckMode === 'jjdd' && card.rank === 2) {
    const idx = config.promotedDeuces.indexOf(card.suit);
    if (idx !== -1) return 90 - idx;
  }
  return null;
}

/* ------------------------------------------------------------------ */
/*  Card power & trick winner                                          */
/* ------------------------------------------------------------------ */

/**
 * Determine the led suit from the first non-joker play.
 *
 * Jokers never follow suit, so the lead suit comes from the first
 * non-joker card in the trick.
 */
function getLedSuit(plays: { seat: Seat; card: Card }[]): Suit | null {
  for (const play of plays) {
    if (!isJoker(play.card)) return play.card.suit;
  }
  return null;
}

/**
 * Compute power of a card in a trick context, given the led suit and config.
 */
function cardPowerInTrick(card: Card, ledSuit: Suit | null, config: GameConfig): number {
  if (isTrump(card, config)) {
    const tr = trumpRank(card, config);
    return tr !== null ? 10000 + tr : -1;
  }
  // Non-trump: wins only if it matches the led suit
  if (ledSuit !== null && !isJoker(card) && card.suit === ledSuit) {
    return card.rank;
  }
  return -1;
}

/**
 * Determine the trick winner given a list of plays.
 *
 * The play with the highest power wins. Ties are impossible because
 * all cards in a legal deck have unique identities and power is derived
 * from card properties alone.
 */
export function trickWinner(
  plays: { seat: Seat; card: Card }[],
  config: GameConfig,
): Seat {
  if (plays.length === 0) throw new Error('trickWinner: no plays');

  const ledSuit = getLedSuit(plays);

  let bestSeat = plays[0]!.seat;
  let bestPower = -Infinity;

  for (const play of plays) {
    const power = cardPowerInTrick(play.card, ledSuit, config);
    if (power > bestPower) {
      bestSeat = play.seat;
      bestPower = power;
    }
  }

  return bestSeat;
}

/** Legacy alias — same as `trickWinner`. */
export function trickWinnerResolved(
  plays: { seat: Seat; card: Card }[],
  config: GameConfig,
): Seat {
  return trickWinner(plays, config);
}
