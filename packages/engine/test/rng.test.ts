import { describe, it, expect } from 'vitest';
import { mulberry32, hashString, rngForHand, shuffle, drawInt } from '../src/rng';
import type { Rng } from '../src/rng';

describe('mulberry32', () => {
  it('is deterministic for same seed', () => {
    const a = mulberry32(42);
    const b = mulberry32(42);
    const resultsA: number[] = [];
    const resultsB: number[] = [];
    for (let i = 0; i < 10; i++) {
      resultsA.push(a.next());
      resultsB.push(b.next());
    }
    expect(resultsA).toEqual(resultsB);
  });

  it('different seeds diverge', () => {
    const a = mulberry32(1);
    const b = mulberry32(2);
    // Consume 10 draws from each; with different internal PRNG states
    // the sequences must diverge at some point
    const seqA: number[] = [];
    const seqB: number[] = [];
    for (let i = 0; i < 10; i++) {
      seqA.push(a.next());
      seqB.push(b.next());
    }
    expect(seqA.some((v, i) => v !== seqB[i])).toBe(true);
  });

  it('next() returns values in [0, 1)', () => {
    const rng = mulberry32(12345);
    for (let i = 0; i < 1000; i++) {
      const v = rng.next();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  it('drawInt stays in [0, n)', () => {
    const rng = mulberry32(99);
    for (let i = 0; i < 100; i++) {
      const v = drawInt(rng, 5);
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(5);
    }
  });

  it('shuffle is a permutation (same multiset, not identity on 52 cards)', () => {
    const rng = mulberry32(7777);
    const cards = Array.from({ length: 52 }, (_, i) => i);
    const shuffled = shuffle(cards, rng);
    const sorted = [...shuffled].sort((a, b) => a - b);
    expect(sorted).toEqual(cards);
    expect(shuffled).not.toEqual(cards);
  });
});

describe('rngForHand', () => {
  it('stable across calls for same seed and hand', () => {
    const a = rngForHand('test', 3);
    const b = rngForHand('test', 3);
    for (let i = 0; i < 10; i++) {
      expect(a.next()).toBe(b.next());
    }
  });

  it('differs from hand 4', () => {
    const h3 = rngForHand('test', 3);
    const h4 = rngForHand('test', 4);
    // Collect several values from each to ensure divergence
    // (individual draws from different seeds could coincidentally match)
    const seq3: number[] = [];
    const seq4: number[] = [];
    for (let i = 0; i < 100; i++) {
      seq3.push(h3.next());
      seq4.push(h4.next());
    }
    // With 100 draws from different seeds, sequences will diverge
    expect(seq3.some((v, i) => v !== seq4[i])).toBe(true);
  });
});

describe('hashString', () => {
  it('produces a number', () => {
    const h = hashString('test');
    expect(typeof h).toBe('number');
  });
});
