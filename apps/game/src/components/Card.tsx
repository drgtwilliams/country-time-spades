/**
 * Card component — renders a single playing card.
 *
 * Color-blind safe, works at all sizes, supports face-up and face-down.
 * Renders rank + suit symbols, jokers get special treatment.
 */

import React from 'react';
import { View, Text, StyleSheet, type ViewStyle, type TextStyle } from 'react-native';
import { getCardDisplay, type CardDisplay } from '../utils/cardDisplay';

export interface CardProps {
  /** Card ID from engine (e.g. 'S14', 'JB'). */
  cardId: string;
  /** Show card face-down (back pattern). */
  faceDown?: boolean;
  /** Card size preset. */
  size?: 'sm' | 'md' | 'lg';
  /** Highlight this card (e.g. selected, legal lead). */
  highlighted?: boolean;
  /** Dim this card (not legal to play). */
  dimmed?: boolean;
  /** Additional style. */
  style?: ViewStyle;
  /** Press handler — optional, for tap-to-play. */
  onPress?: () => void;
}

export const CARD_SIZES = {
  sm: { width: 40, height: 56, fontSize: 12, symbolSize: 10 },
  md: { width: 60, height: 84, fontSize: 16, symbolSize: 13 },
  lg: { width: 90, height: 126, fontSize: 22, symbolSize: 18 },
} as const;

export function Card({
  cardId,
  faceDown = false,
  size = 'md',
  highlighted = false,
  dimmed = false,
  style,
  onPress,
}: CardProps) {
  const display = faceDown ? null : getCardDisplay(cardId);
  const dims = CARD_SIZES[size];

  return (
    <View
      style={[
        styles.container,
        { width: dims.width, height: dims.height, borderRadius: dims.width / 10 },
        highlighted && styles.highlighted,
        dimmed && styles.dimmed,
        style,
      ]}
      onPress={onPress}
      accessible={true}
      accessibilityLabel={faceDown ? 'Face down card' : `${getDisplayLabel(display)}${cardId}`}
      testID={`card-${cardId}`}
    >
      {faceDown ? (
        <View style={[styles.faceDown, { borderRadius: dims.width / 10 }]} />
      ) : display ? (
        <>
          {/* Top-left rank + suit */}
          <View style={[styles.corner, styles.topLeft]}>
            <Text style={[styles.rankText, { fontSize: dims.fontSize, color: display.color }]}>
              {display.rankLabel}
            </Text>
            <Text style={[styles.suitText, { fontSize: dims.symbolSize, color: display.color }]}>
              {display.suitSymbol}
            </Text>
          </View>

          {/* Center symbol */}
          {display.isJoker ? (
            <Text style={[styles.centerJoker, { fontSize: dims.fontSize }]}>{display.rankLabel}</Text>
          ) : (
            <Text style={[styles.centerSuit, { fontSize: dims.symbolSize * 2.2, color: display.color }]}>
              {display.suitSymbol}
            </Text>
          )}

          {/* Bottom-right rank + suit (rotated) */}
          <View style={[styles.corner, styles.bottomRight]}>
            <Text style={[styles.rankText, { fontSize: dims.fontSize, color: display.color }]}>
              {display.rankLabel}
            </Text>
            <Text style={[styles.suitText, { fontSize: dims.symbolSize, color: display.color }]}>
              {display.suitSymbol}
            </Text>
          </View>
        </>
      )}
    </View>
  );
}

function getDisplayLabel(display: CardDisplay | null): string {
  if (!display) return '';
  if (display.isJoker) return display.jokerKind === 'big' ? 'Big Joker' : 'Little Joker';
  return `${display.rankLabel}${display.suit}`;
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#999',
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 2,
    shadowColor: '#000',
    shadowOffset: { width: 1, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  highlighted: {
    borderColor: '#2563eb',
    borderWidth: 3,
  },
  dimmed: {
    opacity: 0.4,
  },
  faceDown: {
    flex: 1,
    backgroundColor: '#2563eb',
    borderWidth: 1,
    borderColor: '#fff',
    borderRadius: 4,
    margin: 3,
  },
  corner: {
    position: 'absolute',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
  },
  topLeft: {
    top: 3,
    left: 3,
  },
  bottomRight: {
    bottom: 3,
    right: 3,
    transform: [{ rotate: '180deg' }],
  },
  rankText: {
    fontWeight: 'bold',
    lineHeight: undefined,
  },
  suitText: {
    lineHeight: undefined,
  },
  centerSuit: {
    textAlign: 'center',
  },
  centerJoker: {
    textAlign: 'center',
    fontWeight: 'bold',
  },
});
