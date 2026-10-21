/**
 * BidPad — number pad for placing bids.
 *
 * Shows digits 0-9, confirm and cancel buttons.
 * Disabled during AI turns. Includes mic button for voice input.
 */

import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

export interface BidPadProps {
  /** Current bid being entered. */
  currentBid: number;
  /** Maximum bid allowed (default 9). */
  maxBid?: number;
  /** Whether the bid pad is active. */
  active: boolean;
  /** Whether voice input is listening. */
  voiceListening?: boolean;
  /** Live STT interim transcription text. */
  sttInterimText?: string;
  /** Called when bid is confirmed. */
  onConfirm: (bid: number) => void;
  /** Called when cancel is pressed. */
  onCancel: () => void;
  /** Called when voice recognition starts/stops. */
  onMicToggle?: (listening: boolean) => void;
  /** Custom style for the container. */
  style?: StyleProp<ViewStyle>;
}

export function BidPad({
  currentBid,
  maxBid = 9,
  active,
  voiceListening = false,
  sttInterimText = '',
  onConfirm,
  onCancel,
  onMicToggle,
  style,
}: BidPadProps) {
  const [digits, setDigits] = useState<number[]>([]);

  const displayValue = useMemo(() => {
    if (digits.length === 0) return '—';
    return digits.join('');
  }, [digits]);

  // When voice listening with interim text, show that instead of digits
  const isShowingStt = voiceListening && sttInterimText.length > 0;

  const isValid = digits.length > 0 && parseInt(displayValue, 10) <= maxBid;

  function pressMic() {
    onMicToggle?.(!voiceListening);
  }

  function pressDigit(d: number) {
    if (!active) return;
    if (digits.length >= 2) return; // two digits max
    setDigits((prev) => [...prev, d]);
  }

  function pressBackspace() {
    if (!active || digits.length === 0) return;
    setDigits((prev) => prev.slice(0, -1));
  }

  function pressConfirm() {
    if (!active || !isValid) return;
    onConfirm(parseInt(displayValue, 10));
    setDigits([]);
  }

  function pressCancel() {
    if (!active) return;
    onCancel();
    setDigits([]);
  }

  return (
    <View style={[styles.container, !active && styles.inactive, style]}>
      {/* Display */}
      <View style={styles.displayRow}>
        {active && voiceListening && (
          <View style={styles.listeningIndicator}>
            <View style={styles.listeningDot} />
            <Text style={styles.listeningText}>Listening...</Text>
          </View>
        )}
        <Text style={[styles.displayText, isShowingStt && styles.sttText]}>
          {isShowingStt ? `"${sttInterimText}"` : active ? displayValue : 'Waiting...'}
        </Text>
      </View>

      {/* Number pad */}
      {active && (
        <>
          <View style={styles.padGrid}>
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((d) => (
              <Pressable key={d} style={styles.digitBtn} onPress={() => pressDigit(d)}>
                <Text style={styles.digitText}>{d}</Text>
              </Pressable>
            ))}
            <Pressable style={styles.digitBtn} onPress={pressBackspace}>
              <Text style={styles.digitText}>⌫</Text>
            </Pressable>
            <Pressable key={0} style={styles.digitBtn} onPress={() => pressDigit(0)}>
              <Text style={styles.digitText}>0</Text>
            </Pressable>
            <Pressable style={styles.digitBtn} onPress={() => pressDigit(0)}>
              <Text style={styles.digitText}>00</Text>
            </Pressable>
          </View>

          {/* Action buttons */}
          <View style={styles.actionRow}>
            <Pressable
              style={[styles.actionBtn, styles.micBtn, voiceListening && styles.micBtnActive]}
              onPress={pressMic}
            >
              <Text style={[styles.actionBtnText, voiceListening && styles.micBtnActiveText]}>
                {voiceListening ? '⏹' : '🎤'}
              </Text>
            </Pressable>
            <Pressable
              style={[styles.actionBtn, styles.cancelBtn]}
              onPress={pressCancel}
            >
              <Text style={styles.actionBtnText}>Cancel</Text>
            </Pressable>
            <Pressable
              style={[styles.actionBtn, styles.confirmBtn, !isValid && styles.confirmBtnDisabled]}
              onPress={pressConfirm}
            >
              <Text style={[styles.actionBtnText, styles.confirmText, !isValid && styles.confirmTextDisabled]}>
                Confirm
              </Text>
            </Pressable>
          </View>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#ccc',
  },
  inactive: {
    opacity: 0.5,
  },
  displayRow: {
    alignItems: 'center',
    marginBottom: 8,
  },
  displayText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
  },
  sttText: {
    fontSize: 20,
    fontStyle: 'italic',
    color: '#6b7280',
  },
  padGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 6,
  },
  digitBtn: {
    width: 56,
    height: 48,
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  digitText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
  },
  actionRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 10,
  },
  actionBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  actionBtnText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  cancelBtn: {
    backgroundColor: '#666',
  },
  confirmBtn: {
    backgroundColor: '#2563eb',
  },
  confirmBtnDisabled: {
    backgroundColor: '#aab',
  },
  confirmText: {
    color: '#fff',
  },
  confirmTextDisabled: {
    color: '#ddd',
  },
  listeningIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
    gap: 6,
  },
  listeningDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#e53e3e',
  },
  listeningText: {
    fontSize: 14,
    color: '#e53e3e',
    fontWeight: '600',
  },
  micBtn: {
    backgroundColor: '#4a5568',
    maxWidth: 60,
  },
  micBtnActive: {
    backgroundColor: '#e53e3e',
  },
  micBtnActiveText: {
    color: '#fff',
  },
});
