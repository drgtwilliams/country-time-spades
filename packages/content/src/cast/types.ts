/**
 * Cast types — character definitions for the personality layer.
 *
 * Each character has a distinct personality, banter style, and
 * relationships with other seats. These are data: reviewable,
 * extendable, ready for voice binding.
 */

import type { Seat } from 'engine';

/** Personality tags used for phrase filtering. */
export type PersonalityTag =
  | 'wise'            // Uncle-type: measured, nostalgic
  | 'trashTalk'       // Loud, quick lines, escalating
  | 'deadpan'         // Quiet killer: one-liners, minimal
  | 'teasing'         // Aunty: sharp, playful, motherly
  | 'earnest'         // Rookie: warm, learning
  | 'statistical'     // Scientist: counts everything
  | 'announcer'       // Ring announcer persona
  | 'reactionary';    // Generic reaction (any character)

/** Relationship types between characters. */
export type RelationshipType = 'feud' | 'mentor' | 'rival' | 'nothing';

/** A single character at the table. */
export interface CastMember {
  /** Unique identifier (lowercase, kebab-case). */
  id: string;

  /** Display name shown at the table. */
  name: string;

  /** Archetype. */
  archetype: 'uncle' | 'trashTalker' | 'quietKiller' | 'aunty' | 'rookie' | 'scientist';

  /** Personality tags for phrase filtering. */
  tags: PersonalityTag[];

  /** Relationships with other cast members (seat-based). */
  /** Keys are relative seat offsets from this member: 0=self, 1=right, 2=opposite, 3=left. */
  relationships: Partial<Record<Seat, RelationshipType>>;

  /** Signature phrases — reused across hands to build character consistency. */
  signaturePhrases: string[];

  /** Whether this character is "active" (can be excluded for fewer players). */
  active: boolean;

  /** Default banter speed in ms (how long their bubble stays on screen). */
  bubbleDuration: number;
}

/** Six-launch cast members. */
export const CAST_MEMBERS: CastMember[] = [
  {
    id: 'uncle-ray',
    name: 'Uncle Ray',
    archetype: 'uncle',
    tags: ['wise', 'deadpan', 'teasing'],
    relationships: { 1: 'rival', 2: 'feud', 3: 'nothing' },
    signaturePhrases: [
      "I been playin' this game since you was a bid.",
      "Slow and steady don't just apply to turtles.",
      "A man who don't count his cards is a man at the mercy of fate.",
    ],
    active: true,
    bubbleDuration: 3500,
  },
  {
    id: 'big-man',
    name: 'Big Man',
    archetype: 'trashTalker',
    tags: ['trashTalk', 'teasing', 'reactionary'],
    relationships: { 1: 'feud', 2: 'nothing', 3: 'rival' },
    signaturePhrases: [
      "Hold up — did y'all just see that?",
      "I didn't come here to play nice.",
      "That's what they call a surprise, baby!",
    ],
    active: true,
    bubbleDuration: 2800,
  },
  {
    id: 'silent-sam',
    name: 'Silent Sam',
    archetype: 'quietKiller',
    tags: ['deadpan', 'trashTalk'],
    relationships: { 1: 'nothing', 2: 'rival', 3: 'feud' },
    signaturePhrases: [
      "Yeah.",
      "Mm-hmm. That's all I need.",
      "Thought so.",
    ],
    active: true,
    bubbleDuration: 2000,
  },
  {
    id: 'aunty-dee',
    name: 'Aunty Dee',
    archetype: 'aunty',
    tags: ['teasing', 'wise', 'reactionary'],
    relationships: { 1: 'nothing', 2: 'mentor', 3: 'feud' },
    signaturePhrases: [
      "Now don't make me come over there.",
      "Y'all better watch yourself.",
      "I raised y'all better than this.",
    ],
    active: true,
    bubbleDuration: 3000,
  },
  {
    id: 'fresh-me',
    name: 'Fresh Me',
    archetype: 'rookie',
    tags: ['earnest', 'statistical', 'reactionary'],
    relationships: { 1: 'nothing', 2: 'nothing', 3: 'mentor' },
    signaturePhrases: [
      "Wait, is that how this works?",
      "I think I got this.",
      "Ohhh, okay. I see it now.",
    ],
    active: true,
    bubbleDuration: 3200,
  },
  {
    id: 'math-boy',
    name: 'Math Boy',
    archetype: 'scientist',
    tags: ['statistical', 'deadpan', 'reactionary'],
    relationships: { 1: 'feud', 2: 'nothing', 3: 'nothing' },
    signaturePhrases: [
      "The odds of that? Not in my favor.",
      "I've been counting. You've got three hearts left.",
      "Probability says you're bluffing.",
    ],
    active: true,
    bubbleDuration: 3000,
  },
];

/** Lookup by ID. */
export function getCastMember(id: string): CastMember | undefined {
  return CAST_MEMBERS.find((c) => c.id === id);
}

/** Get all active cast members. */
export function getActiveCast(): CastMember[] {
  return CAST_MEMBERS.filter((c) => c.active);
}

/**
 * Get the relationship between two cast members given their seats.
 * @param selfSeat Seat of the character initiating
 * @param otherSeat Seat of the other character
 * @param config Optional override for relationship types
 */
export function getRelationship(
  selfSeat: Seat,
  otherSeat: Seat,
  castMember: CastMember,
): RelationshipType {
  if (selfSeat === otherSeat) return 'nothing';
  const offset = ((otherSeat - selfSeat + 4) % 4) as Seat;
  return castMember.relationships[offset] ?? 'nothing';
}

/**
 * Get all cast members for given seats.
 */
export function getCastsForSeats(
  seats: Seat[],
  seatToCastIndex: Record<Seat, number>,
): CastMember[] {
  return seats.map((s) => CAST_MEMBERS[seatToCastIndex[s]] ?? CAST_MEMBERS[0]);
}
