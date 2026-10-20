/**
 * applyAction — the core state machine.
 *
 * Pure, immutable state transitions. Wrong actor → WRONG_ACTOR,
 * wrong phase → WRONG_PHASE, not in legal set → ILLEGAL_ACTION.
 */

import type { Seat, Team, CardId, Card, Suit } from './types';
import type { GameState, BidRecord, PlayRecord, MutState } from './state';
import type { Action, BidAction, ExchangeAction, PlayAction } from './actions';
import type { EngineEvent, DealCompleteEvent } from './events';
import { EngineError } from './config';
import { teamOf } from './types';
import { cloneState, freezeState, dealCards } from './state';
import { currentActor } from './actions';
import { isJoker, isTrump, trickWinner } from './deck';
import { scoreHand } from './score';
import { checkGameOver } from './flow';
import { canFollowLed } from './rene';
import { nextSeat } from './types';

/**
 * Apply an action to the game state, returning the new state and events.
 *
 * Never mutates the input state.
 */
export function applyAction(state: GameState, action: Action): { state: GameState; events: EngineEvent[] } {
  const actor = currentActor(state);
  if (actor === null) {
    throw new EngineError('WRONG_ACTOR', 'No actor for current phase');
  }

  if (action.type === 'NextHand' && state.phase !== 'handOver') {
    throw new EngineError('WRONG_PHASE', `NextHand requires phase handOver, got ${state.phase}`);
  }
  if (action.type !== 'NextHand' && state.phase === 'handOver') {
    throw new EngineError('WRONG_PHASE', `Expected Bid/Exchange/Play in phase ${state.phase}`);
  }

  const ms = cloneState(state);
  const events: EngineEvent[] = [];

  switch (action.type) {
    case 'Bid':
      applyBid(ms, action, actor, events);
      break;
    case 'Exchange':
      applyExchange(ms, action, actor, events);
      break;
    case 'Play':
      applyPlay(ms, action, actor, events);
      break;
    case 'NextHand':
      return nextHand(ms);
  }

  return { state: freezeState(ms), events };
}

/* ------------------------------------------------------------------ */
/*  Bidding                                                            */
/* ------------------------------------------------------------------ */

function applyBid(ms: MutState, action: BidAction, seat: Seat, events: EngineEvent[]): void {
  ms.bids.push({ seat, kind: action.kind, amount: action.amount });

  if (action.kind === 'number') {
    events.push({ type: 'BidMade', seat, amount: action.amount, kind: 'number' });
  } else if (action.kind === 'nil') {
    events.push({ type: 'NilDeclared', seat, blind: false });
  } else {
    events.push({ type: 'BlindNilDeclared', seat, blind: true });
  }

  if (ms.bids.length === 4) {
    const blindNilSeats: Seat[] = [];
    for (const bid of ms.bids) {
      if (bid.kind === 'blindNil') blindNilSeats.push(bid.seat);
    }

    if (blindNilSeats.length > 0 && ms.kitty.length === 2) {
      blindNilSeats.sort((a, b) => {
        const dA = ((a - ms.dealer + 4) % 4);
        const dB = ((b - ms.dealer + 4) % 4);
        return dA - dB;
      });
      ms.pendingExchange = blindNilSeats;
      ms.phase = 'exchanging';
    } else {
      ms.phase = 'playing';
    }
  }
}

/* ------------------------------------------------------------------ */
/*  Exchange                                                           */
/* ------------------------------------------------------------------ */

function applyExchange(ms: MutState, action: ExchangeAction, seat: Seat, _events: EngineEvent[]): void {
  const outSet = new Set(action.out);
  const newHand: CardId[] = [];

  for (const c of ms.hands[seat]) {
    if (!outSet.has(c)) newHand.push(c);
  }
  for (const c of ms.kitty) {
    newHand.push(c);
  }

  ms.hands[seat as number] = newHand;
  ms.kitty = [...action.out];

  ms.pendingExchange = ms.pendingExchange.filter((s) => s !== seat);

  if (ms.pendingExchange.length === 0) {
    ms.phase = 'playing';
  }
}

/* ------------------------------------------------------------------ */
/*  Play                                                               */
/* ------------------------------------------------------------------ */

function applyPlay(ms: MutState, action: PlayAction, seat: Seat, events: EngineEvent[]): void {
  const cardId = action.cardId;

  // Remove card from hand
  const handIdx = seat as number;
  ms.hands[handIdx] = ms.hands[handIdx]!.filter((c) => c !== cardId);

  const play: PlayRecord = { seat, cardId };

  if (!ms.currentTrick || ms.currentTrick.plays.length === 0) {
    ms.currentTrick = { leadSeat: seat, plays: [play] };
  } else {
    ms.currentTrick = { leadSeat: ms.currentTrick.leadSeat, plays: [...ms.currentTrick.plays, play] };
  }

  // Spade break
  const card = ms.cards.get(cardId);
  if (card && !ms.spadesBroken && isTrump(card, ms.config)) {
    ms.spadesBroken = true;
    events.push({ type: 'BreakSpades', seat, card: cardId });
  }

  if (ms.currentTrick.plays.length === 4) {
    completeTrick(ms, events);
  }
}

/* ------------------------------------------------------------------ */
/*  Trick completion                                                   */
/* ------------------------------------------------------------------ */

