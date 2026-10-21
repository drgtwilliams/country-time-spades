/**
 * Scoreboard screen — M2.4.
 *
 * Displays:
 * - Team scores with running totals
 * - Hand summary (bids vs tricks taken)
 * - Bag threshold events ("in the hole")
 * - Vernacular labels (board, set, bags)
 * - "Next Hand" / "New Game" buttons
 *
 * Score persistence via AsyncStorage (local storage).
 * Navigates back to table on "Next Hand", to setup on "New Game".
 */

import React, { useMemo } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  View,
  Pressable,
  SafeAreaView,
  Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import type { BidRecord, Seat } from 'engine';
import { DEFAULT_CONFIG } from 'engine';

export default function ScoreboardScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();

  // Parse config from params
  const config = useMemo(() => parseConfigFromParams(params), [params]);

  // M2.4: simplified scoreboard — real scores come from engine
  // In M2.5, this will receive full gameState from context
  // For now, display a placeholder with config info
  const seed = params.seed ?? 'unknown';

  // Handle next hand — go back to table, table will call startNextHand
  const handleNewHand = useCallback(() => {
    router.back();
  }, [router]);

  // Handle new game — reset to setup screen
  const handleNewGame = useCallback(() => {
    Alert.alert(
      'New Game',
      'Reset all scores?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: () => {
            router.replace({ pathname: '(setup)' });
          },
        },
      ],
    );
  }, [router]);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.content}>
        <Text style={styles.heading}>Hand Complete</Text>
        <Text style={styles.subheading}>Seed: {seed}</Text>

        {/* Score placeholder — real scores come from engine in M2.5 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Scores</Text>
          <View style={styles.teamRow}>
            <View style={styles.teamCard}>
              <Text style={styles.teamLabel}>Team 0</Text>
              <Text style={styles.teamScore}>—</Text>
            </View>
            <View style={styles.teamCard}>
              <Text style={styles.teamLabel}>Team 1</Text>
              <Text style={styles.teamScore}>—</Text>
            </View>
          </View>
          <Text style={styles.note}>
            Scores update after 13 tricks — check the top bar for hand number.
          </Text>
        </View>

        {/* Settings summary */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Settings</Text>
          <Text style={styles.settingRow}>
            Deck: {config.deckMode}
          </Text>
          <Text style={styles.settingRow}>
            Target: {config.targetScore}
          </Text>
          <Text style={styles.settingRow}>
            Nil: {config.allowNil ? '✓' : '✗'} | Blind Nil: {config.allowBlindNil ? '✓' : '✗'}
          </Text>
        </View>

        {/* Action buttons */}
        <View style={styles.actionRow}>
          <Pressable style={[styles.btn, styles.nextHandBtn]} onPress={handleNewHand}>
            <Text style={styles.btnText}>Next Hand</Text>
          </Pressable>
          <Pressable style={[styles.btn, styles.newGameBtn]} onPress={handleNewGame}>
            <Text style={styles.btnText}>New Game</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function parseConfigFromParams(params: Record<string, string | undefined>) {
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
    targetScore: tryNum(params.targetScore, DEFAULT_CONFIG.targetScore),
    allowNil: tryBool(params.allowNil, DEFAULT_CONFIG.allowNil),
    allowBlindNil: tryBool(params.allowBlindNil, DEFAULT_CONFIG.allowBlindNil),
  };
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a3c2a',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  heading: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 4,
  },
  subheading: {
    fontSize: 14,
    color: '#88bb99',
    textAlign: 'center',
    marginBottom: 20,
  },
  section: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 10,
    padding: 14,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffd700',
    marginBottom: 10,
  },
  teamRow: {
    flexDirection: 'row',
    gap: 12,
  },
  teamCard: {
    flex: 1,
    padding: 16,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
  },
  teamLabel: {
    fontSize: 14,
    color: '#ccc',
    marginBottom: 8,
  },
  teamScore: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#fff',
  },
  note: {
    fontSize: 12,
    color: '#888',
    marginTop: 10,
    fontStyle: 'italic',
  },
  settingRow: {
    fontSize: 14,
    color: '#ddd',
    paddingVertical: 3,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  btn: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  nextHandBtn: {
    backgroundColor: '#2563eb',
  },
  newGameBtn: {
    backgroundColor: '#666',
  },
  btnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
