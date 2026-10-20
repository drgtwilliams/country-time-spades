/**
 * Core type definitions for the Spades rules engine.
 *
 * All types are plain value types with no runtime dependencies.
 */

/** Suit identifiers. */
export type Suit = 'S' | 'H' | 'D' | 'C';

/**
 * Card rank as a number.
 * 11 = Jack, 12 = Queen, 13 = King, 14 = Ace.
 * 2 through 10 are face value.
 */
export type Rank = 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14;

/** Unique card identifier, e.g. 'S14' (Ace of Spades), 'JB' (Big Joker), 'JL' (Little Joker). */
export type CardId = string;

/** A standard playing card (not a joker). */
export interface PlayingCard {
  readonly id: CardId;
  readonly suit: Suit;
  readonly rank: Rank;
}

/** A joker card. */
export interface Joker {
  readonly id: CardId;
  readonly kind: 'big' | 'little';
}

/** A card is either a playing card or a joker. */
export type Card = PlayingCard | Joker;

/** One of the four seats around the table. */
export type Seat = 0 | 1 | 2 | 3;

export const SEATS: readonly Seat[] = [0, 1, 2, 3];

/** A team: even seats (0,2) vs odd seats (1,3). */
export type Team = 0 | 1;

/**
 * Return the team for a given seat.
 * Even seats → Team 0, odd seats → Team 1.
 */
export function teamOf(seat: Seat): Team {
  return (seat % 2) as Team;
}

/**
 * Return the next seat in clockwise order.
 * 0→1, 1→2, 2→3, 3→0.
 */
export function nextSeat(seat: Seat): Seat {
  return ((seat + 1) % 4) as Seat;
}