function completeTrick(ms: MutState, events: EngineEvent[]): void {
  const trickNum = ms.trickCount + 1;
  const plays = ms.currentTrick!.plays;

  // Build cards array for trickWinner
  const playsWithCards: { seat: Seat; card: Card }[] = plays.map((p) => ({
    seat: p.seat,
    card: ms.cards.get(p.cardId)!,
  }));

  const winner = trickWinner(playsWithCards, ms.config);
  ms.trickWins[winner as number]!++;
  ms.trickCount++;

  // Bag detection
  const winnerBid = ms.bids.find((b) => b.seat === winner);
  const isNil = winnerBid && (winnerBid.kind === 'nil' || winnerBid.kind === 'blindNil');
  const wTeam = teamOf(winner);
  const board = teamBoard(ms.bids, wTeam);
  const teamTricks = teamTricksNonNil(ms.trickWins, ms.bids, wTeam);
  const wasBag = !isNil && board > 0 && teamTricks > board;

  // Spike detection: winner's partner won the previous trick
  let prevWinner: Seat | null = null;
  for (let i = events.length - 1; i >= 0; i--) {
    if (events[i]!.type === 'TrickWon') {
      prevWinner = (events[i] as EngineEvent & { type: 'TrickWon' }).winner;
      break;
    }
  }
  const spiked = prevWinner !== null && teamOf(prevWinner) === wTeam && prevWinner !== winner;

  events.push({ type: 'TrickWon', trick: trickNum, winner, wasBag, spiked });

  // Winner leads next
  ms.currentTrick = { leadSeat: winner, plays: [] };

  // Renege check (penalty mode)
  if (ms.config.rene === 'penalty') {
    const ledSuit = getLedSuit(plays, ms.cards);
    if (ledSuit) {
      for (const p of plays) {
        if (isRenegeCheck(ms, p.seat, p.cardId, ledSuit)) {
          if (!ms.reneSeats.includes(p.seat)) {
            ms.reneSeats.push(p.seat);
            events.push({ type: 'RenegeDetected', seat: p.seat, trick: trickNum });
          }
        }
      }
    }
  }

  // 13th trick → score hand
  if (ms.trickCount === 13) {
    scoreHandComplete(ms, events);
  }
}

function getLedSuit(plays: readonly PlayRecord[], cards: ReadonlyMap<CardId, Card>): Suit | null {
  for (const p of plays) {
    const c = cards.get(p.cardId);
    if (c && !isJoker(c)) return c.suit;
  }
  return null;
}

function isRenegeCheck(ms: MutState, seat: Seat, cardId: CardId, ledSuit: Suit): boolean {
  // Can the player follow ledSuit?
  let canFollow = false;
  for (const cid of ms.hands[seat]) {
    const c = ms.cards.get(cid);
    if (c && !isJoker(c) && !isTrump(c, ms.config) && c.suit === ledSuit) {
      canFollow = true;
      break;
    }
  }
  if (!canFollow) return false;

  const card = ms.cards.get(cardId);
  if (!card) return false;
  if (isJoker(card)) return true;
  return card.suit !== ledSuit;
}

function scoreHandComplete(ms: MutState, events: EngineEvent[]): void {
  const gs = freezeState(ms);
  const hs = scoreHand(gs);

  ms.scores = hs.scoresAfter;
  ms.bagCount = hs.bagCarry;
  events.push(...hs.events);

  // Boston check
  for (let s = 0; s < 4; s++) {
    if (ms.trickWins[s] === 13) {
      events.push({ type: 'Boston', seat: s as Seat });
    }
  }

  // Game over?
  const go = checkGameOver(freezeState(ms));
  if (go) {
    ms.gameOver = go;
    ms.phase = 'gameOver';
    events.push({ type: 'GameOver', winningTeam: go.winningTeam, scores: [ms.scores[0], ms.scores[1]] });
  } else {
    ms.phase = 'handOver';
  }
}

/* ------------------------------------------------------------------ */
/*  NextHand                                                           */
/* ------------------------------------------------------------------ */

function nextHand(ms: MutState): { state: GameState; events: EngineEvent[] } {
  const handNumber = ms.handNumber + 1;
  const dealer = ((ms.dealer + 1) % 4) as Seat;

  const { hands, kitty } = dealCards(ms.config, ms.seed, handNumber, dealer);

  ms.handNumber = handNumber;
  ms.dealer = dealer;
  ms.phase = 'bidding';
  ms.hands = hands;
  ms.kitty = kitty;
  ms.bids = [];
  ms.pendingExchange = [];
  ms.trickWins = [0, 0, 0, 0];
  ms.spadesBroken = false;
  ms.currentTrick = null;
  ms.trickCount = 0;
  ms.reneSeats = [];

  const dealEvent: DealCompleteEvent = { type: 'DealComplete', dealer };
  ms.events.push(dealEvent);

  return { state: freezeState(ms), events: [dealEvent] };
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function teamBoard(bids: readonly BidRecord[], team: Team): number {
  let board = 0;
  for (const bid of bids) {
    if (teamOf(bid.seat) !== team) continue;
    if (bid.kind === 'number') board += bid.amount;
  }
  return board;
}

function teamTricksNonNil(trickWins: [number, number, number, number], bids: readonly BidRecord[], team: Team): number {
  let total = 0;
  for (let s = 0; s < 4; s++) {
    if (teamOf(s as Seat) !== team) continue;
    const bid = bids.find((b) => b.seat === (s as Seat));
    if (bid && (bid.kind === 'nil' || bid.kind === 'blindNil')) continue;
    total += trickWins[s]!;
  }
  return total;
}
