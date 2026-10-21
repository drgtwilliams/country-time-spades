/**
 * Room screen — multiplayer room view.
 *
 * Shows:
 *   - Room code (large, copyable)
 *   - Player slots (4 slots, labeled with names or "Empty")
 *   - Room settings (inherited from host's game config)
 *   - "Start Game" button (host only)
 *   - "Leave Room" button
 *
 * M4: connects to WebSocket server, manages room state.
 */

import React, { useEffect, useRef, useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Clipboard,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  WebSocketSession,
  DEFAULT_BANTER_CONFIG,
} from 'app-core';
import type { GameConfig } from 'engine';
import { DEFAULT_CONFIG } from 'engine';

/**
 * Room screen route params.
 */
interface RoomParams {
  serverUrl: string;
  isHost: string; // "true" | "false"
  playerName?: string;
  roomCode?: string;
  // Game config (from host's setup screen, passed through navigation)
  deckMode?: string;
  allowNil?: string;
  allowBlindNil?: string;
  targetScore?: string;
  bagThreshold?: string;
}

/**
 * Parse string route params into proper types for GameConfig.
 */
function parseConfigFromParams(params: RoomParams): GameConfig {
  return {
    deckMode: (params.deckMode as GameConfig['deckMode']) ?? 'jokers',
    promotedDeuces: [],
    allowNil: params.allowNil !== 'false',
    allowBlindNil: params.allowBlindNil !== 'false',
    nilBonus: 100,
    nilPenalty: 100,
    blindNilBonus: 200,
    blindNilPenalty: 200,
    bagPenaltyEnabled: true,
    bagThreshold: parseInt(params.bagThreshold ?? '10', 10),
    bagPenalty: 100,
    setPenalty: 'zero',
    rene: 'prevent',
    renePenalty: 'loseHand',
    targetScore: parseInt(params.targetScore ?? '500', 10),
  };
}

/**
 * Room screen component.
 */
