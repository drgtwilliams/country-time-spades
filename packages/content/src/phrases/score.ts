/**
 * Score event phrases — set, bag threshold, milestone, game over.
 */

import type { BanterLine, PhraseBank } from './types';
import type { Seat, Team } from 'engine';

const s = (line: BanterLine): BanterLine => line;

/** Set (under) penalty — team went set (didn't meet board). */
export const SET: PhraseBank = {
  0: [
    s({ text: "Set. Ain't no shame in it. We'll get 'em next hand.", tags: ['wise'] }),
    s({ text: "Set. That's a learning experience.", tags: ['deadpan'] }),
  ],
  1: [
    s({ text: "SET! Y'all can't handle the pressure!", tags: ['trashTalk'] }),
    s({ text: "That's what I'm talkin' about! We goin' somewhere!", tags: ['trashTalk'] }),
    s({ text: "Set! We about to break them!", tags: ['trashTalk'] }),
  ],
  2: [
    s({ text: "Set. Whatever.", tags: ['deadpan'] }),
    s({ text: "Mm. Back to work.", tags: ['deadpan'] }),
  ],
  3: [
    s({ text: "Set? Y'all better step it up.", tags: ['teasing'] }),
    s({ text: "Set. That's on y'all, not me.", tags: ['teasing', 'deadpan'] }),
  ],
  4: [
    s({ text: "Set? …Did we just go set?", tags: ['earnest', 'reactionary'] }),
    s({ text: "Oh no. What does set mean again?", tags: ['earnest'] }),
  ],
  5: [
    s({ text: "Set penalty. Under-performed by three tricks.", tags: ['statistical', 'deadpan'] }),
    s({ text: "That's below expected output.", tags: ['statistical'] }),
  ],
  All: [
    s({ text: "SET! Big fat set!", tags: ['reactionary', 'trashTalk'] }),
    s({ text: "Y'all went set. Oof.", tags: ['teasing'] }),
    s({ text: "Set. That hurts.", tags: ['reactionary'] }),
  ],
};

/** Bag threshold hit — team hit the bag penalty. */
export const BAG_THRESHOLD_HIT: PhraseBank = {
  0: [
    s({ text: "Bags. We in the hole, but we diggin' out.", tags: ['wise'] }),
    s({ text: "Bag penalty. That stings.", tags: ['deadpan'] }),
  ],
  1: [
    s({ text: "Bags! Y'all are in the HOLE!", tags: ['trashTalk'] }),
    s({ text: "Bag after bag! That's a penalty, baby!", tags: ['trashTalk'] }),
  ],
  2: [
    s({ text: "Bags. In the hole.", tags: ['deadpan'] }),
  ],
  3: [
    s({ text: "Bags, bags, bags. That's a whole lot of extra tricks.", tags: ['teasing'] }),
  ],
  4: [
    s({ text: "In the hole? Is that bad?", tags: ['earnest'] }),
    s({ text: "Bag penalty… so that's points off?", tags: ['earnest'] }),
  ],
  5: [
    s({ text: "Bag threshold hit. Penalty applied.", tags: ['statistical'] }),
    s({ text: "That's the 10-bag mark. Score adjustment.", tags: ['statistical', 'deadpan'] }),
  ],
  All: [
    s({ text: "In the hole! Oof.", tags: ['reactionary'] }),
    s({ text: "Bag penalty. That's expensive.", tags: ['reactionary'] }),
    s({ text: "Y'all really collected a whole bunch of bags.", tags: ['teasing'] }),
  ],
};

/** Score milestone — team goes in the hole or out the hole. */
export const SCORE_MILESTONE: PhraseBank = {
  0: [
    s({ text: "In the hole. But we comin' back from worse.", tags: ['wise'] }),
    s({ text: "We out the hole! Time to ride this wave.", tags: ['teasing'] }),
  ],
  1: [
    s({ text: "IN THE HOLE! Y'all are down bad!", tags: ['trashTalk'] }),
    s({ text: "OUT THE HOLE! We on our way!", tags: ['trashTalk'] }),
  ],
  2: [
    s({ text: "In the hole. Back to zero.", tags: ['deadpan'] }),
  ],
  3: [
    s({ text: "Out the hole. About time.", tags: ['teasing'] }),
  ],
  4: [
    s({ text: "We in the hole! …Wait, does that mean we're doing good?", tags: ['earnest'] }),
    s({ text: "Out the hole! Okay, I'm feelin' optimistic!", tags: ['earnest', 'reactionary'] }),
  ],
  5: [
    s({ text: "Score crossed zero. In the hole. That's a positive milestone.", tags: ['statistical'] }),
    s({ text: "We're out. That means we've surpassed the penalty zone.", tags: ['statistical', 'deadpan'] }),
  ],
  All: [
    s({ text: "In the hole! That's a milestone right there.", tags: ['reactionary'] }),
    s({ text: "Out the hole! Things are lookin' up!", tags: ['reactionary', 'trashTalk'] }),
    s({ text: "That's a score to remember.", tags: ['reactionary'] }),
  ],
};

