/**
 * Deck & trick resolution tests.
 */

import { describe, it, expect } from 'vitest';
import { buildDeck, isTrump, trumpRank, trickWinnerResolved } from '../src/deck';
import { DEFAULT_CONFIG, validateConfig, type GameConfig } from '../src/config';
import type { Card } from '../src/types';

function makeConfig(overrides: Partial<GameConfig> = {}): GameConfig {
  return { ...DEFAULT_CONFIG, ...overrides };
}

describe('buildDeck', () => {
  it('plain deck has 52 cards, no jokers', () => {
    const config = makeConfig({ deckMode: 'plain' });
    const deck = buildDeck(config);
    expect(deck).toHaveLength(52);
    expect(deck.every((c) => !c.kind)).toBe(true);
  });

  it('jokers deck has 54 cards with JB and JL', () => {
    const config = makeConfig({ deckMode: 'jokers' });
    const deck = buildDeck(config);
    expect(deck).toHaveLength(54);
    expect(deck.find((c) => c.id === 'JB')).toBeDefined();
    expect(deck.find((c) => c.id === 'JL')).toBeDefined();
  });

  it('jjdd deck has 54 cards', () => {
    const config = makeConfig({ deckMode: 'jjdd', promotedDeuces: ['C', 'D'] });
    const deck = buildDeck(config);
    expect(deck).toHaveLength(54);
  });

  it('cards are in order: spades A→2, hearts A→2, diamonds A→2, clubs A→2', () => {
    const config = makeConfig({ deckMode: 'plain' });
    const deck = buildDeck(config);
    // First 13 should be spades A down to 2
    for (let i = 0; i < 13; i++) {
      const c = deck[i] as import('../src/types').PlayingCard;
      expect(c.suit).toBe('S');
      expect(c.rank).toBe(14 - i);
    }
  });
});

describe('isTrump', () => {
  it('spades always trump', () => {
    const config = makeConfig({ deckMode: 'plain' });
    const deck = buildDeck(config);
    const spades = deck.filter((c) => !c.kind && c.suit === 'S');
    for (const c of spades) expect(isTrump(c, config)).toBe(true);
  });

  it('non-spades never trump in plain mode', () => {
    const config = makeConfig({ deckMode: 'plain' });
    const deck = buildDeck(config);
    const nonSpades = deck.filter((c) => !c.kind && c.suit !== 'S');
    for (const c of nonSpades) expect(isTrump(c, config)).toBe(false);
  });

  it('jokers trump in jokers mode', () => {
    const config = makeConfig({ deckMode: 'jokers' });
    const deck = buildDeck(config);
    const jokers = deck.filter((c) => c.kind);
    for (const c of jokers) expect(isTrump(c, config)).toBe(true);
  });

  it('jokers never trump in plain mode', () => {
    const config = makeConfig({ deckMode: 'plain' });
    const deck = buildDeck(config);
    const jokers = deck.filter((c) => c.kind);
    expect(jokers.length).toBe(0);
  });

  it('promoted deuces trump in JJDD', () => {
    const config = makeConfig({ deckMode: 'jjdd', promotedDeuces: ['C', 'D'] });
    const deck = buildDeck(config);
    const c2 = deck.find((c) => c.kind ? false : c.suit === 'C' && c.rank === 2);
    const d2 = deck.find((c) => c.kind ? false : c.suit === 'D' && c.rank === 2);
    expect(c2 && isTrump(c2, config)).toBe(true);
    expect(d2 && isTrump(d2, config)).toBe(true);
    // Non-promoted deuce should NOT be trump
    const h2 = deck.find((c) => c.kind ? false : c.suit === 'H' && c.rank === 2);
    expect(h2 && isTrump(h2, config)).toBe(false);
  });
});