export default function RoomScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<RoomParams>();

  const serverUrl = params.serverUrl || 'ws://localhost:3001/ws';
  const isHost = params.isHost === 'true';
  const playerName = params.playerName || 'Player';
  const roomCode = params.roomCode || '';

  const config = parseConfigFromParams(params);

  const sessionRef = useRef<WebSocketSession | null>(null);

  // UI state
  const [code, setCode] = useState<string>(roomCode);
  const [playerList, setPlayerList] = useState<
    Array<{ id: string; name: string; seat: number; isHuman: boolean }>
  >([]);
  const [gamePhase, setGamePhase] = useState<string>('lobby');
  const [isStarting, setIsStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    // Create and connect the WebSocket session
    const session = new WebSocketSession({
      serverUrl,
      roomCode,
      playerName,
      isHost,
      config: isHost ? config : null,
    });

    session.onStateReady = (_state, roomCode) => {
      setCode(roomCode);
      setConnected(true);
      setError(null);
    };

    session.onError = (msg) => {
      setError(msg);
      Alert.alert('Error', msg);
    };

    session.onRoomClosed = () => {
      Alert.alert('Room Closed', 'You have left the room.', [
        { text: 'OK', onPress: () => router.replace('/') },
      ]);
    };

    sessionRef.current = session;

    return () => {
      session.disconnect();
      sessionRef.current = null;
    };
  }, [serverUrl, isHost, playerName, roomCode, config]);

  /**
   * Start the game (host only).
   */
  const handleStartGame = () => {
    if (!isHost) return;
    setIsStarting(true);

    sessionRef.current?.startGame();

    // Navigate to table screen once game starts
    // In production, this would be triggered by the server's state broadcast
    setTimeout(() => {
      router.replace({
        pathname: '/(game)/table',
        params: {
          mode: 'multiplayer',
          serverUrl,
          roomCode: code,
          playerName,
        },
      });
    }, 500);

    setIsStarting(false);
  };

  /**
   * Leave the room.
   */
  const handleLeaveRoom = () => {
    sessionRef.current?.leave();
    router.replace('/');
  };

  /**
   * Copy room code to clipboard.
   */
  const handleCopyCode = () => {
    Clipboard.setString(code);
    Alert.alert('Copied', `Room code: ${code}`);
  };

  return (
    <View style={styles.container}>
      {/* Room Code */}
      <View style={styles.codeSection}>
        <Text style={styles.codeLabel}>Room Code</Text>
        <TouchableOpacity onPress={handleCopyCode} activeOpacity={0.7}>
          <Text style={styles.codeValue}>{code || '...'}</Text>
        </TouchableOpacity>
        <Text style={styles.codeHint}>Tap to copy</Text>
      </View>

      {/* Connection Status */}
      <View style={styles.statusSection}>
        <View
          style={[
            styles.statusDot,
            connected ? styles.statusConnected : styles.statusConnecting,
          ]}
        />
        <Text style={styles.statusText}>
          {connected ? 'Connected' : 'Connecting...'}
        </Text>
      </View>

      {/* Player List */}
      <View style={styles.playersSection}>
        <Text style={styles.sectionTitle}>Players</Text>
        <Text style={styles.playerCount}>
          {playerList.length}/4 connected
        </Text>

        {playerList.length === 0 && (
          <Text style={styles.emptyText}>
            {isHost ? 'Waiting for players...' : 'Waiting for room...'}
          </Text>
        )}

        {playerList.map((p) => (
          <View key={p.id} style={styles.playerRow}>
            <View style={styles.seatBadge}>
              <Text style={styles.seatText}>{p.seat}</Text>
            </View>
            <Text style={styles.playerName}>{p.name}</Text>
            {p.seat === 0 && (
              <Text style={styles.hostBadge}>HOST</Text>
            )}
          </View>
        ))}
      </View>

      {/* Error Display */}
      {error && (
        <View style={styles.errorSection}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {/* Action Buttons */}
      <View style={styles.actions}>
        {isHost && (
          <TouchableOpacity
            style={[
              styles.startButton,
              (!connected || playerList.length < 2) && styles.buttonDisabled,
            ]}
            onPress={handleStartGame}
            disabled={!connected || playerList.length < 2 || isStarting}
            activeOpacity={0.7}
          >
            {isStarting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.startButtonText}>
                {playerList.length < 2
                  ? `Need ${2 - playerList.length} more player${(2 - playerList.length) > 1 ? 's' : ''}`
                  : 'Start Game'}
              </Text>
            )}
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={styles.leaveButton}
          onPress={handleLeaveRoom}
          activeOpacity={0.7}
        >
          <Text style={styles.leaveButtonText}>Leave Room</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1A1A2E',
    padding: 24,
  },
  codeSection: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  codeLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#94A3B8',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 12,
  },
  codeValue: {
    fontSize: 48,
    fontWeight: '800',
    color: '#E2E8F0',
    letterSpacing: 12,
  },
  codeHint: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 8,
  },
  statusSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
    gap: 8,
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  statusConnected: {
    backgroundColor: '#4CAF50',
  },
  statusConnecting: {
    backgroundColor: '#FF9800',
  },
  statusText: {
    fontSize: 14,
    color: '#94A3B8',
  },
  playersSection: {
    backgroundColor: '#16213E',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#E2E8F0',
    marginBottom: 4,
  },
  playerCount: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    paddingVertical: 24,
  },
  playerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#2D3748',
    gap: 12,
  },
  seatBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#2D3748',
    alignItems: 'center',
    justifyContent: 'center',
  },
  seatText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#E2E8F0',
  },
  playerName: {
    flex: 1,
    fontSize: 16,
    color: '#E2E8F0',
    fontWeight: '600',
  },
  hostBadge: {
    fontSize: 11,
    fontWeight: '700',
    color: '#4CAF50',
    backgroundColor: '#1B5E20',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  errorSection: {
    backgroundColor: '#3E1A1A',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  errorText: {
    fontSize: 14,
    color: '#FF6B6B',
  },
  actions: {
    marginTop: 'auto',
    gap: 12,
  },
  startButton: {
    backgroundColor: '#4CAF50',
    borderRadius: 12,
    paddingVertical: 18,
    alignItems: 'center',
  },
  startButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
  leaveButton: {
    backgroundColor: '#2D3748',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#4A5568',
  },
  leaveButtonText: {
    color: '#E2E8F0',
    fontSize: 16,
    fontWeight: '600',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
});
