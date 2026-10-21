/**
 * Phrase bank index — re-exports all phrase banks.
 */

export { NIL_DECLARED, NUMBER_BID, BLIND_NIL } from './bidding';
export type { PhraseBank } from './types';

export { SPADE_BREAK, TRICK_WON, RENEGE_DETECTED, SPADE_LEAD_PREVENTED } from './play';

export {
  SET, BAG_THRESHOLD_HIT, SCORE_MILESTONE, GAME_OVER,
  NIL_MADE, NIL_CAUGHT, BOSTON,
} from './score';

export { DEAL_COMPLETE, ANNOUNCER_BEATS, GENERAL_REACTION } from './special';
