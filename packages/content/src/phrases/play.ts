/**
 * Play event phrases — spade break, trick win, renege, follow-suit.
 */

import type { BanterLine, PhraseBank } from './types';
import type { Seat } from 'engine';

const s = (line: BanterLine): BanterLine => line;

/** Spades were broken — first trump played. */
export const SPADE_BREAK: PhraseBank = {
  0: [
    s({ text: "Spades break. Let's see who's countin'.", tags: ['statistical'] }),
    s({ text: "There it is. The moment of truth.", tags: ['wise'] }),
    s({ text: "Spades up. Nobody's safe now.", tags: ['deadpan'] }),
  ],
  1: [
    s({ text: "SPADES BREAK! Now we talkin'!", tags: ['trashTalk'] }),
    s({ text: "Spades! Y'all better watch yourselves!", tags: ['trashTalk'] }),
    s({ text: "Finally! I was gettin' sleepy!", tags: ['reactionary'] }),
  ],
  2: [
    s({ text: "♠. About time.", tags: ['deadpan'] }),
    s({ text: "Break time. Good.", tags: ['deadpan'] }),
  ],
  3: [
    s({ text: "Spades break. Hope y'all ready.", tags: ['teasing'] }),
    s({ text: "There goes the neighborhood.", tags: ['teasing', 'reactionary'] }),
    s({ text: "Spades. My favorite.", tags: ['deadpan'] }),
  ],
  4: [
    s({ text: "Oh! Spades break!", tags: ['earnest', 'reactionary'] }),
    s({ text: "Wait, so now trumps are wild?", tags: ['earnest'] }),
  ],
  5: [
    s({ text: "Spades broken. Trump control is now in play.", tags: ['statistical'] }),
    s({ text: "First trump. The game just changed.", tags: ['statistical', 'deadpan'] }),
  ],
  All: [
    s({ text: "Spades break! Let's go!", tags: ['reactionary', 'trashTalk'] }),
    s({ text: "Trump's in the house.", tags: ['deadpan'] }),
    s({ text: "Here we go.", tags: ['reactionary'] }),
  ],
};

/** Trick won — team wins a trick. */
export const TRICK_WON: PhraseBank = {
  0: [
    s({ text: "One for the team. Steady.", tags: ['wise'] }),
    s({ text: "Got it. Don't get excited.", tags: ['deadpan'] }),
    s({ text: "Trick one. We just gettin' started.", tags: ['teasing'] }),
  ],
  1: [
    s({ text: "That's what I'm talkin' about! Trick taken!", tags: ['trashTalk'] }),
    s({ text: "Boom! That's how it's done!", tags: ['trashTalk'] }),
    s({ text: "One more! I'm on a roll!", tags: ['trashTalk', 'reactionary'] }),
  ],
  2: [
    s({ text: "Trick. Yeah.", tags: ['deadpan'] }),
    s({ text: "Mm. Easy one.", tags: ['deadpan'] }),
  ],
  3: [
    s({ text: "That's right. Watch how that's done.", tags: ['teasing'] }),
    s({ text: "Nice. Real nice.", tags: ['teasing', 'wise'] }),
  ],
  4: [
    s({ text: "We got it! Okay, I'm gettin' the hang of this.", tags: ['earnest'] }),
    s({ text: "Yay! Our trick!", tags: ['earnest', 'reactionary'] }),
  ],
  5: [
    s({ text: "Trick won. Expected return on that play.", tags: ['statistical'] }),
    s({ text: "That aligns with my calculation.", tags: ['statistical', 'deadpan'] }),
  ],
  All: [
    s({ text: "Trick taken. Next one up.", tags: ['reactionary'] }),
    s({ text: "Solid play.", tags: ['deadpan'] }),
    s({ text: "Ooooh, clean play.", tags: ['reactionary', 'teasing'] }),
  ],
};

/** Renege detected — follow-suit violation (prevent mode or penalty mode). */
export const RENEGE_DETECTED: PhraseBank = {
  0: [
    s({ text: "Hold up — you had to follow that suit.", tags: ['wise', 'teasing'] }),
    s({ text: "Now wait a minute. Rules is rules.", tags: ['teasing'] }),
  ],
  1: [
    s({ text: "RENEGE! Did y'all just try to pull that?!", tags: ['trashTalk'] }),
    s({ text: "Excuse me?! You couldn't follow suit?! That's a renege!", tags: ['trashTalk', 'reactionary'] }),
    s({ text: "Oh no you didn't! Call it!", tags: ['trashTalk'] }),
  ],
  2: [
    s({ text: "Renege. That's on you.", tags: ['deadpan'] }),
    s({ text: "You had the card. Don't pretend otherwise.", tags: ['deadpan', 'teasing'] }),
  ],
  3: [
    s({ text: "Oh honey, you can't do that.", tags: ['teasing'] }),
    s({ text: "That's a renege. Sit down and be honest.", tags: ['teasing', 'wise'] }),
  ],
  4: [
    s({ text: "Wait, was that allowed? I don't think so…", tags: ['earnest'] }),
    s({ text: "Uh oh. Did someone forget the rules?", tags: ['earnest', 'reactionary'] }),
  ],
  5: [
    s({ text: "Follow-suit violation detected. That's a renege.", tags: ['statistical', 'deadpan'] }),
    s({ text: "You had hearts. You couldn't discard spades. Simple math.", tags: ['statistical'] }),
  ],
  All: [
    s({ text: "Hold up — didn't someone have that suit?", tags: ['reactionary'] }),
    s({ text: "Renege! Call the renege!", tags: ['reactionary', 'trashTalk'] }),
    s({ text: "That's not how this works, cousin.", tags: ['teasing'] }),
  ],
};

/** Spade lead when spades aren't broken yet. */
export const SPADE_LEAD_PREVENTED: PhraseBank = {
  All: [
    s({ text: "Can't lead spades yet! Spades ain't broken!", tags: ['reactionary', 'teasing'] }),
    s({ text: "Not so fast — spades still sealed.", tags: ['wise'] }),
    s({ text: "Spades ain't broken, you can't throw that.", tags: ['teasing', 'deadpan'] }),
  ],
};
