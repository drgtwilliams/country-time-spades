/**
 * useGameState — React hook that wraps a session driver for the UI layer.
 *
 * Manages:
 * - Session lifecycle (create, apply actions)
 * - Bid pad state machine
 * - Card selection for trick play
 * - AI auto-play with configurable delays
 * - Banter selector — engine events → character phrases → display queue
 * - Legal action filtering
 * - Multiplayer mode (WebSocketSession)
 *
 * M2: basic session + bid pad + card selection + AI auto-play.
 * M3: banter integration — events → phrases → speech bubbles.
 * M4: multiplayer mode — local GameSession or remote WebSocketSession.
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
import { GameSession, BanterSession, selectAllBanterLines, DEFAULT_BANTER_CONFIG, type BanterConfig as CoreBanterConfig, type DisplayBanterLine, WebSocketSession, TTSPlayer, STTPlayer, parseVoiceBid } from 'app-core';
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
  /** Play mode: 'local' for solo, 'multiplayer' for networked. */
  mode?: 'local' | 'multiplayer';
  /** WebSocket server URL (multiplayer mode). */
  serverUrl?: string;
  /** Room invite code (multiplayer mode). */
  roomCode?: string;
  /** Player display name (multiplayer mode). */
  playerName?: string;
  /** TTS volume (0–1, default 0.7). */
  ttsVolume?: number;
  /** TTS rate (0.5–2x, default 1). */
  ttsRate?: number;
  /** Whether voice input (STT) is enabled. */
  voiceEnabled?: boolean;
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
  /** Whether the session is connected (multiplayer mode). */
  isConnected: boolean;
  /** Leave the room (multiplayer mode). */
  leaveRoom: () => void;
  /** Whether voice input (STT) is enabled. */
  voiceEnabled: boolean;
  /** Toggle voice input on/off. */
  setVoiceEnabled: (enabled: boolean) => void;
  /** Current STT interim text (live transcription). */
  sttInterimText: string;
}

