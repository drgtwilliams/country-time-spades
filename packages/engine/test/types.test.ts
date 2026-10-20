import { describe, it, expect } from 'vitest';
import { teamOf, nextSeat, SEATS } from '../src/types';
import type { Seat, Team } from '../src/types';

describe('teamOf', () => {
  it('maps even seats to Team 0', () => {
    expect(teamOf(0)).toBe(0 as Team);
    expect(teamOf(2)).toBe(0 as Team);
  });

  it('maps odd seats to Team 1', () => {
    expect(teamOf(1)).toBe(1 as Team);
    expect(teamOf(3)).toBe(1 as Team);
  });
});

describe('nextSeat', () => {
  it('wraps correctly', () => {
    expect(nextSeat(0)).toBe(1 as Seat);
    expect(nextSeat(1)).toBe(2 as Seat);
    expect(nextSeat(2)).toBe(3 as Seat);
    expect(nextSeat(3)).toBe(0 as Seat);
  });
});

describe('SEATS', () => {
  it('contains exactly 0, 1, 2, 3', () => {
    expect(SEATS).toEqual([0, 1, 2, 3]);
  });
});