/** Game over — someone won. */
export const GAME_OVER: PhraseBank = {
  0: [
    s({ text: "Game over. We did it. Another hand in the books.", tags: ['wise'] }),
    s({ text: "That's a win. Steady play pays off.", tags: ['deadpan'] }),
  ],
  1: [
    s({ text: "GAME OVER! We took the whole table!", tags: ['trashTalk'] }),
    s({ text: "That's it! That's the game! Victory!", tags: ['trashTalk'] }),
  ],
  2: [
    s({ text: "Game over. We played. That's enough.", tags: ['deadpan'] }),
  ],
  3: [
    s({ text: "Game over. That was a good game. Let's go again.", tags: ['teasing'] }),
  ],
  4: [
    s({ text: "We won?! Actually won?!", tags: ['earnest', 'reactionary'] }),
    s({ text: "Game over! I'm still not sure how that happened but I'm happy.", tags: ['earnest'] }),
  ],
  5: [
    s({ text: "Target score reached. Game complete. Win probability: 100%.", tags: ['statistical', 'deadpan'] }),
  ],
  All: [
    s({ text: "Game over! That was a good one.", tags: ['reactionary', 'trashTalk'] }),
    s({ text: "And that's the game. Handshakes all around.", tags: ['reactionary'] }),
    s({ text: "Winner winner, chicken dinner.", tags: ['reactionary', 'teasing'] }),
  ],
};

/** Nil made — nil bidder succeeded. */
export const NIL_MADE: PhraseBank = {
  0: [
    s({ text: "Nil made. Told y'all I knew what I was doin'.", tags: ['wise'] }),
    s({ text: "Zero tricks. That's the plan.", tags: ['deadpan'] }),
  ],
  1: [
    s({ text: "NIL MADE! That's what I call a power play!", tags: ['trashTalk'] }),
    s({ text: "Zero! Didn't even try! Pathetic… for the other team!", tags: ['trashTalk'] }),
  ],
  2: [
    s({ text: "Nil made. Yeah.", tags: ['deadpan'] }),
  ],
  3: [
    s({ text: "Nil made. Don't get used to it.", tags: ['teasing'] }),
  ],
  4: [
    s({ text: "I made my nil! …Wait, that's good right?", tags: ['earnest'] }),
    s({ text: "Zero tricks! I did it!", tags: ['earnest', 'reactionary'] }),
  ],
  5: [
    s({ text: "Nil completed. Zero tricks taken. Consistent with probability.", tags: ['statistical'] }),
  ],
  All: [
    s({ text: "NIL MADE! That's impressive!", tags: ['reactionary', 'trashTalk'] }),
    s({ text: "Zero tricks. Clean as a whistle.", tags: ['reactionary'] }),
    s({ text: "That's a clean nil. Respect.", tags: ['teasing'] }),
  ],
};

/** Nil caught — nil bidder failed. */
export const NIL_CAUGHT: PhraseBank = {
  0: [
    s({ text: "Nil caught. Ain't no shame. We'll adjust.", tags: ['wise'] }),
    s({ text: "One trick too many. Nil caught.", tags: ['deadpan'] }),
  ],
  1: [
    s({ text: "NIL CAUGHT! That's what you get for talkin' big!", tags: ['trashTalk'] }),
    s({ text: "Caught red-handed! Took a trick! That's a penalty!", tags: ['trashTalk'] }),
  ],
  2: [
    s({ text: "Nil caught. Lesson learned.", tags: ['deadpan'] }),
  ],
  3: [
    s({ text: "Nil caught. Hope y'all enjoy the penalty.", tags: ['teasing'] }),
  ],
  4: [
    s({ text: "I took a trick… does that mean I failed?", tags: ['earnest'] }),
    s({ text: "Nil caught? I thought I was doin' good!", tags: ['earnest', 'reactionary'] }),
  ],
  5: [
    s({ text: "Nil failed. Took one trick. Penalty applied.", tags: ['statistical', 'deadpan'] }),
  ],
  All: [
    s({ text: "NIL CAUGHT! Yikes!", tags: ['reactionary', 'trashTalk'] }),
    s({ text: "Took a trick. That's the worst thing that can happen on nil.", tags: ['reactionary'] }),
    s({ text: "Oof. Nil caught. That hurts the whole team.", tags: ['teasing'] }),
  ],
};

/** Boston — someone took all 13 tricks. */
export const BOSTON: PhraseBank = {
  0: [
    s({ text: "Boston! Took every single trick. I ain't seen that in years.", tags: ['wise', 'reactionary'] }),
  ],
  1: [
    s({ text: "BOSTON! THIRTEEN THIRTEEN! THAT'S A CLEAN SWEEP!", tags: ['trashTalk'] }),
    s({ text: "All thirteen! Nobody's done that in a while! Boston!", tags: ['trashTalk'] }),
  ],
  2: [
    s({ text: "Boston. Thirteen for nothing. Yeah.", tags: ['deadpan'] }),
  ],
  3: [
    s({ text: "Boston. That's… actually impressive.", tags: ['teasing'] }),
  ],
  4: [
    s({ text: "Wait, Boston means they got ALL the tricks? All thirteen?!", tags: ['earnest', 'reactionary'] }),
  ],
  5: [
    s({ text: "Boston. Thirteen tricks, zero losses. Probability: approximately zero.", tags: ['statistical', 'deadpan'] }),
  ],
  All: [
    s({ text: "BOSTON! CLEAN SWEEP! Thirteen for nothing!", tags: ['reactionary', 'trashTalk'] }),
    s({ text: "Nobody's seen a Boston in ages!", tags: ['reactionary'] }),
    s({ text: "THIRTEEN! That's the rarest hand in Spades!", tags: ['trashTalk'] }),
  ],
};
