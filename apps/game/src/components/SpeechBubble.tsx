/**
 * SpeechBubble — character text overlay.
 *
 * Shows above a seat's avatar, animated fade in/out.
 * M2: simple text. M3: stacked bubbles, relationship-aware content.
 */

import React, { useEffect, useState, useMemo } from 'react';
import { View, Text, StyleSheet, Animated, type StyleProp, type ViewStyle } from 'react-native';

export interface SpeechBubbleProps {
  /** Text to display. */
  text: string;
  /** Whether the bubble is visible. */
  visible: boolean;
  /** Position offset from seat center (x, y in pixels). */
  offset?: { x: number; y: number };
  /** Custom style for the outer container. */
  style?: StyleProp<ViewStyle>;
  /** Auto-hide duration in ms (default 3000). */
  duration?: number;
}

export function SpeechBubble({
  text,
  visible,
  offset = { x: 0, y: -60 },
  style,
  duration = 3000,
}: SpeechBubbleProps) {
  const opacity = useMemo(() => new Animated.Value(0), []);
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (!visible) {
      Animated.timing(opacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start(() => setShow(false));
      return;
    }

    if (!show) {
      setShow(true);
      Animated.timing(opacity, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }

    // Auto-hide after duration
    const timer = setTimeout(() => {
      Animated.timing(opacity, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }, duration);

    return () => clearTimeout(timer);
  }, [visible, duration, opacity, show]);

  if (!show) return null;

  return (
    <View
      style={[
        styles.container,
        { left: offset.x, top: offset.y },
        style,
      ]}
    >
      <View style={styles.bubble}>
        <Text style={styles.text} numberOfLines={2}>
          {text}
        </Text>
      </View>
      <View style={styles.arrow} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    zIndex: 10,
  },
  bubble: {
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    maxWidth: 180,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  text: {
    color: '#fff',
    fontSize: 13,
    lineHeight: 18,
  },
  arrow: {
    width: 0,
    height: 0,
    borderLeftWidth: 6,
    borderRightWidth: 6,
    borderTopWidth: 8,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: 'rgba(0, 0, 0, 0.85)',
    marginLeft: 16,
  },
});
