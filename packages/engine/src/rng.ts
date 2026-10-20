/**
 * Seeded random number generation.
 *
 * Deterministic PRNG using Mulberry32; all randomness is injected
 * via seeded `Rng` instances — no `Math.random`, `Date`, or I/O.
 */

export interface Rng {
  /** Return a float in [0, 1). */
  next(): number;
}

/**
 * Mulberry32 pseudo-random number generator.
 * @param seed - A 32-bit integer seed.
 * @returns An `Rng` instance producing deterministic sequences.
 */
export function mulberry32(seed: number): Rng {
  let s = seed | 0;
  return {
    next() {
      s = (s + 0x6d2b79f5) | 0;
      let t = s ^ (s >>> 15);
      t = Math.imul(t, 0x1d35fb2c);
      t = (t ^ (t >>> 13));
      t = Math.imul(t, 49364773);
      const result = (t ^ (t >>> 16)) / 4294967296;
      return result < 0 ? 0 : result;
    },
  };
}

/**
 * Convert a string to a 32-bit hash (xmur3-style).
 * @param s - The string to hash.
 * @returns A 32-bit integer hash.
 */
export function hashString(s: string): number {
  let h1 = 0xdeadbeef;
  let h2 = 0x41c6ce57;
  for (let i = 0; i < s.length; i++) {
    const ch = s.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507);
  h1 ^= Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507);
  h2 ^= Math.imul(h1 ^ (h1 >>> 13), 3266489909);

  h1 = h1 >>> 0;
  h2 = h2 >>> 0;

  // Add a carry bit to reduce collision between similar seeds
  const sum = (h1 + h2) >>> 0;
  return (sum * 0x9e3779b9) >>> 0;
}

/**
 * Create a deterministic RNG for a specific hand.
 * @param seed - The base seed string.
 * @param hand - The hand number (0-indexed).
 * @returns A seeded RNG for this hand.
 */
export function rngForHand(seed: string, hand: number): Rng {
  return mulberry32(hashString(`${seed}#${hand}`));
}

/**
 * Fisher-Yates shuffle: returns a new array with elements in random order.
 * @param items - The array to shuffle.
 * @param rng - The RNG to use.
 * @returns A new array with shuffled elements.
 */
export function shuffle<T>(items: readonly T[], rng: Rng): T[] {
  const copy: T[] = [];
  for (let i = 0; i < items.length; i++) {
    copy.push(items[i]!);
  }
  for (let i = copy.length - 1; i > 0; i--) {
    const j = drawInt(rng, i + 1);
    const temp = copy[j]!;
    copy[j] = copy[i]!;
    copy[i] = temp;
  }
  return copy;
}

/**
 * Draw a random integer in [0, n).
 * @param rng - The RNG to use.
 * @param n - The upper bound (exclusive).
 * @returns An integer in [0, n).
 */
export function drawInt(rng: Rng, n: number): number {
  return Math.floor(rng.next() * n);
}
