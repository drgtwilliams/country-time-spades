/**
 * Table view — skeleton for M2.2-2.3.
 *
 * Displays the current game state (phase, dealer, current actor).
 * Card rendering, bid pad, and trick loop come in subsequent phases.
 */

import { useLocalSearchParams } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

export default function TableView() {
  const { seed } = useLocalSearchParams<{ seed: string }>();

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>Table</Text>
      <Text style={styles.info}>Seed: {seed}</Text>
      <Text style={styles.hint}>Phase, cards, and bid pad — M2.2</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a5c2a',
    justifyContent: 'center',
    alignItems: 'center',
  },
  heading: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  info: {
    color: '#aaddbb',
    fontSize: 16,
    marginBottom: 6,
  },
  hint: {
    color: '#88bb99',
    fontSize: 14,
    marginTop: 16,
    fontStyle: 'italic',
  },
});
