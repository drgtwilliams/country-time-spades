/**
 * Table view — M2.2-2.3 full table with real game state.
 *
 * Uses the useGameState hook to drive the Table component with live
 * engine state. Bid pad, card selection, trick center all wired up.
 *
 * On handOver: navigates to scoreboard.
 * On gameOver: shows final results on scoreboard.
 */

import { useCallback, useMemo, useState, useEffect } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView, StyleSheet, View } from 'react-native';
import { DEFAULT_CONFIG, type GameConfig, type Phase } from 'engine';
import { Table } from '../../src/components/Table';
import { useGameState } from '../../src/hooks/useGameState';

/** Default human seat for single-player. */
const DEFAULT_HUMAN_SEAT = 0;

export default function TableView() {
  const router = useRouter();
  const params = useLocalSearchParams();

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

  // Determine human seat: in pass-and-play mode, seat 0 is still human
  // In AI mode, humanSeat is 0 and all AI are 1-3
  const humanSeat = passAndPlay ? DEFAULT_HUMAN_SEAT : DEFAULT_HUMAN_SEAT;

  // Initialize the game session
  const session = useGameState({
    config,
    seed: params.seed ?? `default-${Date.now()}`,
    humanSeat,
    aiAutoPlay: !passAndPlay,
    aiConfig: { playDelay: 1200, bidNoise: 0.1, smartBreak: true },
    banterConfig: { density: 'medium', cooldownMs: 3000, maxStack: 3 },
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

  // Start next hand from scoreboard
  const handleNewHand = useCallback(() => {
    session.startNextHand();
    router.back();
  }, [session, router]);

  // Reset to setup screen
  const handleNewGame = useCallback(() => {
    router.replace({ pathname: '(setup)' });
  }, [router]);

  return (
    <SafeAreaView style={styles.container}>
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
      />
    </SafeAreaView>
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
});