describe('trumpRank', () => {
  it('returns null for non-trump cards', () => {
    const config = makeConfig({ deckMode: 'plain' });
    const deck = buildDeck(config);
    const hearts = deck.filter((c) => !c.kind && c.suit === 'H');
    for (const c of hearts) expect(trumpRank(c, config)).toBeNull();
  });

  it('full JJDD trump ladder: JB > JL > 2C > 2D > AS > ... > 2S', () => {
    const config = makeConfig({ deckMode: 'jjdd', promotedDeuces: ['C', 'D'] });
    // Check known ranks explicitly
    const deck = buildDeck(config);
    const jb = deck.find((c) => c.id === 'JB')!;
    const jl = deck.find((c) => c.id === 'JL')!;
    const as = deck.find((c) => c.id === 'S14')!;
    const ks = deck.find((c) => c.id === 'S13')!;
    const c2 = deck.find((c) => c.kind ? false : c.suit === 'C' && c.rank === 2)!;
    const d2 = deck.find((c) => c.kind ? false : c.suit === 'D' && c.rank === 2)!;
    const s2 = deck.find((c) => c.kind ? false : c.suit === 'S' && c.rank === 2)!;

    expect(trumpRank(jb, config)).toBe(100);
    expect(trumpRank(jl, config)).toBe(99);
    expect(trumpRank(c2, config)).toBe(90); // 90 - 0
    expect(trumpRank(d2, config)).toBe(89); // 90 - 1
    expect(trumpRank(as, config)).toBe(14);
    expect(trumpRank(ks, config)).toBe(13);
    expect(trumpRank(s2, config)).toBe(2);

    // Verify ordering: JB > JL > C2 > D2 > AS > ... > S2
    expect(trumpRank(jb, config)!).toBeGreaterThan(trumpRank(jl, config)!);
    expect(trumpRank(jl, config)!).toBeGreaterThan(trumpRank(c2, config)!);
    expect(trumpRank(c2, config)!).toBeGreaterThan(trumpRank(d2, config)!);
    expect(trumpRank(d2, config)!).toBeGreaterThan(trumpRank(as, config)!);
    expect(trumpRank(as, config)!).toBeGreaterThan(trumpRank(ks, config)!);
    expect(trumpRank(ks, config)!).toBeGreaterThan(trumpRank(s2, config)!);
  });
});

describe('trickWinnerResolved', () => {
  it('highest trump wins', () => {
    const config = makeConfig({ deckMode: 'jokers' });
    const deck = buildDeck(config);
    const as = deck.find((c) => c.id === 'S14')!;
    const js = deck.find((c) => c.id === 'S2')!;
    const winner = trickWinnerResolved(
      [
        { seat: 0 as import('../src/types').Seat, card: as },
        { seat: 1 as import('../src/types').Seat, card: js },
      ],
      config,
    );
    expect(winner).toBe(0);
  });

  it('highest of led suit wins when no trump played', () => {
    const config = makeConfig({ deckMode: 'plain' });
    const deck = buildDeck(config);
    const ah = deck.find((c) => c.id === 'H14')!;
    const kh = deck.find((c) => c.id === 'H13')!;
    const winner = trickWinnerResolved(
      [
        { seat: 0 as import('../src/types').Seat, card: ah },
        { seat: 1 as import('../src/types').Seat, card: kh },
      ],
      config,
    );
    expect(winner).toBe(0);
  });

  it('trump beats non-trump of led suit', () => {
    const config = makeConfig({ deckMode: 'jokers' });
    const deck = buildDeck(config);
    const ah = deck.find((c) => c.id === 'H14')!; // heart (led suit)
    const j2 = deck.find((c) => c.kind ? false : c.suit === 'S' && c.rank === 2)!; // spade (trump)
    const winner = trickWinnerResolved(
      [
        { seat: 0 as import('../src/types').Seat, card: ah },
        { seat: 1 as import('../src/types').Seat, card: j2 },
      ],
      config,
    );
    expect(winner).toBe(1); // spade wins
  });

  it('joker wins over all other trumps', () => {
    const config = makeConfig({ deckMode: 'jokers' });
    const deck = buildDeck(config);
    const jb = deck.find((c) => c.id === 'JB')!;
    const as = deck.find((c) => c.id === 'S14')!;
    const winner = trickWinnerResolved(
      [
        { seat: 0 as import('../src/types').Seat, card: jb },
        { seat: 1 as import('../src/types').Seat, card: as },
      ],
      config,
    );
    expect(winner).toBe(0);
  });

  it('non-trump cards cannot win a trick with trump played', () => {
    const config = makeConfig({ deckMode: 'jokers' });
    const deck = buildDeck(config);
    const ah = deck.find((c) => c.id === 'H14')!;
    const js = deck.find((c) => c.kind ? false : c.suit === 'S' && c.rank === 2)!;
    const jk = deck.find((c) => c.id === 'S13')!;
    // Joker trick: non-trump can never win
    const winner = trickWinnerResolved(
      [
        { seat: 0 as import('../src/types').Seat, card: ah },
        { seat: 1 as import('../src/types').Seat, card: js },
        { seat: 2 as import('../src/types').Seat, card: jk },
      ],
      config,
    );
    // Spade wins (highest trump)
    expect(winner).toBe(2); // S13 beats S2
  });
});
