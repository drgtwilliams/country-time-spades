/**
 * SeatIndicator — shows a seat position with name, bid, and current-turn indicator.
 */

import React from 'react';
import { View, Text, StyleSheet, type ViewStyle } from 'react-native';
import type { Seat, BidRecord } from 'engine';

export interface SeatIndicatorProps {
  /** Seat number. */
  seat: Seat;
  /** Player name (for M2, generic names). */
  name: string;
  /** Bid this seat made (if any). */
  bid?: BidRecord;
  /** Whether this seat is the current actor. */
  isActive?: boolean;
  /** Whether this seat is the dealer. */
  isDealer?: boolean;
  /** Whether this seat is current player's hand. */
  isSelf?: boolean;
  /** Custom style. */
  style?: ViewStyle;
}

const SEAT_POSITIONS: Record<Seat, { label: string }> = {
  0: { label: 'You' },
  1: { label: 'Right' },
  2: { label: 'Opposite' },
  3: { label: 'Left' },
};

export function SeatIndicator({
  seat,
  name,
  bid,
  isActive = false,
  isDealer = false,
  isSelf = false,
  style,
}: SeatIndicatorProps) {
  const displayName = isSelf ? SEAT_POSITIONS[seat].label : (name || SEAT_POSITIONS[seat].label);

  return (
    <View style={[styles.container, isActive && styles.active, style]}>
      <View style={styles.nameRow}>
        <Text style={[styles.name, isActive && styles.nameActive]}>
          {displayName}
        </Text>
        {isDealer && <Text style={styles.dealerBadge}>D</Text>}
      </View>
      {bid && (
        <Text style={styles.bidText}>
          {bid.kind === 'nil' ? 'Nil' : bid.kind === 'blindNil' ? 'BNil' : `${bid.amount}`}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  active: {
    backgroundColor: 'rgba(255, 215, 0, 0.4)',
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  name: {
    fontSize: 12,
    color: '#ddd',
    fontWeight: '500',
  },
  nameActive: {
    color: '#ffd700',
    fontWeight: 'bold',
  },
  dealerBadge: {
    fontSize: 10,
    color: '#fff',
    backgroundColor: '#888',
    borderRadius: 3,
    paddingHorizontal: 4,
    paddingVertical: 1,
  },
  bidText: {
    fontSize: 11,
    color: '#aaa',
    marginTop: 1,
  },
});
