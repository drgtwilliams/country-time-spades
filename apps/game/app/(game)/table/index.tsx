/**
 * Table view — M2.2-2.3 full table with real game state.
 *
 * Uses the useGameState hook to drive the Table component with live
 * engine state. Bid pad, card selection, trick center all wired up.
 */

import { useCallback, useMemo, useState } from 'react';
import { useLocalSearchParams, useNavigation, useRouter } from 'expo-router';
import { Alert, SafeAreaView, StyleSheet, View } from 'react-native';
import { DEFAULT_CONFIG, validateConfig, type GameConfig } from 'engine';
import { Table } from '../../src/components/Table';
import { useGameState } from '../../src/hooks/useGameState';

/** Default human seat for single-player. */
const DEFAULT_HUMAN_SEAT = 0;

export default function TableView() {
  const router = useRouter();
  const params = useLocalSearchParams();

  // Parse config from route params (passed by setup screen)
  const config = useMemo(() => parseConfigFromParams(params), [params]);

  // Initialize the game session
  const session = useGameState({
    config,
    seed: params.seed ?? `default-${Date.now()}`,
    humanSeat: DEFAULT_HUMAN_SEAT,
  });

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
