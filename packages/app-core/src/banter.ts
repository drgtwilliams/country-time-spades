/**
 * Banter selector — the core engine that turns engine events into banter lines.
 *
 * Pipeline:
 *   EngineEvent → eventKey → candidate phrases → personality filter →
 *   relationship filter → anti-repeat → cooldown → result
 *
 * M2: basic banter queue.
 * M3: full selector with relationships, anti-repeat, cooldown.
 * M4: server authoritative banter distribution.
 */

import type { EngineEvent, Seat } from 'engine';
import {
  CAST_MEMBERS,
  getRelationship,
  NIL_DECLARED, NUMBER_BID, BLIND_NIL,
  SPADE_BREAK, TRICK_WON, RENEGE_DETECTED, SPADE_LEAD_PREVENTED,
  SET, BAG_THRESHOLD_HIT, SCORE_MILESTONE, GAME_OVER,
  NIL_MADE, NIL_CAUGHT, BOSTON,
  DEAL_COMPLETE, ANNOUNCER_BEATS, GENERAL_REACTION,
  type BanterLine,
  type PhraseBank,
  type CastMember,
  resolvePhrases,
  filterByTag,
  filterByHand,
} from 'content';

/** Configuration for banter selection. */
export interface BanterConfig {
  /** Banter density: how many characters react per event. */
  density: 'low' | 'medium' | 'high';
  /** Cooldown in ms between same-event-type triggers. */
  cooldownMs: number;
  /** Max stacked bubbles on screen. */
  maxStack: number;
}

export const DEFAULT_BANTER_CONFIG: BanterConfig = {
  density: 'medium',
  cooldownMs: 3000,
  maxStack: 3,
};

/** A banter line ready for display. */
export interface DisplayBanterLine {
  /** The text to show. */
  text: string;
  /** Seat of the character speaking (null for announcer). */
  seat: Seat | null;
  /** Speaker's name (for debugging/announcer). */
  speaker?: string;
  /** Cast member of the speaker (for TTS voice lookup). */
  character?: import('content').CastMember;
  /** Priority. */
  priority: 'normal' | 'high' | 'low';
  /** Unique ID for anti-repeat. */
  id: string;
  /** When this line was created (for cooldown). */
  timestamp: number;
}

/** Banter session — tracks used lines and cooldowns. */
export class BanterSession {
  private usedLines = new Set<string>();
  private lastEventTime = new Map<string, number>();
  private sessionStart = Date.now();

  /** Check if an event type is on cooldown. */
  isOnCooldown(eventType: string): boolean {
    const lastTime = this.lastEventTime.get(eventType);
    if (lastTime === undefined) return false;
    return Date.now() - lastTime < DEFAULT_BANTER_CONFIG.cooldownMs;
  }

  /** Mark an event type as triggered (starts cooldown). */
  markEventTriggered(eventType: string): void {
    this.lastEventTime.set(eventType, Date.now());
  }

  /** Check if a line ID has been used this session. */
  isUsed(lineId: string): boolean {
    return this.usedLines.has(lineId);
  }

  /** Mark a line as used. */
  markUsed(lineId: string): void {
    this.usedLines.add(lineId);
  }

  /** Get session duration in hands (approximate). */
  getHandNumber(): number {
    // Approximate: assume ~3 minutes per hand
    return Math.floor((Date.now() - this.sessionStart) / (3 * 60 * 1000));
  }
}

/**
 * Select a banter line for a given event, cast member, and seat.
 */
export function selectBanterLine(
  event: EngineEvent,
  castMember: CastMember,
  seat: Seat,
  allSeats: Seat[],
  session: BanterSession,
  config: BanterConfig = DEFAULT_BANTER_CONFIG,
): DisplayBanterLine | null {
  // Map event type to phrase bank
  const bank = getPhraseBankForEvent(event);
  if (!bank) return null;

  // Check cooldown
  if (session.isOnCooldown(event.type)) return null;

  // Get candidate phrases
  let candidates = resolvePhrases(bank, seat);

  // Filter by personality tag — only use phrases matching this character's tags
  const matchingTags = castMember.tags.filter((tag) => tag !== 'reactionary');
  if (matchingTags.length > 0) {
    // Try each tag, prefer first match
    for (const tag of matchingTags) {
      const tagged = filterByTag(candidates, tag);
      if (tagged.length > 0) {
        candidates = tagged;
        break;
      }
    }
  }

  // Filter by hand number (rookie progression)
  candidates = filterByHand(candidates, session.getHandNumber());

  // Anti-repeat: exclude used lines
  candidates = candidates.filter((line) => {
    const lineId = line.id ?? `${castMember.id}:${line.text}`;
    return !session.isUsed(lineId);
  });

  if (candidates.length === 0) return null;

  // Select random line from filtered candidates
  const selected = candidates[Math.floor(Math.random() * candidates.length)];

  // Mark as used
  const lineId = selected.id ?? `${castMember.id}:${selected.text}`;
  session.markUsed(lineId);
  session.markEventTriggered(event.type);

  // Determine priority
  const priority: DisplayBanterLine['priority'] = selected.priority ?? 'normal';

  return {
    text: selected.text,
    seat,
    speaker: castMember.name,
    character: castMember,
    priority,
    id: lineId,
    timestamp: Date.now(),
  };
}

