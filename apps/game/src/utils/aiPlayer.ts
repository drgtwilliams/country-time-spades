/**
 * AI player — simple strategy for M2.
 *
 * M2 AI:
 * 1. Bidding: greedy — counts high cards, estimates tricks
 * 2. Playing: high-card strategy when following suit,
 *    plays trumps when unable to follow, avoids breaking spades
 * 3. Bluff: no — plays straight but with delays for readability
 *
 * M3: relationship-aware strategy, personality-driven decisions.
 */

import {
  legalActions,
  currentActor,
  type GameState,
  type Action,
  type BidAction,
  type Seat,
  type CardId,
  cardIndex,
  isJoker,
  isTrump,
} from 'engine';
import type { Card } from 'engine';

/** AI difficulty presets for M2. */
export interface AIConfig {
  /** Play speed in ms (default 1500). */
  playDelay: number;
  /** Randomness in bidding (0 = deterministic, 1 = fully random). */
  bidNoise: number;
  /** Whether AI can break spades (true = smart, false = dumb). */
  smartBreak: boolean;
}

export const DEFAULT_AI_CONFIG: AIConfig = {
  playDelay: 1500,
  bidNoise: 0.1,
  smartBreak: true,
};

/**
 * Generate a bid for a seat based on their hand.
 *
 * Strategy: count sure tricks (high cards, trumps) and bid
 * with a small safety margin.
 */
export function aiBid(state: GameState, seat: Seat): BidAction {
  const hand = state.hands[seat];
  if (!hand || hand.length === 0) {
    return { type: 'Bid', kind: 'number', amount: 1 };
  }

  const cards = hand.map((id) => state.cards.get(id)).filter((c): c is Card => !!c);

  // Count high cards (Aces and Kings)
  let highCards = 0;
  let trumpCards = 0;

  for (const card of cards) {
    if (isJoker(card)) {
      trumpCards += 1; // Jokers are always strong
    } else if (isTrump(card, state.config)) {
      trumpCards += 1;
    }
    if (card.rank >= 14) highCards += 1; // Aces
    if (card.rank >= 13) highCards += 1; // Kings (double count with Aces)
  }

  // Estimate tricks: each Ace ≈ 1 trick, each trump ≈ 0.6, Kings ≈ 0.3
  const estimatedTricks = Math.min(
    9,
    Math.round(highCards * 0.4 + trumpCards * 0.5),
  );

  // Add some noise
  const noise = Math.round((Math.random() - 0.5) * 2 * DEFAULT_AI_CONFIG.bidNoise);
  const bid = Math.max(0, Math.min(9, estimatedTricks + noise));

  // Occasionally go nil with a very strong hand (few high cards = good for nil)
  if (estimatedTricks <= 1 && state.config.allowNil && Math.random() > 0.7) {
    return { type: 'Bid', kind: 'nil', amount: 0 };
  }

  return { type: 'Bid', kind: 'number', amount: bid };
}

/**
 * Choose a card to play for AI.
 *
 * Strategy:
 * 1. If can follow suit: play highest winning card, or lowest if losing
 * 2. If can't follow:Trump it if winning, otherwise discard lowest
 * 3. Never break spades unless required (smartBreak)
 * 4. Nil bidders avoid winning tricks
 */
export function aiPlayCard(state: GameState, seat: Seat): CardId | null {
  const legal = legalActions(state);
  const playActions = legal.filter((a): a is import('engine').PlayAction => a.type === 'Play');

  if (playActions.length === 0) return null;

  const hand = state.hands[seat];
  const actor = currentActor(state);

  // Only play if it's this AI's turn
  if (actor !== seat) return null;

  const bid = state.bids.find((b) => b.seat === seat);
  const isNilBidder = bid && (bid.kind === 'nil' || bid.kind === 'blindNil');

  // Is this the lead (first play in the trick)?
  const isLead = !state.currentTrick || state.currentTrick.plays.length === 0;

  if (isLead) {
    return aiLeadCard(state, seat, playActions, isNilBidder);
  }

  return aiFollowCard(state, seat, playActions, isNilBidder);
}

/** Choose the opening card for a trick. */
function aiLeadCard(
  state: GameState,
  seat: Seat,
  legal: import('engine').PlayAction[],
  isNilBidder: boolean,
): CardId {
  if (isNilBidder) {
    // Nil bidder: lead low cards to avoid winning
    const sorted = sortCards(legal.map((a) => a.cardId), state.cards);
    return sorted[0] ?? legal[0]?.cardId ?? '';
  }

  // Number bidder: lead trumps or high cards
  const trumpCards = legal
    .filter((a) => {
      const card = state.cards.get(a.cardId);
      return card && !isJoker(card) && isTrump(card, state.config);
    })
    .map((a) => a.cardId);

  if (trumpCards.length > 0) {
    // Lead highest trump
    const sorted = sortCards(trumpCards, state.cards);
    return sorted[sorted.length - 1] ?? trumpCards[0]!;
  }

  // No trumps — lead highest non-spade card
  const nonSpades = legal.filter((a) => !a.cardId.startsWith('S'));
  if (nonSpades.length > 0 && !state.spadesBroken) {
    const sorted = sortCards(nonSpades.map((a) => a.cardId), state.cards);
    return sorted[sorted.length - 1] ?? nonSpades[0]?.cardId ?? '';
  }

  // Default: lead lowest card
  const sorted = sortCards(legal.map((a) => a.cardId), state.cards);
  return sorted[0] ?? legal[0]?.cardId ?? '';
}

