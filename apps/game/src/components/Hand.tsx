/**
 * Hand component — renders a player's hand of cards.
 *
 * Horizontal layout on mobile, selectable cards for trick play.
 * Touch-friendly with minimum 44px tap targets.
 */

import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, type ViewStyle } from 'react-native';
import { Card } from './Card';
import type { CardProps } from './Card';
import type { Seat } from 'engine';

export interface HandProps {
  /** Card IDs in this hand. */
  cards: string[];
  /** Seat this hand belongs to. */
  seat: Seat;
  /** Selected card IDs. */
  selected?: string[];
  /** Card IDs that should be dimmed (not legal). */
  dimmed?: string[];
  /** Whether this hand can be tapped to select cards. */
  selectable?: boolean;
  /** Called when a card is tapped. */
  onSelectCard?: (cardId: string, seat: Seat) => void;
  /** Label shown above the hand (e.g. seat name + bid). */
  label?: string;
  /** Whether this is the current actor's turn. */
  isCurrentTurn?: boolean;
  /** Custom container style. */
  style?: ViewStyle;
}

export function Hand({
  cards,
  seat,
  selected = [],
  dimmed = [],
  selectable = false,
  onSelectCard,
  label,
  isCurrentTurn = false,
  style,
}: HandProps) {
  const handlePress = useMemo(() => {
    if (!selectable || !onSelectCard) return undefined;
    return (cardId: string) => {
      onSelectCard(cardId, seat);
    };
  }, [selectable, onSelectCard, seat]);

  return (
    <View style={[styles.container, style]}>
      {label && (
        <Text style={[styles.label, isCurrentTurn && styles.labelActive]}>
          {label}
        </Text>
      )}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.cardRow}
        keyboardShouldPersistTaps="handled"
      >
        {cards.map((cardId) => {
          const isSelected = selected.includes(cardId);
          const isDimmed = dimmed.includes(cardId);
          return (
            <Card
              key={cardId}
              cardId={cardId}
              highlighted={isSelected}
              dimmed={isDimmed}
              size="md"
              onPress={handlePress}
            />
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
  },
  label: {
    fontSize: 14,
    color: '#ccc',
    marginBottom: 6,
    textAlign: 'center',
  },
  labelActive: {
    color: '#ffd700',
    fontWeight: 'bold',
  },
  cardRow: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    minHeight: 90,
    alignItems: 'center',
  },
});
