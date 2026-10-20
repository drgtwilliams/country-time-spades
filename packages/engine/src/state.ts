/**
 * Game state — immutable snapshot of the entire game.
 *
 * The state is a plain value type: all mutations produce a new object
 * via deep copy; no references are shared across states.
 */

import type { Seat, Team, CardId, Card } from './types';
import type { GameConfig } from './config';
import type { EngineEvent, DealCompleteEvent } from './events';
import { buildDeck } from './deck';
import { drawInt, rngForHand, shuffle } from './rng';
import { validateConfig } from './config';

/** Current phase of the game. */
export type Phase = 'bidding' | 'exchanging' | 'playing' | 'handOver' | 'gameOver';

/** A recorded bid. */
export interface BidRecord {
  readonly seat: Seat;
  readonly kind: 'number' | 'nil' | 'blindNil';
  readonly amount: number;
}

/** A recorded card play in a trick. */
export interface PlayRecord {
  readonly seat: Seat;
  readonly cardId: CardId;
}

/** A 4-element tuple of hands. */
export type Hands = [CardId[], CardId[], CardId[], CardId[]];
export type ReadonlyHands = readonly CardId[];

/* ------------------------------------------------------------------ */
/*  Mutable working copy (internal only)                               */
/* ------------------------------------------------------------------ */

export interface MutState {
  config: GameConfig;
  seed: string;
  handNumber: number;
  dealer: Seat;
  phase: Phase;
  hands: [CardId[], CardId[], CardId[], CardId[]];
  kitty: CardId[];
  bids: BidRecord[];
  pendingExchange: Seat[];
  trickWins: [number, number, number, number];
  spadesBroken: boolean;
  currentTrick: { leadSeat: Seat; plays: PlayRecord[] } | null;
  trickCount: number;
  reneSeats: Seat[];
  bagCount: [number, number];
  scores: [number, number];
  gameOver: { readonly winningTeam: Team } | null;
  events: EngineEvent[];
  cards: ReadonlyMap<CardId, Card>;
}

export function cloneState(state: GameState): MutState {
  return {
    config: state.config,
    seed: state.seed,
    handNumber: state.handNumber,
    dealer: state.dealer,
    phase: state.phase,
    hands: [
      [...state.hands[0]],
      [...state.hands[1]],
      [...state.hands[2]],
      [...state.hands[3]],
    ],
    kitty: [...state.kitty],
    bids: [...state.bids],
    pendingExchange: [...state.pendingExchange],
    trickWins: [...state.trickWins] as [number, number, number, number],
    spadesBroken: state.spadesBroken,
    currentTrick: state.currentTrick
      ? { leadSeat: state.currentTrick.leadSeat, plays: [...state.currentTrick.plays] }
      : null,
    trickCount: state.trickCount,
    reneSeats: [...state.reneSeats],
    bagCount: [...state.bagCount] as [number, number],
    scores: [...state.scores] as [number, number],
    gameOver: state.gameOver,
    events: [...state.events],
    cards: state.cards,
  };
}

export function freezeState(ms: MutState): GameState {
  return {
    config: ms.config,
    seed: ms.seed,
    handNumber: ms.handNumber,
    dealer: ms.dealer,
    phase: ms.phase,
    hands: [ms.hands[0] as readonly CardId[], ms.hands[1] as readonly CardId[], ms.hands[2] as readonly CardId[], ms.hands[3] as readonly CardId[]] as [readonly CardId[], readonly CardId[], readonly CardId[], readonly CardId[]],
    kitty: ms.kitty as readonly CardId[],
    bids: ms.bids as readonly BidRecord[],
    pendingExchange: ms.pendingExchange as readonly Seat[],
    trickWins: ms.trickWins as [number, number, number, number],
    spadesBroken: ms.spadesBroken,
    currentTrick: ms.currentTrick
      ? { leadSeat: ms.currentTrick.leadSeat, plays: ms.currentTrick.plays as readonly PlayRecord[] }
      : null,
    trickCount: ms.trickCount,
    reneSeats: ms.reneSeats as readonly Seat[],
    bagCount: ms.bagCount as [number, number],
    scores: ms.scores as [number, number],
    gameOver: ms.gameOver,
    events: ms.events as readonly EngineEvent[],
    cards: ms.cards,
  };
}

/* ------------------------------------------------------------------ */
/*  Deal logic                                                         */
/* ------------------------------------------------------------------ */

export function dealCards(
  config: GameConfig,
  seed: string,
  handNumber: number,
  dealer: Seat,
): { hands: Hands; kitty: CardId[] } {
  const deck = shuffle(buildDeck(config), rngForHand(seed, handNumber));
  const hands: Hands = [[], [], [], []];
  const startSeat = ((dealer + 1) % 4) as Seat;

  const cardsPerSeat = Math.floor(deck.length / 4);
  const totalDealt = cardsPerSeat * 4;

  for (let i = 0; i < totalDealt; i++) {
    const seat = ((startSeat + i) % 4) as Seat;
    hands[seat].push(deck[i]!.id);
  }

  const kitty = deck.slice(totalDealt).map((c) => c.id);
  return { hands, kitty };
}

/* ------------------------------------------------------------------ */
/*  createGame                                                         */
/* ------------------------------------------------------------------ */

export function cardIndex(config: GameConfig): ReadonlyMap<CardId, Card> {
  const deck = buildDeck(config);
  return new Map(deck.map((c) => [c.id, c]));
}

export function createGame(config: GameConfig, seed: string): GameState {
  validateConfig(config);

  const rng0 = rngForHand(seed, 0);
  const dealer = (drawInt(rng0, 4)) as Seat;

  const { hands, kitty } = dealCards(config, seed, 0, dealer);

  return {
    config,
    seed,
    handNumber: 0,
    dealer,
    phase: 'bidding',
    hands: [hands[0] as readonly CardId[], hands[1] as readonly CardId[], hands[2] as readonly CardId[], hands[3] as readonly CardId[]] as [readonly CardId[], readonly CardId[], readonly CardId[], readonly CardId[]],
    kitty: kitty as readonly CardId[],
    bids: [],
    pendingExchange: [],
    trickWins: [0, 0, 0, 0],
    spadesBroken: false,
    currentTrick: null,
    trickCount: 0,
    reneSeats: [],
    bagCount: [0, 0],
    scores: [0, 0],
    gameOver: null,
    events: [],
    cards: cardIndex(config),
  };
}

export function startNextHand(state: GameState): { state: GameState; events: EngineEvent[] } {
  const ms = cloneState(state);
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
/*  GameState                                                          */
/* ------------------------------------------------------------------ */

export interface GameState {
  readonly config: GameConfig;
  readonly seed: string;
  readonly handNumber: number;
  readonly dealer: Seat;
  readonly phase: Phase;
  readonly hands: [readonly CardId[], readonly CardId[], readonly CardId[], readonly CardId[]];
  readonly kitty: readonly CardId[];
  readonly bids: readonly BidRecord[];
  readonly pendingExchange: readonly Seat[];
  readonly trickWins: [number, number, number, number];
  readonly spadesBroken: boolean;
  readonly currentTrick: {
    readonly leadSeat: Seat;
    readonly plays: readonly PlayRecord[];
  } | null;
  readonly trickCount: number;
  readonly reneSeats: readonly Seat[];
  readonly bagCount: [number, number];
  readonly scores: [number, number];
  readonly gameOver: { readonly winningTeam: Team } | null;
  readonly events: readonly EngineEvent[];
  readonly cards: ReadonlyMap<CardId, Card>;
}
