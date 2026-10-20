/**
 * Game-over and flow tests.
 */

import { describe, it, expect } from 'vitest';
import { createGame } from '../src/state';
import { checkGameOver } from '../src/flow';
import { DEFAULT_CONFIG, type GameConfig } from '../src/config';

function makeConfig(overrides: Partial<GameConfig> = {}): GameConfig {
  return { ...DEFAULT_CONFIG, ...overrides };
}

describe('checkGameOver', () => {
  it('solo team crosses target', () => {
    const state = createGame(makeConfig({ targetScore: 500 }), 'go-solo');
    state.scores = [501, 300];
    expect(checkGameOver(state)).toEqual({ winningTeam: 0 });
  });

  it('both cross: higher wins', () => {
    const state = createGame(makeConfig({ targetScore: 500 }));
    state.scores = [510, 505];
    expect(checkGameOver(state)).toEqual({ winningTeam: 0 });
  });

  it('exact tie: null (extra hand)', () => {
    const state = createGame(makeConfig({ targetScore: 500 }));
    state.scores = [500, 500];
    expect(checkGameOver(state)).toBeNull();
  });

  it('under target: null', () => {
    const state = createGame(makeConfig({ targetScore: 500 }));
    state.scores = [400, 300];
    expect(checkGameOver(state)).toBeNull();
  });
});