/** Choose a card to play when following a trick. */
function aiFollowCard(
  state: GameState,
  seat: Seat,
  legal: import('engine').PlayAction[],
  isNilBidder: boolean,
): CardId {
  if (!state.currentTrick || state.currentTrick.plays.length === 0) {
    // No trick yet, just lead
    const sorted = sortCards(legal.map((a) => a.cardId), state.cards);
    return sorted[0] ?? legal[0]?.cardId ?? '';
  }

  const ledSuit = getLedSuit(state);
  const canFollow = legal.filter((a) => {
    const card = state.cards.get(a.cardId);
    return card && !isJoker(card) && card.suit === ledSuit;
  });

  if (canFollow.length > 0) {
    // Can follow suit
    if (isNilBidder) {
      // Nil bidder: play lowest card of led suit
      const sorted = sortCards(canFollow.map((a) => a.cardId), state.cards);
      return sorted[0] ?? canFollow[0]?.cardId ?? '';
    }

    // Number bidder: try to win if we have the winning card
    const winnerSeat = getTrickWinner(state);
    const isWinning = winnerSeat === seat;

    if (isWinning) {
      // We're winning: play highest to bank it
      const sorted = sortCards(canFollow.map((a) => a.cardId), state.cards);
      return sorted[sorted.length - 1] ?? canFollow[0]?.cardId ?? '';
    }

    // Losing: play lowest
    const sorted = sortCards(canFollow.map((a) => a.cardId), state.cards);
    return sorted[0] ?? canFollow[0]?.cardId ?? '';
  }

  // Can't follow suit — can we trump?
  const trumpCards = legal.filter((a) => {
    const card = state.cards.get(a.cardId);
    return card && !isJoker(card) && isTrump(card, state.config);
  });

  if (trumpCards.length > 0 && !isNilBidder) {
    // Trump with lowest winning trump, or lowest trump if losing
    const sorted = sortCards(trumpCards.map((a) => a.cardId), state.cards);
    return sorted[0] ?? trumpCards[0]?.cardId ?? '';
  }

  // Can't follow or trump — discard
  if (isNilBidder) {
    // Nil bidder: discard highest (don't want to accidentally win)
    const sorted = sortCards(legal.map((a) => a.cardId), state.cards);
    return sorted[sorted.length - 1] ?? legal[0]?.cardId ?? '';
  }

  // Number bidder: discard lowest
  const sorted = sortCards(legal.map((a) => a.cardId), state.cards);
  return sorted[0] ?? legal[0]?.cardId ?? '';
}

/** Get the suit led in the current trick. */
function getLedSuit(state: GameState): import('engine').Suit | null {
  if (!state.currentTrick || state.currentTrick.plays.length === 0) return null;
  const firstPlay = state.currentTrick.plays[0];
  const card = state.cards.get(firstPlay.cardId);
  if (!card || isJoker(card)) return null;
  return card.suit;
}

/** Get the current trick winner (or null if not determined). */
function getTrickWinner(state: GameState): Seat | null {
  if (!state.currentTrick) return null;
  const plays = state.currentTrick.plays;
  if (plays.length === 0) return null;

  // Find winning play using engine's trick winner logic
  const playsWithCards = plays.map((p) => ({
    seat: p.seat,
    card: state.cards.get(p.cardId),
  }));

  // Simple trick winner: highest trump or highest led suit
  let winnerSeat = plays[0].seat;
  let winningCard = playsWithCards[0]?.card;

  for (const play of playsWithCards.slice(1)) {
    if (!play.card || !winningCard) continue;

    const winningIsTrump = !isJoker(winningCard) && isTrump(winningCard, state.config);
    const playIsTrump = !isJoker(play.card) && isTrump(play.card, state.config);

    if (playIsTrump && !winningIsTrump) {
      winnerSeat = play.seat;
      winningCard = play.card;
    } else if (playIsTrump && winningIsTrump) {
      // Both trump: higher rank wins
      if (play.card.rank > winningCard.rank) {
        winnerSeat = play.seat;
        winningCard = play.card;
      }
    } else if (!playIsTrump && !winningIsTrump && play.card.suit === winningCard.suit) {
      // Both led suit: higher rank wins
      if (play.card.rank > winningCard.rank) {
        winnerSeat = play.seat;
        winningCard = play.card;
      }
    }
  }

  return winnerSeat;
}

/** Sort card IDs by rank (low to high). */
function sortCards(cardIds: CardId[], cards: Map<CardId, import('engine').Card>): CardId[] {
  return [...cardIds].sort((a, b) => {
    const cardA = cards.get(a);
    const cardB = cards.get(b);
    if (!cardA || !cardB) return 0;

    // Jokers highest
    if (isJoker(cardA) && !isJoker(cardB)) return 1;
    if (!isJoker(cardA) && isJoker(cardB)) return -1;

    // Compare by rank
    return cardA.rank - cardB.rank;
  });
}

/**
 * Get the delay (in ms) for this AI's next play.
 * Adds randomness to feel natural.
 */
export function getPlayDelay(config: AIConfig = DEFAULT_AI_CONFIG): number {
  const base = config.playDelay;
  const jitter = Math.round((Math.random() - 0.5) * 1000);
  return Math.max(500, Math.min(5000, base + jitter));
}
