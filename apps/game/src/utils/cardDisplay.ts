/**
 * Card rendering utilities — convert CardId to display data.
 */

import type { Suit, Rank, Card } from 'engine';

/** Display metadata for a single card. */
export interface CardDisplay {
  /** Full card ID from engine, e.g. 'S14' or 'JB'. */
  cardId: string;
  /** Suit letter for display. */
  suit: Suit | null;
  /** Rank number for display. */
  rank: Rank | null;
  /** Short rank label (2-14 → 2-A). */
  rankLabel: string;
  /** Joker kind if applicable. */
  jokerKind: 'big' | 'little' | null;
  /** Whether this card is a joker. */
  isJoker: boolean;
  /** Display color (red for hearts/diamonds, black for spades/clubs). */
  color: 'red' | 'black';
  /** Unicode suit symbol. */
  suitSymbol: string;
}

/** Suit symbols — color-blind safe, universally recognized. */
const SUIT_SYMBOLS: Record<Suit, string> = {
  S: '♠',
  H: '♥',
  D: '♦',
  C: '♣',
};

/**
 * Parse a CardId into display metadata.
 * Handles standard cards (S14, H7, etc.) and jokers (JB, JL).
 */
export function getCardDisplay(cardId: string): CardDisplay {
  const isJoker = cardId === 'JB' || cardId === 'JL';

  if (isJoker) {
    return {
      cardId,
      suit: null,
      rank: null,
      rankLabel: cardId === 'JB' ? 'BJ' : 'LJ',
      jokerKind: cardId === 'JB' ? 'big' : 'little',
      isJoker: true,
      color: cardId === 'JB' ? 'red' : 'black',
      suitSymbol: cardId === 'JB' ? '🃏' : '🃏',
    };
  }

  // Parse standard card: suit letter + rank number
  const suit = cardId.charAt(0) as Suit;
  const rank = parseInt(cardId.slice(1), 10) as Rank;

  const rankLabels: Record<Rank, string> = {
    2: '2', 3: '3', 4: '4', 5: '5', 6: '6', 7: '7', 8: '8',
    9: '9', 10: '10', 11: 'J', 12: 'Q', 13: 'K', 14: 'A',
  };

  const isRed = suit === 'H' || suit === 'D';

  return {
    cardId,
    suit,
    rank,
    rankLabel: rankLabels[rank],
    jokerKind: null,
    isJoker: false,
    color: isRed ? 'red' : 'black',
    suitSymbol: SUIT_SYMBOLS[suit],
  };
}

/**
 * Get a color-blind safe suit marker icon.
 */
export function getSuitMarker(suit: Suit): string {
  const markers: Record<Suit, string> = {
    S: '♠',
    H: '♥',
    D: '♦',
    C: '♣',
  };
  return markers[suit];
}
