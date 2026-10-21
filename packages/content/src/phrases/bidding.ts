/**
 * Bidding phrase bank — lines for BidMade, NilDeclared, BlindNilDeclared events.
 */

import type { BanterLine, PhraseBank } from './types';
import type { Seat } from 'engine';

const s = (line: BanterLine): BanterLine => line;

/** Nil declaration phrases — each character has flavor-appropriate lines. */
export const NIL_DECLARED: PhraseBank = {
  // Uncle Ray: measured, nostalgic
  0: [
    s({ text: "Nil. I been carryin' this table longer than y'all been knowin' how to count.", tags: ['wise'] }),
    s({ text: "Zero. Hand me the cards, I know what I'm doin'.", tags: ['deadpan'] }),
    s({ text: "Nil. Ain't nobody takin' a trick off me.", tags: ['teasing'] }),
  ],
  // Big Man: loud, escalating
  1: [
    s({ text: "NIL! Don't nobody doubt me!", tags: ['trashTalk'] }),
    s({ text: "Zero! Y'all better brace yourselves!", tags: ['trashTalk'] }),
    s({ text: "Nil! That's what they call confidence, baby!", tags: ['trashTalk', 'teasing'] }),
  ],
  // Silent Sam: deadpan, one-liner
  2: [
    s({ text: "Nil.", tags: ['deadpan'] }),
    s({ text: "Zero. Yeah.", tags: ['deadpan'] }),
    s({ text: "Nil. Don't make me say it twice.", tags: ['deadpan', 'trashTalk'] }),
  ],
  // Aunty Dee: sharp, motherly
  3: [
    s({ text: "Nil. Y'all better not be countin' on me.", tags: ['teasing'] }),
    s({ text: "Zero. I done told y'all I play hard.", tags: ['teasing', 'wise'] }),
    s({ text: "Nil. Sit back and watch.", tags: ['deadpan'] }),
  ],
  // Fresh Me: earnest, tentative
  4: [
    s({ text: "Nil... I think I can handle that.", tags: ['earnest'] }),
    s({ text: "Zero. Is that okay? I'll try my best.", tags: ['earnest'] }),
    s({ text: "Nil. My partner better not be mad.", tags: ['earnest'] }),
  ],
  // Math Boy: statistical, analytical
  5: [
    s({ text: "Nil. I've counted my hand. The odds are in my favor.", tags: ['statistical'] }),
    s({ text: "Zero. Probability says I can avoid all thirteen.", tags: ['statistical', 'deadpan'] }),
    s({ text: "Nil. I've done the math. It checks out.", tags: ['statistical'] }),
  ],
  // All: generic fallback (any character reacting to ANY nil bid)
  All: [
    s({ text: "Nil? Okay…", tags: ['reactionary'] }),
    s({ text: "A nil bidder. This should be interesting.", tags: ['reactionary'] }),
    s({ text: "Zero. Bold move.", tags: ['deadpan'] }),
  ],
};

/** Number bid phrases. */
export const NUMBER_BID: PhraseBank = {
  0: [
    s({ text: "Three. Steady as she goes.", tags: ['wise'] }),
    s({ text: "Four. I'm feelin' lucky today.", tags: ['teasing'] }),
    s({ text: "Three. Not too bold, not too timid.", tags: ['deadpan'] }),
  ],
  1: [
    s({ text: "FIVE! Let's get after it!", tags: ['trashTalk'] }),
    s({ text: "Four! I ain't playin' around today!", tags: ['trashTalk'] }),
    s({ text: "SIX! Y'all ready for this?", tags: ['trashTalk'] }),
  ],
  2: [
    s({ text: "Three.", tags: ['deadpan'] }),
    s({ text: "Four. Figured it out.", tags: ['statistical'] }),
    s({ text: "Three. Enough.", tags: ['deadpan'] }),
  ],
  3: [
    s({ text: "Three. I'll take what I need.", tags: ['teasing'] }),
    s({ text: "Four. Don't say I didn't warn y'all.", tags: ['teasing'] }),
    s({ text: "Three. That's a good number.", tags: ['wise'] }),
  ],
  4: [
    s({ text: "Two. I'm still learnin' the ropes.", tags: ['earnest'] }),
    s({ text: "Three. That feels right.", tags: ['earnest'] }),
    s({ text: "Two. Baby steps.", tags: ['earnest'] }),
  ],
  5: [
    s({ text: "Three. Expected value says that's optimal.", tags: ['statistical'] }),
    s({ text: "Four. The numbers don't lie.", tags: ['statistical'] }),
    s({ text: "Three. Conservative estimate.", tags: ['statistical', 'deadpan'] }),
  ],
  All: [
    s({ text: "A solid bid. Let's see if they keep it.", tags: ['reactionary'] }),
    s({ text: "Three. Classic.", tags: ['deadpan'] }),
    s({ text: "Bold numbers today.", tags: ['trashTalk'] }),
  ],
};

/** Blind nil phrases. */
export const BLIND_NIL: PhraseBank = {
  0: [
    s({ text: "Blind nil. Y'all ain't seen nothin' yet.", tags: ['trashTalk', 'deadpan'] }),
    s({ text: "Blind nil. I don't even need to look.", tags: ['deadpan'] }),
  ],
  1: [
    s({ text: "BLIND NIL! That's what I call a power move!", tags: ['trashTalk'] }),
    s({ text: "Blind nil! Y'all better run it back after this!", tags: ['trashTalk'] }),
  ],
  2: [
    s({ text: "Blind nil. Watch and learn.", tags: ['deadpan', 'trashTalk'] }),
    s({ text: "Blind nil. Yeah.", tags: ['deadpan'] }),
  ],
  3: [
    s({ text: "Blind nil. Don't y'all go cryin' when I win.", tags: ['teasing'] }),
    s({ text: "Blind nil. Sit down and be quiet.", tags: ['deadpan'] }),
  ],
  4: [
    s({ text: "Blind nil… okay, why not?", tags: ['earnest'] }),
    s({ text: "Blind nil! …I think that's a good idea.", tags: ['earnest'] }),
  ],
  5: [
    s({ text: "Blind nil. Without looking? Statistically sound.", tags: ['statistical', 'deadpan'] }),
    s({ text: "Blind nil. Variance is on my side.", tags: ['statistical'] }),
  ],
  All: [
    s({ text: "BlIND NIL. Now that's bold.", tags: ['reactionary', 'trashTalk'] }),
    s({ text: "No peeking? Okay.", tags: ['reactionary'] }),
    s({ text: "Blind nil? This just got real.", tags: ['reactionary'] }),
  ],
};
