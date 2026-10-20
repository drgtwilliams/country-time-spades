/**
 * Replay — fold createGame + applyAction into a deterministic stream.
 */

import type { GameConfig } from './config';
import type { GameState } from './state';
import type { Action } from './actions';
import type { EngineEvent } from './events';
import { createGame } from './state';
import { applyAction } from './apply';

/**
 * Replay a sequence of actions from a seeded game.
 *
 * @returns `{ state, events }` — final state and concatenated event stream.
 * @throws `EngineError` on the first illegal action.
 */
export function replay(
  config: GameConfig,
  seed: string,
  actions: Action[],
): { state: GameState; events: EngineEvent[] } {
  let state = createGame(config, seed);
  const allEvents: EngineEvent[] = [];

  for (const action of actions) {
    const result = applyAction(state, action);
    state = result.state;
    allEvents.push(...result.events);
  }

  return { state, events: allEvents };
}
