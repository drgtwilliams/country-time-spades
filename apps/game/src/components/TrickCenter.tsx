/**
 * TrickCenter — shows the current trick with played cards and winner highlight.
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Card } from './Card';
import type { Seat } from 'engine';

export interface TrickPlay {
  seat: Seat;
  cardId: string;
  isWinner?: boolean;
}

export interface TrickCenterProps {
  /** Cards played in the current trick. */
  plays: TrickPlay[];
  /** Seat who won the trick (if determined). */
  winnerSeat?: Seat | null;
  /** Current player indicator. */
  currentSeat?: Seat | null;
}

/**
 * Position a card in the trick center based on seat position.
 * 0 = bottom (player), 1 = right, 2 = top, 3 = left.
 */
export function TrickCenter({ plays, winnerSeat, currentSeat }: TrickCenterProps) {
  if (plays.length === 0) {
    return (
      <View style={styles.container}>
        <Text style={styles.placeholder}>Trick center</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {plays.map(({ seat, cardId, isWinner }) => {
        const pos = getCardPosition(seat);
        return (
          <View
            key={`${seat}-${cardId}`}
            style={[styles.cardSlot, pos]}
          >
            <Card cardId={cardId} size="sm" highlighted={isWinner} />
          </View>
        );
      })}
    </View>
  );
}

/**
 * Get the absolute position for a seat's card in the trick center.
 */
function getCardPosition(seat: Seat): Record<string, number> {
  switch (seat) {
    case 0: // bottom (player)
      return { bottom: 8, left: '50%', transform: [{ translateX: -22 }] };
    case 1: // right
      return { right: 8, top: '50%', transform: [{ translateY: -22 }] };
    case 2: // top (opposite)
      return { top: 8, left: '50%', transform: [{ translateX: -22 }] };
    case 3: // left
      return { left: 8, top: '50%', transform: [{ translateY: -22 }] };
    default:
      return { top: '50%', left: '50%', transform: [{ translateX: -22 }, { translateY: -22 }] };
  }
}

const styles = StyleSheet.create({
  container: {
    width: 200,
    height: 160,
    position: 'relative',
    backgroundColor: 'rgba(0, 0, 0, 0.15)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  placeholder: {
    textAlign: 'center',
    color: 'rgba(255, 255, 255, 0.4)',
    fontSize: 14,
    marginTop: 65,
  },
  cardSlot: {
    position: 'absolute',
  },
});
