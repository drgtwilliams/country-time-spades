/**
 * Table view — M2.2-2.3 full table with real game state.
 *
 * Uses the useGameState hook to drive the Table component with live
 * engine state. Bid pad, card selection, trick center all wired up.
 *
 * On handOver: navigates to scoreboard.
 * On gameOver: shows final results on scoreboard.
 *
 * M4: supports both local (pass-through) and multiplayer (WebSocket) modes.
 * M5.4: voice settings passed from setup screen (avatar voice, announcer,
 * per-character toggles, voice input).
 */

import { useCallback, useMemo, useState, useEffect } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { DEFAULT_CONFIG, type GameConfig, type Phase } from 'engine';
import { Table } from '../../src/components/Table';
import { useGameState } from '../../src/hooks/useGameState';

/** Default human seat for single-player. */
const DEFAULT_HUMAN_SEAT = 0;

/** Default WebSocket server URL. */
const DEFAULT_SERVER_URL = 'ws://localhost:3001/ws';

export default function TableView() {
  const router = useRouter();
  const params = useLocalSearchParams();

  // Check if this is multiplayer mode
  const isMultiplayer = useMemo(() => {
    return params.mode === 'multiplayer';
  }, [params.mode]);

  // Parse config from route params (passed by setup screen)
  const config = useMemo(() => parseConfigFromParams(params), [params]);

  // Parse play mode
  const passAndPlay = useMemo(() => {
    const val = params.passAndPlay;
    return val === 'true';
  }, [params.passAndPlay]);

  const aiCount = useMemo(() => {
    const val = params.aiCount;
    return val ? parseInt(val, 10) : 3;
  }, [params.aiCount]);

  // Parse voice settings from route params
  const avatarVoice = useMemo(() => {
    const val = params.avatarVoice;
    return val === undefined ? true : val === 'true';
  }, [params.avatarVoice]);

  const announcerVoice = useMemo(() => {
    const val = params.announcerVoice;
    return val === undefined ? true : val === 'true';
  }, [params.announcerVoice]);

  const voiceInputEnabled = useMemo(() => {
    const val = params.voiceInput;
    return val === 'true';
  }, [params.voiceInput]);

  // Determine human seat: in pass-and-play mode, seat 0 is still human
  // In AI mode, humanSeat is 0 and all AI are 1-3
  const humanSeat = passAndPlay ? DEFAULT_HUMAN_SEAT : DEFAULT_HUMAN_SEAT;

  // Initialize the game session (local or multiplayer)
  const session = useGameState({
    config,
    seed: params.seed ?? `default-${Date.now()}`,
    humanSeat,
    aiAutoPlay: !passAndPlay,
    aiConfig: { playDelay: 1200, bidNoise: 0.1, smartBreak: true },
    banterConfig: { density: 'medium', cooldownMs: 3000, maxStack: 3 },
    mode: isMultiplayer ? 'multiplayer' : 'local',
    serverUrl: (params.serverUrl as string) || DEFAULT_SERVER_URL,
    roomCode: (params.roomCode as string) || '',
    playerName: (params.playerName as string) || 'Player',
    ttsVolume: params.ttsVolume ? parseFloat(params.ttsVolume) : 0.7,
    ttsRate: params.ttsRate ? parseFloat(params.ttsRate) : 1,
    avatarVoice,
    announcerVoice,
    characterVoices: {}, // TODO: pass per-character toggles from setup screen
    voiceEnabled: voiceInputEnabled,
  });

  const [previousPhase, setPreviousPhase] = useState<Phase | null>(null);

  // Detect handOver → navigate to scoreboard
  useEffect(() => {
    if (previousPhase === 'playing' && session.state.phase === 'handOver') {
      router.push({
        pathname: '(game)/scoreboard',
        params: { seed: params.seed },
      });
    }
    setPreviousPhase(session.state.phase);
  }, [session.state.phase, previousPhase, router, params.seed]);

  // Bid pad confirmation
  const handleBid = useCallback(
    (amount: number) => {
      session.confirmBid(amount);
    },
    [session],
  );

  // Nil bid
  const handleNilBid = useCallback(
    () => {
      session.confirmNilBid();
    },
    [session],
  );

  // Blind nil bid
  const handleBlindNilBid = useCallback(
    () => {
      session.confirmBlindNilBid();
    },
    [session],
  );

  // Card play
  const handlePlayCard = useCallback(
    (cardId: string) => {
      session.selectCard(cardId);
    },
    [session],
  );

  // Voice input toggle
  const handleVoiceToggle = useCallback(
    (enabled: boolean) => {
      session.setVoiceEnabled(enabled);
    },
    [session],
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Mute button (top-right) */}
      <MuteButton />

      {/* Connection status indicator (multiplayer mode) */}
      {isMultiplayer && !session.isConnected && (
        <View style={styles.statusBar}>
          <View style={styles.statusDotOffline} />
          <Text style={styles.statusText}>Reconnecting...</Text>
        </View>
      )}
      <Table
        gameState={session.state}
        humanSeat={session.humanSeat}
        isHumanTurn={session.isHumanTurn}
        legalCards={session.legalCards}
        onPlayCard={handlePlayCard}
        onBid={handleBid}
        onNilBid={handleNilBid}
        onBlindNilBid={handleBlindNilBid}
        bidPadActive={session.bidPadActive}
        bidPadValue={session.bidPadValue}
        banterLines={session.banterLines}
        voiceEnabled={session.voiceEnabled}
        onVoiceToggle={handleVoiceToggle}
        sttInterimText={session.sttInterimText}
      />
    </SafeAreaView>
  );
}