export function useGameState({
  config,
  seed,
  humanSeat = -1,
  aiConfig = { playDelay: 1500, bidNoise: 0.1, smartBreak: true },
  aiAutoPlay = true,
  banterConfig = DEFAULT_BANTER_CONFIG,
  mode = 'local',
  serverUrl = 'ws://localhost:3001/ws',
  roomCode = '',
  playerName = 'Player',
  ttsVolume = 0.7,
  ttsRate = 1,
}: UseGameStateOptions): UseGameStateReturn {
  // Session reference — stable across renders
  const sessionRef = useRef<import('app-core').ISession | null>(null);

  // TTS player — singleton for this hook instance
  const ttsRef = useRef<TTSPlayer | null>(null);
  if (!ttsRef.current) {
    ttsRef.current = new TTSPlayer();
    ttsRef.current.setVolume(ttsVolume);
    ttsRef.current.setRate(ttsRate);
  }

  // For local mode: create GameSession
  if (mode === 'local') {
    if (!sessionRef.current) {
      sessionRef.current = new GameSession({ config, seed });
    }
  } else {
    // Multiplayer mode: create WebSocketSession
    if (!sessionRef.current) {
      sessionRef.current = new WebSocketSession({
        serverUrl,
        roomCode,
        playerName,
        isHost: false,
      });
    }
  }

  const initialSession = sessionRef.current;
  const initialState = mode === 'local'
    ? (initialSession as GameSession).state
    : (initialSession as WebSocketSession);

  const [state, setState] = useState<GameState>(initialState ?? createGame(config, seed));
  const [events, setEvents] = useState<readonly EngineEvent[]>([]);
  const [bidPadValue, setBidPadValue] = useState(0);
  const [selectedCard, setSelectedCard] = useState<string | null>(null);
  const [banterLines, setBanterLines] = useState<DisplayBanterLine[]>([]);
  const [isConnected, setIsConnected] = useState(mode === 'local' ? true : false);
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const [sttInterimText, setSttInterimText] = useState<string>('');
  const banterSessionRef = useRef<BanterSession>(new BanterSession());

  // STT player — singleton for voice input
  const sttRef = useRef<STTPlayer | null>(null);

  // Initialize STT player once
  if (!sttRef.current) {
    sttRef.current = new STTPlayer();
    sttRef.current.setCallbacks({
      onFinal: (text, confidence) => {
        const bid = parseVoiceBid(text);
        if (bid === 'nil') {
          confirmNilBid();
        } else if (typeof bid === 'number') {
          confirmBid(bid);
        }
      },
      onInterim: (text) => {
        setSttInterimText(text.trim());
      },
      onEnd: () => {
        setSttInterimText('');
      },
      onError: () => {
        setSttInterimText('');
        // Silently handled — STT shows "Listening..." state
      },
    });
  }

  // Start/stop STT based on voiceEnabled toggle
  useEffect(() => {
    const stt = sttRef.current;
    if (!stt) return;
    if (voiceEnabled && !stt.isListening) {
      stt.start();
    } else if (!voiceEnabled && stt.isListening) {
      stt.stop();
    }
  }, [voiceEnabled]);

  // For multiplayer mode: poll for state updates
  useEffect(() => {
    if (mode !== 'multiplayer') return;

    const wsSession = sessionRef.current as WebSocketSession;

    const handleStateReady = (_state: GameState, _code: string) => {
      setState(_state);
      setIsConnected(true);
    };

    wsSession.onStateReady = handleStateReady;
    wsSession.onError = () => {
      setIsConnected(false);
    };

    // Ping interval for connection health
    const pingInterval = setInterval(() => {
      wsSession.ping();
    }, 30000);

    return () => {
      wsSession.onStateReady = undefined;
      wsSession.onError = undefined;
      clearInterval(pingInterval);
    };
  }, [mode]);

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
    let resultEvents: EngineEvent[];

    if (mode === 'local') {
      resultEvents = (session as GameSession).apply(action);
      setState((session as GameSession).state);
      setEvents(resultEvents);
      (session as GameSession).clearEvents();
    } else {
      // Multiplayer: send to server, events arrive asynchronously
      resultEvents = (session as WebSocketSession).apply(action);
      // State updates come via WebSocket, not here
    }

    return resultEvents;
  }, [mode]);

  const startNextHand = useCallback((): EngineEvent[] => {
    const session = sessionRef.current!;
    let resultEvents: EngineEvent[];

    if (mode === 'local') {
      resultEvents = (session as GameSession).startNextHand();
      setState((session as GameSession).state);
      setEvents(resultEvents);
      (session as GameSession).clearEvents();
    } else {
      resultEvents = (session as WebSocketSession).startNextHand();
    }

    return resultEvents;
  }, [mode]);

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
    if (!banterConfig) return;

    const session = sessionRef.current;
    if (!session) return;
    const tts = ttsRef.current;
    if (!tts) return;

    // Process each event that produced banter
    for (const event of events) {
      if (event.type === 'BidMade') continue;

      // Determine which seats are active
      const activeSeats: Seat[] = [0, 1, 2, 3];

      // Build seat-to-cast mapping (identity mapping for now)
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
        // Speak each line via TTS (non-blocking)
        for (const line of lines) {
          // Use character name as voice ID (TTSPlayer maps it to platform voice)
          if (line.character) {
            tts.speak(line.text, line.character.name);
          } else if (line.speaker) {
            // Announcer or unnamed speaker
            tts.speak(line.text, 'announcer');
          }
        }

        setBanterLines((prev) => {
          const combined = [...prev, ...lines];
          return combined.slice(-banterConfig.maxStack);
        });

        // Auto-dismiss after 3 seconds (or TTS completion, whichever is longer)
        const maxDuration = Math.max(...lines.map((l) => 3500));
        setTimeout(() => {
          setBanterLines((prev) => prev.slice(1)); // remove oldest
        }, maxDuration);
      }
    }
  }, [events, banterConfig]);

  // AI auto-play effect (local mode only)
  useEffect(() => {
    if (mode === 'multiplayer') return; // multiplayer: server controls turns
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
  }, [state, aiAutoPlay, aiConfig, humanSeat, doAction, mode]);

  // Derived: bid pad is active when bidding and it's human's turn
  const bidPadActive = state.phase === 'bidding' && isHumanTurn;

  const leaveRoom = useCallback(() => {
    if (mode === 'multiplayer') {
      (sessionRef.current as WebSocketSession).leave();
    }
  }, [mode]);

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
    isConnected,
    leaveRoom,
    voiceEnabled,
    setVoiceEnabled,
    sttInterimText,
  };
}

// Import createGame for initial state fallback
import { createGame } from 'engine';
