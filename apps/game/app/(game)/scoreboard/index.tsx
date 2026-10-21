/**
 * Scoreboard route — placeholder for M2.4.
 *
 * Displays team scores, running totals, bag threshold events.
 */

import { StyleSheet, Text, View } from 'react-native';

export default function ScoreboardScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.heading}>Scoreboard</Text>
      <Text style={styles.hint}>M2.4 — scores, bags, next hand</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  heading: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  hint: {
    fontSize: 14,
    color: '#888',
    fontStyle: 'italic',
  },
});