// --- Mute button ---

import { TTSPlayerMute } from 'app-core';

/** Global mute singleton — checked by TTSPlayer on each speak call. */
const muteState = { muted: false };

function MuteButton() {
  const [muted, setMuted] = useState(muteState.muted);

  const toggleMute = useCallback(() => {
    muteState.muted = !muted;
    TTSPlayerMute.muted = muteState.muted;
    setMuted(muteState.muted);
  }, [muted]);

  return (
    <TouchableOpacity
      style={styles.muteBtn}
      onPress={toggleMute}
      activeOpacity={0.7}
    >
      <Text style={styles.muteBtnText}>{muted ? '🔇' : '🔊'}</Text>
    </TouchableOpacity>
  );
}

function parseConfigFromParams(params: Record<string, string | undefined>): GameConfig {
  const tryBool = (key: string | undefined, fallback: boolean): boolean => {
    if (key === undefined) return fallback;
    return key === 'true';
  };

  const tryNum = (key: string | undefined, fallback: number): number => {
    if (key === undefined) return fallback;
    const n = parseInt(key, 10);
    return isNaN(n) ? fallback : n;
  };

  return {
    deckMode: (params.deckMode ?? 'plain') as 'plain' | 'jokers' | 'jjdd',
    promotedDeuces: [],
    allowNil: tryBool(params.allowNil, DEFAULT_CONFIG.allowNil),
    allowBlindNil: tryBool(params.allowBlindNil, DEFAULT_CONFIG.allowBlindNil),
    nilBonus: tryNum(params.nilBonus, DEFAULT_CONFIG.nilBonus),
    nilPenalty: tryNum(params.nilPenalty, DEFAULT_CONFIG.nilPenalty),
    blindNilBonus: tryNum(params.blindNilBonus, DEFAULT_CONFIG.blindNilBonus),
    blindNilPenalty: tryNum(params.blindNilPenalty, DEFAULT_CONFIG.blindNilPenalty),
    bagPenaltyEnabled: tryBool(params.bagPenaltyEnabled, DEFAULT_CONFIG.bagPenaltyEnabled),
    bagThreshold: tryNum(params.bagThreshold, DEFAULT_CONFIG.bagThreshold),
    bagPenalty: tryNum(params.bagPenalty, DEFAULT_CONFIG.bagPenalty),
    setPenalty: DEFAULT_CONFIG.setPenalty,
    rene: DEFAULT_CONFIG.rene,
    renePenalty: DEFAULT_CONFIG.renePenalty,
    targetScore: tryNum(params.targetScore, DEFAULT_CONFIG.targetScore),
  };
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a5c2a',
  },
  statusBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#7F1D1D',
    paddingVertical: 8,
    paddingHorizontal: 16,
    zIndex: 100,
    gap: 8,
  },
  statusDotOffline: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FCA5A5',
  },
  statusText: {
    color: '#FCA5A5',
    fontSize: 13,
    fontWeight: '600',
  },
  muteBtn: {
    position: 'absolute',
    top: 8,
    right: 12,
    zIndex: 200,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    borderRadius: 8,
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  muteBtnText: {
    fontSize: 18,
  },
});
