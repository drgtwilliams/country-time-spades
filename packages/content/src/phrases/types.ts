/**
 * Phrase bank types — the structure for all banter lines.
 *
 * Each phrase is a candidate line with metadata for filtering.
 */

import type { PersonalityTag, Seat } from 'engine';

/** A single banter line with personality metadata. */
export interface BanterLine {
  /** The text to display in a speech bubble. */
  text: string;

  /** Personality tags — used for filtering by character. */
  tags: PersonalityTag[];

  /** Minimum hand number before this line becomes available. */
  minHand?: number;

  /** Maximum hand number after which this line expires. */
  maxHand?: number;

  /** Whether this line should only fire when the character is the actor (e.g. nil bidder). */
  requiresActor?: boolean;

  /** Whether this line can fire from non-actor characters watching (e.g. reaction banter). */
  allowsSpectator?: boolean;

  /** Priority level. High-priority lines (announcer beats) appear on top. */
  priority?: 'normal' | 'high' | 'low';

  /** Optional unique ID for anti-repeat tracking. */
  id?: string;
}

/** Phrase bank: keyed by seat (or 'All') for a given event type. */
export type PhraseBank = Record<Seat | 'All', BanterLine[]>;

/**
 * Resolve the effective phrase bank for a given event,
 * filtering by seat-specific entries first, then falling back to 'All'.
 */
export function resolvePhrases(
  bank: PhraseBank,
  seat: Seat,
): BanterLine[] {
  return bank[seat] ?? bank['All'] ?? [];
}

/**
 * Filter phrases by personality tag.
 */
export function filterByTag(
  phrases: BanterLine[],
  tag: PersonalityTag,
): BanterLine[] {
  return phrases.filter((p) => p.tags.includes(tag));
}

/**
 * Filter phrases by hand number.
 */
export function filterByHand(
  phrases: BanterLine[],
  handNumber: number,
): BanterLine[] {
  return phrases.filter(
    (p) =>
      (p.minHand === undefined || handNumber >= p.minHand) &&
      (p.maxHand === undefined || handNumber <= p.maxHand),
  );
}
