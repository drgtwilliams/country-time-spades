/**
 * BidPad — number pad for placing bids.
 *
 * Shows digits 0-9, confirm and cancel buttons.
 * Disabled during AI turns.
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
  /** Called when bid is confirmed. */
  onConfirm: (bid: number) => void;
  /** Called when cancel is pressed. */
  onCancel: () => void;
  /** Custom style for the container. */
  style?: StyleProp<ViewStyle>;
}

export function BidPad({
  currentBid,
  maxBid = 9,
  active,
  onConfirm,
  onCancel,
  style,
}: BidPadProps) {
  const [digits, setDigits] = useState<number[]>([]);

  const displayValue = useMemo(() => {
    if (digits.length === 0) return '—';
    return digits.join('');
  }, [digits]);

  const isValid = digits.length > 0 && parseInt(displayValue, 10) <= maxBid;

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
        <Text style={styles.displayText}>
          {active ? displayValue : 'Waiting...'}
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
});
