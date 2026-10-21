/**
 * Special event phrases — deal complete, announcer beats, general reactions.
 */

import type { BanterLine, PhraseBank } from './types';
import type { Seat } from 'engine';

const s = (line: BanterLine): BanterLine => line;

/** Deal complete — new hand dealt. */
export const DEAL_COMPLETE: PhraseBank = {
  0: [
    s({ text: "New hand. Let's see what we got.", tags: ['wise'] }),
    s({ text: "Cards are dealt. Time to work.", tags: ['deadpan'] }),
  ],
  1: [
    s({ text: "New hand! Let's get after it!", tags: ['trashTalk'] }),
    s({ text: "Dealt! I feel lucky today!", tags: ['trashTalk'] }),
  ],
  2: [
    s({ text: "New hand. Let's go.", tags: ['deadpan'] }),
  ],
  3: [
    s({ text: "Another hand. Hope the cards are kinder.", tags: ['teasing'] }),
  ],
  4: [
    s({ text: "New deal! Let's see what I got this time.", tags: ['earnest'] }),
  ],
  5: [
    s({ text: "New deck shuffled. Random distribution resets.", tags: ['statistical'] }),
  ],
  All: [
    s({ text: "Cards are dealt. Let's see what we're workin' with.", tags: ['reactionary'] }),
    s({ text: "New hand, new hopes.", tags: ['reactionary'] }),
    s({ text: "Shuffle and deal. Here we go again.", tags: ['reactionary'] }),
  ],
};

/** Announcer beats — ring announcer calls for big moments. */
export const ANNOUNCER_BEATS: Record<string, BanterLine[]> = {
  // Triggered on DealComplete
  deal: [
    { text: "LADIES AND GENTLEMEN, let's get ready to deal!", priority: 'high', tags: ['announcer'] },
    { text: "Welcome to another hand of Country Time Spades!", priority: 'high', tags: ['announcer'] },
    { text: "Bid it up! The cards are live!", priority: 'high', tags: ['announcer'] },
  ],

  // Triggered on Set
  set: [
    { text: "SET! The house fell down!", priority: 'high', tags: ['announcer'] },
    { text: "GONE! That team went set!", priority: 'high', tags: ['announcer'] },
  ],

  // Triggered on Boston
  boston: [
    { text: "BOSTON! Thirteen for nothing! UNBELIEVABLE!", priority: 'high', tags: ['announcer'] },
    { text: "CLEAN SWEEP! A BOSTON! The rarest hand in the game!", priority: 'high', tags: ['announcer'] },
  ],

  // Triggered on GameOver
  gameOver: [
    { text: "And that's the game! What a hand of Spades!", priority: 'high', tags: ['announcer'] },
    { text: "Game over! The winning team takes it all!", priority: 'high', tags: ['announcer'] },
  ],

  // Triggered on NilMade
  nilMade: [
    { text: "NIL MADE! Zero tricks! The audacity pays off!", priority: 'high', tags: ['announcer'] },
  ],

  // Triggered on NilCaught
  nilCaught: [
    { text: "NIL CAUGHT! Took a trick and took a LIE!", priority: 'high', tags: ['announcer'] },
  ],

  // Triggered on BagThresholdHit
  bagThreshold: [
    { text: "IN THE HOLE! Bag penalty activated!", priority: 'high', tags: ['announcer'] },
  ],

  // Generic play commentary
  spadeBreak: [
    { text: "SPADES BREAK! Trump is in play!", priority: 'high', tags: ['announcer'] },
  ],
};

/** General reactions — any event that doesn't have specific phrases. */
export const GENERAL_REACTION: PhraseBank = {
  0: [
    s({ text: "Interesting play.", tags: ['reactionary', 'wise'] }),
    s({ text: "We'll see how that plays out.", tags: ['reactionary', 'deadpan'] }),
  ],
  1: [
    s({ text: "Oh yeah! Now THAT's energy!", tags: ['reactionary', 'trashTalk'] }),
    s({ text: "Ooooh, now we talkin'!", tags: ['reactionary', 'trashTalk'] }),
  ],
  2: [
    s({ text: "Hmm.", tags: ['reactionary', 'deadpan'] }),
    s({ text: "Okay.", tags: ['reactionary', 'deadpan'] }),
  ],
  3: [
    s({ text: "Well, well, well.", tags: ['reactionary', 'teasing'] }),
    s({ text: "Look at that.", tags: ['reactionary', 'teasing'] }),
  ],
  4: [
    s({ text: "Ooooh! What happened?!", tags: ['reactionary', 'earnest'] }),
    s({ text: "Wait, what just happened?", tags: ['reactionary', 'earnest'] }),
  ],
  5: [
    s({ text: "Fascinating development.", tags: ['reactionary', 'statistical'] }),
    s({ text: "Now THAT'S an interesting variable.", tags: ['reactionary', 'statistical'] }),
  ],
  All: [
    s({ text: "Oof.", tags: ['reactionary'] }),
    s({ text: "Well, that happened.", tags: ['reactionary'] }),
    s({ text: "Look at that go!", tags: ['reactionary'] }),
  ],
};
