/**
 * useGameState — React hook that wraps GameSession for the UI layer.
 *
 * Manages:
 * - Session lifecycle (create, apply actions)
 * - Bid pad state machine
 * - Card selection for trick play
 * - AI auto-play with configurable delays
 * - Banter selector — engine events → character phrases → display queue
 * - Legal action filtering
 *
 * M2: basic session + bid pad + card selection + AI auto-play.
 * M3: banter integration — events → phrases → speech bubbles.
 */

import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import {
  type GameState,
  type Action,
  type BidAction,
  type PlayAction,
  type EngineEvent,
  type Seat,
  legalActions,
  currentActor,
} from 'engine';
import { GameSession, type GameSessionOptions } from 'app-core';
import {
  BanterSession,
  selectAllBanterLines,
  DEFAULT_BANTER_CONFIG,
  type BanterConfig as CoreBanterConfig,
  type DisplayBanterLine,
} from 'app-core';
import { CAST_MEMBERS } from 'content';
import { aiBid, aiPlayCard, getPlayDelay, type AIConfig } from '../utils/aiPlayer';

export interface UseGameStateOptions {
  config: import('engine').GameConfig;
  seed: string;
  /** Seat of the human player (-1 for AI-only table). */
  humanSeat?: number;
  /** AI play configuration. */
  aiConfig?: AIConfig;
  /** Whether AI plays automatically (true = full AI table). */
  aiAutoPlay?: boolean;
  /** Banter configuration. Set to null to disable banter. */
  banterConfig?: CoreBanterConfig | null;
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
  /** Legal card IDs for the current actor during trick play. */
  legalCards: string[];
  /** Apply a game action. */
  doAction: (action: Action) => EngineEvent[];
  /** Start the next hand. */
  startNextHand: () => EngineEvent[];
  /** Whether the table is all-AI (no human player). */
  isAITable: boolean;
  /** Active banter lines for display. */
  banterLines: readonly DisplayBanterLine[];
}

export function useGameState({
  config,
  seed,
  humanSeat = -1,
  aiConfig = { playDelay: 1500, bidNoise: 0.1, smartBreak: true },
  aiAutoPlay = true,
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
  const [banterLines, setBanterLines] = useState<DisplayBanterLine[]>([]);
  const banterSessionRef = useRef<BanterSession>(new BanterSession());

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
    if (cardId && legalCards.includes(cardId)) {
      const action: PlayAction = { type: 'Play', cardId };
      doAction(action);
      setSelectedCard(null);
    }
  }, [legalCards, doAction]);

  // Banter effect — process engine events into character banter lines
  useEffect(() => {
    const banterConfig = banterConfigOpt;
    if (!banterConfig) return;

    const session = sessionRef.current;
    if (!session) return;

    // Process each event that produced banter
    for (const event of events) {
      if (event.type === 'BidMade' || event.type === 'Bid') continue; // bidding handled separately

      // Determine which seats are active
      const activeSeats: Seat[] = [0, 1, 2, 3];

      // Build seat-to-cast mapping
      const seatToCastIndex: Record<Seat, number> = { 0: 0, 1: 1, 2: 2, 3: 3 };

      // Select banter lines
      const lines = selectAllBanterLines(
        event,
        seatToCastIndex,
        activeSeats,
        banterSessionRef.current,
        banterConfig,
      );

      if (lines.length > 0) {
        setBanterLines((prev) => {
          // Merge: remove old lines that are still visible, add new ones
          const combined = [...prev, ...lines];
          // Limit stack
          return combined.slice(-banterConfig.maxStack);
        });

        // Auto-dismiss after 3 seconds
        const maxDuration = Math.max(...lines.map((l) => 3500));
        setTimeout(() => {
          setBanterLines((prev) => prev.slice(1)); // remove oldest
        }, maxDuration);
      }
    }
  }, [events]);

  // AI auto-play effect
  useEffect(() => {
    if (!aiAutoPlay) return;

    const actor = currentActor(state);
    if (actor === null) return;
    if (actor === humanSeat && humanSeat >= 0) return; // human's turn

    // AI needs to act — determine if it's a bid or a play
    if (state.phase === 'bidding') {
      const timer = setTimeout(() => {
        const bidAction = aiBid(state, actor as import('engine').Seat);
        doAction(bidAction);
      }, getPlayDelay(aiConfig));
      return () => clearTimeout(timer);
    }

    if (state.phase === 'playing') {
      const timer = setTimeout(() => {
        const cardId = aiPlayCard(state, actor as import('engine').Seat);
        if (cardId) {
          const action: PlayAction = { type: 'Play', cardId };
          doAction(action);
        }
      }, getPlayDelay(aiConfig));
      return () => clearTimeout(timer);
    }
  }, [state, aiAutoPlay, aiConfig, humanSeat, doAction]);

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
    isAITable: humanSeat < 0,
    banterLines,
  };
}