/**
 * Get the phrase bank for an engine event type.
 */
function getPhraseBankForEvent(event: EngineEvent): PhraseBank | null {
  switch (event.type) {
    case 'NilDeclared':
      return NIL_DECLARED;
    case 'BlindNilDeclared':
      return BLIND_NIL;
    case 'BidMade':
      return NUMBER_BID;
    case 'BreakSpades':
      return SPADE_BREAK;
    case 'TrickWon':
      return TRICK_WON;
    case 'RenegeDetected':
      return RENEGE_DETECTED;
    case 'Set':
      return SET;
    case 'BagThresholdHit':
      return BAG_THRESHOLD_HIT;
    case 'ScoreMilestone':
      return SCORE_MILESTONE;
    case 'GameOver':
      return GAME_OVER;
    case 'NilMade':
      return NIL_MADE;
    case 'NilCaught':
      return NIL_CAUGHT;
    case 'Boston':
      return BOSTON;
    case 'DealComplete':
      return DEAL_COMPLETE;
    default:
      return GENERAL_REACTION;
  }
}

/**
 * Get all banter lines for an event (multiple characters may react).
 */
export function selectAllBanterLines(
  event: EngineEvent,
  seatToCastIndex: Record<Seat, number>,
  allSeats: Seat[],
  session: BanterSession,
  config: BanterConfig = DEFAULT_BANTER_CONFIG,
): DisplayBanterLine[] {
  const lines: DisplayBanterLine[] = [];

  for (const seat of allSeats) {
    const castMember = CAST_MEMBERS[seatToCastIndex[seat] ?? 0];
    const line = selectBanterLine(event, castMember, seat, allSeats, session, config);
    if (line) {
      lines.push(line);
    }
  }

  // Inject announcer beats for big moments (Set, Boston, NilMade, NilCaught, Boston, GameOver)
  const announcerKey = getAnnouncerKey(event);
  if (announcerKey && !session.isOnCooldown(`announcer:${announcerKey}`)) {
    const beats = ANNOUNCER_BEATS[announcerKey];
    if (beats && beats.length > 0) {
      // Pick one, anti-repeat
      const available = beats.filter((b) => {
        const bid = `announcer:${b.text}`;
        return !session.isUsed(bid);
      });
      if (available.length > 0) {
        const beat = available[Math.floor(Math.random() * available.length)];
        const beatId = `announcer:${beat.text}`;
        session.markUsed(beatId);
        session.markEventTriggered(`announcer:${announcerKey}`);
        lines.unshift({
          text: beat.text,
          seat: null,
          speaker: 'Announcer',
          priority: beat.priority ?? 'high',
          id: beatId,
          timestamp: Date.now(),
        });
      }
    }
  }

  // Sort by priority (high first)
  lines.sort((a, b) => {
    const order = { high: 0, normal: 1, low: 2 };
    return order[a.priority] - order[b.priority];
  });

  // Enforce max stack
  return lines.slice(0, config.maxStack);
}

/** Map engine event types to ANNOUNCER_BEATS keys. */
function getAnnouncerKey(event: EngineEvent): string | null {
  const map: Record<string, string> = {
    DealComplete: 'deal',
    Set: 'set',
    Boston: 'boston',
    GameOver: 'gameOver',
    NilMade: 'nilMade',
    NilCaught: 'nilCaught',
    BagThresholdHit: 'bagThreshold',
    BreakSpades: 'spadeBreak',
  };
  return map[event.type] ?? null;
}
