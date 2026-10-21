/**
 * Lobby screen — create or join a multiplayer room.
 *
 * M4: entry point for multiplayer mode.
 * Two paths:
 *   1. "Create Room" → navigates to room screen, connects as host
 *   2. "Join Room" → enter invite code → navigates to room screen as guest
 */

import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';

/**
 * Lobby screen.
 *
 * Props (from expo-router route params):
 *   - serverUrl: WebSocket server URL (optional, defaults to env var)
 */
export default function LobbyScreen() {
  const [inviteCode, setInviteCode] = useState('');
  const [playerName, setPlayerName] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [isJoining, setIsJoining] = useState(false);

  const SERVER_URL =
    process.env.EXPO_PUBLIC_WS_URL ?? 'ws://localhost:3001/ws';

  /**
   * Create a new room and navigate to the room screen.
   */
  const handleCreateRoom = () => {
    setIsCreating(true);
    // Navigate to room screen with host flag
    // expo-router: pass params through navigation
    // For now, log and show the flow
    Alert.alert(
      'Room Created',
      `Server: ${SERVER_URL}\n\nIn production, this would connect to the server and create a room.\n\nPlayer: ${playerName || '(anonymous)'}`,
      [{ text: 'OK', onPress: () => {
        // Navigation to room screen happens here
        // routeParams: { serverUrl, isHost: true, playerName, config }
      }}]
    );
    setIsCreating(false);
  };

  /**
   * Join an existing room by invite code.
   */
  const handleJoinRoom = () => {
    if (!inviteCode.trim()) {
      Alert.alert('Enter Code', 'Please type the 6-character invite code.');
      return;
    }
    setIsJoining(true);
    Alert.alert(
      'Joining Room',
      `Code: ${inviteCode.toUpperCase()}\nServer: ${SERVER_URL}\n\nPlayer: ${playerName || '(anonymous)'}`,
      [{ text: 'OK', onPress: () => {
        // Navigation to room screen with guest params
        // routeParams: { serverUrl, roomCode, isHost: false, playerName }
      }}]
    );
    setIsJoining(false);
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <View style={styles.content}>
        <Text style={styles.title}>Multiplayer</Text>
        <Text style={styles.subtitle}>
          Play with friends via invite links
        </Text>

        <View style={styles.form}>
          <Text style={styles.label}>Your Name</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter your name"
            value={playerName}
            onChangeText={setPlayerName}
            maxLength={20}
            autoCapitalize="words"
          />

          <View style={styles.divider} />

          <Text style={styles.sectionTitle}>Create a Room</Text>
          <TouchableOpacity
            style={[styles.button, styles.primaryButton, isCreating && styles.buttonDisabled]}
            onPress={handleCreateRoom}
            disabled={isCreating}
            activeOpacity={0.7}
          >
            <Text style={styles.primaryButtonText}>
              {isCreating ? 'Creating...' : 'Create Room'}
            </Text>
          </TouchableOpacity>

          <View style={styles.divider} />

          <Text style={styles.sectionTitle}>Join a Room</Text>
          <TextInput
            style={styles.codeInput}
            placeholder="Invite code"
            value={inviteCode}
            onChangeText={setInviteCode}
            maxLength={6}
            autoCapitalize="characters"
            autoCorrect={false}
            keyboardType="ascii-capable"
            placeholderTextColor="#6B7280"
          />
          <TouchableOpacity
            style={[styles.button, styles.secondaryButton, isJoining && styles.buttonDisabled]}
            onPress={handleJoinRoom}
            disabled={isJoining}
            activeOpacity={0.7}
          >
            <Text style={styles.secondaryButtonText}>
              {isJoining ? 'Joining...' : 'Join Room'}
            </Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.hint}>
          Create a room and share the code, or join an existing room with an invite code.
        </Text>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1A1A2E',
  },
  content: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    color: '#E2E8F0',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#94A3B8',
    textAlign: 'center',
    marginBottom: 40,
  },
  form: {
    backgroundColor: '#16213E',
    borderRadius: 16,
    padding: 24,
    gap: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#94A3B8',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  input: {
    backgroundColor: '#1A1A2E',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#E2E8F0',
    borderWidth: 1,
    borderColor: '#2D3748',
  },
  divider: {
    height: 1,
    backgroundColor: '#2D3748',
    marginVertical: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#E2E8F0',
    marginTop: 8,
  },
  button: {
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  primaryButton: {
    backgroundColor: '#4CAF50',
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  secondaryButton: {
    backgroundColor: '#2D3748',
    borderWidth: 1,
    borderColor: '#4A5568',
  },
  secondaryButtonText: {
    color: '#E2E8F0',
    fontSize: 16,
    fontWeight: '700',
  },
  codeInput: {
    backgroundColor: '#1A1A2E',
    borderRadius: 12,
    padding: 16,
    fontSize: 24,
    color: '#E2E8F0',
    borderWidth: 1,
    borderColor: '#2D3748',
    textAlign: 'center',
    letterSpacing: 8,
    fontWeight: '700',
  },
  hint: {
    fontSize: 13,
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 24,
    lineHeight: 20,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
});
