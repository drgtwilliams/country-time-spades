/**
 * useGameState — React hook that wraps GameSession for the UI layer.
 *
 * Manages:
 * - Session lifecycle (create, apply actions)
 * - Bid pad state machine
 * - Card selection for trick play
 * - Legal action filtering
 *
 * M2: basic session + bid pad + card selection.
 * M3: banter events, auto-play timing, AI decision hooks.
 */

import { useState, useCallback, useMemo, useRef } from 'react';
import {
  type GameState,
  type Action,
  type BidAction,
  type PlayAction,
  type EngineEvent,
  legalActions,
  currentActor,
} from 'engine';
import { GameSession, type GameSessionOptions } from 'app-core';

export interface UseGameStateOptions {
  config: import('engine').GameConfig;
  seed: string;
  /** Seat of the human player (-1 for AI-only). */
  humanSeat?: number;
}

export interface UseGameStateReturn {
  /** Current game state. */
  state: GameState;
  /** Latest events from the session. */
  events: readonly EngineEvent[];
  /** Whether a human turn is active. */
  isHumanTurn: boolean;
  /** The human player's seat (0-3), or -1. */
  humanSeat: number;
  /** Bid pad state. */
  bidPadActive: boolean;
  bidPadValue: number;
  /** Activate the bid pad for a specific bid. */
  setBidPadValue: (value: number) => void;
  /** Confirm a bid. */
  confirmBid: (amount: number) => void;
  /** Confirm a nil bid. */
  confirmNilBid: () => void;
  /** Confirm a blind nil bid. */
  confirmBlindNilBid: () => void;
  /** Selected card for trick play. */
  selectedCard: string | null;
  /** Select a card to play. */
  selectCard: (cardId: string) => void;
  /** Legal card IDs for the current player. */
  legalCards: string[];
  /** Apply a game action. */
  doAction: (action: Action) => EngineEvent[];
  /** Start the next hand. */
  startNextHand: () => EngineEvent[];
}

export function useGameState({
  config,
  seed,
  humanSeat = -1,
}: UseGameStateOptions): UseGameStateReturn {
  // Session reference — stable across renders
  const sessionRef = useRef<GameSession | null>(null);
  if (!sessionRef.current) {
    sessionRef.current = new GameSession({ config, seed });
  }

  const [state, setState] = useState<GameState>(sessionRef.current.state);
  const [events, setEvents] = useState<readonly EngineEvent[]>([]);
  const [bidPadValue, setBidPadValue] = useState(0);
  const [selectedCard, setSelectedCard] = useState<string | null>(null);

  // Whether it's the human's turn right now
  const isHumanTurn = useMemo(() => {
    const actor = currentActor(state);
    return actor === humanSeat && humanSeat >= 0;
  }, [state, humanSeat]);

  // Legal cards for the current actor
  const legalCards = useMemo(() => {
    if (state.phase !== 'playing') return [];
    const actor = currentActor(state);
    if (actor === null) return [];
    const legal = legalActions(state);
    return legal
      .filter((a): a is PlayAction => a.type === 'Play')
      .map((a) => a.cardId);
  }, [state]);

  const doAction = useCallback((action: Action): EngineEvent[] => {
    const session = sessionRef.current!;
    const resultEvents = session.apply(action);
    setState(session.state);
    setEvents(resultEvents);
    session.clearEvents();
    return resultEvents;
  }, []);

  const startNextHand = useCallback((): EngineEvent[] => {
    const session = sessionRef.current!;
    const resultEvents = session.startNextHand();
    setState(session.state);
    setEvents(resultEvents);
    session.clearEvents();
    return resultEvents;
  }, []);

  const confirmBid = useCallback((amount: number): void => {
    const action: BidAction = { type: 'Bid', kind: 'number', amount };
    doAction(action);
  }, [doAction]);

  const confirmNilBid = useCallback((): void => {
    const action: BidAction = { type: 'Bid', kind: 'nil', amount: 0 };
    doAction(action);
  }, [doAction]);

  const confirmBlindNilBid = useCallback((): void => {
    const action: BidAction = { type: 'Bid', kind: 'blindNil', amount: 0 };
    doAction(action);
  }, [doAction]);

  const selectCard = useCallback((cardId: string): void => {
    setSelectedCard(cardId);
    // In M2.3, auto-plays when a legal card is selected
    if (cardId && legalCards.includes(cardId)) {
      const action: PlayAction = { type: 'Play', cardId };
      doAction(action);
      setSelectedCard(null);
    }
  }, [legalCards, doAction]);

  // Derived: bid pad is active when bidding and it's human's turn
  const bidPadActive = state.phase === 'bidding' && isHumanTurn;

  return {
    state,
    events,
    isHumanTurn,
    humanSeat,
    bidPadActive,
    bidPadValue,
    setBidPadValue,
    confirmBid,
    confirmNilBid,
    confirmBlindNilBid,
    selectedCard,
    selectCard,
    legalCards,
    doAction,
    startNextHand,
  };
}
