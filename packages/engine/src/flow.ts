/**
 * Game-over check.
 */

import type { Team } from './types';
import type { GameState } from './state';

/**
 * Check if the game is over after scoring.
 *
 * @returns winningTeam if one crosses target, null for tie.
 */
export function checkGameOver(state: GameState): { winningTeam: Team } | null {
  const [s0, s1] = state.scores;
  const target = state.config.targetScore;

  const t0 = s0 >= target;
  const t1 = s1 >= target;

  if (t0 && t1) {
    if (s0 > s1) return { winningTeam: 0 as Team };
    if (s1 > s0) return { winningTeam: 1 as Team };
    return null;
  }
  if (t0) return { winningTeam: 0 as Team };
  if (t1) return { winningTeam: 1 as Team };
  return null;
}
