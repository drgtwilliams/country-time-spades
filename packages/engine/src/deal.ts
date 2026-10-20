/**
 * Dealing helpers and deal function.
 *
 * Re-exports `deal` (as `dealCards`) from state.ts.
 * `firstDealerOf` and `dealerForHand` are defined here because
 * state.ts doesn't need them (state.ts does its own inline deal).
 */

import type { Seat } from './types';
import { drawInt, rngForHand } from './rng';

export function firstDealerOf(seed: string): Seat {
  const rng = rngForHand(seed, 0);
  return (drawInt(rng, 4)) as Seat;
}

export function dealerForHand(seed: string, handNumber: number): Seat {
  return ((firstDealerOf(seed) + handNumber) % 4) as Seat;
}

export { dealCards as deal } from './state';
