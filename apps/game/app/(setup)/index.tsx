/**
 * Setup screen — "Set up the table".
 *
 * User picks a house-rule preset or customizes settings, then starts a game.
 * This is the entry point before any engine state exists.
 *
 * M4: "Multiplayer" button navigates to lobby for friend invites.
 * M5.4: per-character voice toggles, player STT toggle, all voice settings passed to table.
 */

import { useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  View,
  Pressable,
  Switch,
  TextInput,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { HOUSE_RULE_PRESETS, type HouseRulePreset, CAST_MEMBERS, getVoiceMapping } from 'content';
import { GameSession } from 'app-core';
import type { GameConfig } from 'engine';

/** Default preset key shown on first render. */
const DEFAULT_PRESET_KEY = 'cookout';

/** A local editable copy of a preset's config. */
interface EditableConfig extends GameConfig {
  presetKey: string;
  /** Pass-and-play mode: no AI auto-play. */
  passAndPlay: boolean;
  /** Number of AI players (0-3). */
  aiCount: number;
}

export default function SetupScreen() {
  const router = useRouter();

  const [presetKey, setPresetKey] = useState<string>(DEFAULT_PRESET_KEY);
  const [passAndPlay, setPassAndPlay] = useState(false);
  const [editable, setEditable] = useState<EditableConfig>(() => ({
    ...HOUSE_RULE_PRESETS[DEFAULT_PRESET_KEY].config,
    presetKey: DEFAULT_PRESET_KEY,
    passAndPlay: false,
    aiCount: 3,
  }));

  // Voice settings
  const [avatarVoice, setAvatarVoice] = useState(true);
  const [announcerVoice, setAnnouncerVoice] = useState(true);
  const [ttsSpeed, setTTSSpeed] = useState(1);
  const [voiceInputEnabled, setVoiceInputEnabled] = useState(false);

  // Per-character voice toggles (keyed by character id)
  const [characterVoices, setCharacterVoices] = useState<Record<string, boolean>>(() => {
    const map: Record<string, boolean> = {};
    for (const c of CAST_MEMBERS) {
      map[c.id] = c.id !== 'silent-sam'; // Sam is silent by design
    }
    return map;
  });

  const currentPresetName = HOUSE_RULE_PRESETS[presetKey]?.name ?? presetKey;

  /** Merge preset defaults into editable config, then validate. */
  function handleStartGame() {
    try {
      // Validate the config against engine rules
      import('engine').validateConfig(editable);

      const session = new GameSession({
        config: editable,
        seed: `m2-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      });

      // Navigate to table with config + seed
      router.push({
        pathname: '(game)/table',
        params: {
          seed: session.state.seed,
          deckMode: editable.deckMode,
          allowNil: String(editable.allowNil),
          allowBlindNil: String(editable.allowBlindNil),
          nilBonus: String(editable.nilBonus),
          nilPenalty: String(editable.nilPenalty),
          blindNilBonus: String(editable.blindNilBonus),
          blindNilPenalty: String(editable.blindNilPenalty),
          bagPenaltyEnabled: String(editable.bagPenaltyEnabled),
          bagThreshold: String(editable.bagThreshold),
          bagPenalty: String(editable.bagPenalty),
          targetScore: String(editable.targetScore),
          passAndPlay: String(passAndPlay),
          aiCount: String(editable.aiCount),
          ttsVolume: String(0.7),
          ttsRate: String(ttsSpeed),
          avatarVoice: String(avatarVoice),
          announcerVoice: String(announcerVoice),
          voiceInput: String(voiceInputEnabled),
        },
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to start game';
      Alert.alert('Invalid Settings', message);
    }
  }

  /** Update a numeric config value. */
  function setNumeric<K extends keyof GameConfig>(key: K, value: string) {
    const num = parseInt(value, 10);
    if (isNaN(num)) return;
    setEditable((prev) => ({ ...prev, [key]: num }));
  }

  /** Toggle a boolean config value. */
  function setBoolean<K extends keyof GameConfig>(key: K, value: boolean) {
    setEditable((prev) => ({ ...prev, [key]: value }));
  }

  /** Select a preset and merge its defaults. */
  function selectPreset(key: string) {
    const preset = HOUSE_RULE_PRESETS[key];
    if (!preset) return;
    setPresetKey(key);
    setEditable((prev) => ({ ...preset.config, presetKey: key }));
  }

  /** Toggle a single character's voice. */
  function toggleCharacterVoice(charId: string) {
    setCharacterVoices((prev) => ({ ...prev, [charId]: !prev[charId] }));
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Set up the Table</Text>

      {/* Preset selector */}
      <Text style={styles.sectionLabel}>House Rule Preset</Text>
      <View style={styles.presetRow}>
        {Object.keys(HOUSE_RULE_PRESETS).map((key) => (
          <Pressable
            key={key}
            style={[styles.presetBtn, presetKey === key && styles.presetBtnActive]}
            onPress={() => selectPreset(key)}
          >
            <Text style={[styles.presetBtnText, presetKey === key && styles.presetBtnTextActive]}>
              {HOUSE_RULE_PRESETS[key].name}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* Deck mode (read-only, derived from preset) */}
      <Text style={styles.sectionLabel}>Deck Mode</Text>
      <Text style={styles.valueText}>{editable.deckMode}</Text>

      {/* Nil settings */}
      <Text style={styles.sectionLabel}>Nil Settings</Text>
      <View style={styles.row}>
        <Text style={styles.label}>Allow Nil</Text>
        <Switch
          value={editable.allowNil}
          onValueChange={(v) => setBoolean('allowNil', v)}
        />
      </View>
      {editable.allowNil && (
        <>
          <View style={styles.row}>
            <Text style={styles.label}>Allow Blind Nil</Text>
            <Switch
              value={editable.allowBlindNil}
              onValueChange={(v) => setBoolean('allowBlindNil', v)}
            />
          </View>
          <NumberInput label="Nil Bonus" value={editable.nilBonus} onChange={(v) => setNumeric('nilBonus', v)} />
          <NumberInput label="Nil Penalty" value={editable.nilPenalty} onChange={(v) => setNumeric('nilPenalty', v)} />
        </>
      )}

      {/* Bag settings */}
      <Text style={styles.sectionLabel}>Bag Settings</Text>
      <View style={styles.row}>
        <Text style={styles.label}>Bag Penalty</Text>
        <Switch
          value={editable.bagPenaltyEnabled}
          onValueChange={(v) => setBoolean('bagPenaltyEnabled', v)}
        />
      </View>
      {editable.bagPenaltyEnabled && (
        <>
          <NumberInput label="Bag Threshold" value={editable.bagThreshold} onChange={(v) => setNumeric('bagThreshold', v)} />
          <NumberInput label="Bag Penalty" value={editable.bagPenalty} onChange={(v) => setNumeric('bagPenalty', v)} />
        </>
      )}

      {/* Target score */}
      <NumberInput label="Target Score" value={editable.targetScore} onChange={(v) => setNumeric('targetScore', v)} />

      {/* Play mode */}
      <Text style={styles.sectionLabel}>Play Mode</Text>
      <View style={styles.row}>
        <Text style={styles.label}>Pass-and-Play</Text>
        <Switch
          value={passAndPlay}
          onValueChange={(v) => {
            setPassAndPlay(v);
            setEditable((prev) => ({ ...prev, passAndPlay: v }));
          }}
        />
      </View>
      {!passAndPlay && (
        <View style={styles.row}>
          <Text style={styles.label}>AI Players</Text>
          <View style={styles.aiCountRow}>
            {[0, 1, 2, 3].map((n) => (
              <Pressable
                key={n}
                style={[
                  styles.aiCountBtn,
                  editable.aiCount === n && styles.aiCountBtnActive,
                ]}
                onPress={() => {
                  setEditable((prev) => ({ ...prev, aiCount: n }));
                }}
              >
                <Text style={[
                  styles.aiCountBtnText,
                  editable.aiCount === n && styles.aiCountBtnTextActive,
                ]}>
                  {n}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
      )}

      {/* Voice settings */}
      <Text style={styles.sectionLabel}>Voice</Text>
      <View style={styles.row}>
        <Text style={styles.label}>Avatar Voice</Text>
        <Switch value={avatarVoice} onValueChange={setAvatarVoice} />
      </View>
      <View style={styles.row}>
        <Text style={styles.label}>Announcer Voice</Text>
        <Switch value={announcerVoice} onValueChange={setAnnouncerVoice} />
      </View>
      <View style={styles.row}>
        <Text style={styles.label}>TTS Speed</Text>
        <View style={styles.ttsSpeedRow}>
          {[0.75, 1, 1.25, 1.5].map((s) => (
            <Pressable
              key={s}
              style={[
                styles.ttsSpeedBtn,
                Math.abs(ttsSpeed - s) < 0.01 && styles.ttsSpeedBtnActive,
              ]}
              onPress={() => setTTSSpeed(s)}
            >
              <Text style={[
                styles.ttsSpeedBtnText,
                Math.abs(ttsSpeed - s) < 0.01 && styles.ttsSpeedBtnTextActive,
              ]}>
                {s}x
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      {/* Player STT toggle */}
      <View style={styles.row}>
        <Text style={styles.label}>Voice Input</Text>
        <Switch
          value={voiceInputEnabled}
          onValueChange={setVoiceInputEnabled}
        />
      </View>

      {/* Per-character voice toggles */}
      <Text style={styles.charVoicesLabel}>Character Voices</Text>
      {CAST_MEMBERS.filter((c) => c.active).map((c) => (
        <View key={c.id} style={[styles.row, styles.charVoiceRow]}>
          <Text style={styles.charVoiceName}>{c.name}</Text>
          <Switch
            value={characterVoices[c.id] ?? true}
            onValueChange={() => toggleCharacterVoice(c.id)}
            disabled={c.id === 'silent-sam'}
          />
        </View>
      ))}

      {/* Play button */}
      <Pressable style={styles.playBtn} onPress={handleStartGame}>
        <Text style={styles.playBtnText}>Play</Text>
      </Pressable>

      {/* Multiplayer button */}
      <Pressable
        style={styles.multiplayerBtn}
        onPress={() => router.push('/(lobby)')}
      >
        <Text style={styles.multiplayerBtnText}>Multiplayer</Text>
      </Pressable>
    </ScrollView>
  );
}

/** Numeric input field for game config values. */
function NumberInput({ label, value, onChange }: {
  label: string;
  value: number;
  onChange: (val: string) => void;
}) {
  return (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={styles.numberInput}
        keyboardType="numeric"
        value={String(value)}
        onChangeText={onChange}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    padding: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  sectionLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
  },
  presetRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  presetBtn: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ccc',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  presetBtnActive: {
    backgroundColor: '#2563eb',
    borderColor: '#2563eb',
  },
  presetBtnText: {
    fontSize: 13,
    color: '#333',
  },
  presetBtnTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  label: {
    fontSize: 15,
    flex: 1,
  },
  valueText: {
    fontSize: 15,
    padding: 8,
    backgroundColor: '#fff',
    borderRadius: 4,
  },
  numberInput: {
    width: 60,
    padding: 8,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 4,
    textAlign: 'right',
    fontSize: 15,
  },
  aiCountRow: {
    flexDirection: 'row',
    gap: 8,
  },
  aiCountBtn: {
    width: 44,
    height: 44,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ccc',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
  aiCountBtnActive: {
    backgroundColor: '#2563eb',
    borderColor: '#2563eb',
  },
  aiCountBtnText: {
    fontSize: 18,
    color: '#333',
    fontWeight: '600',
  },
  aiCountBtnTextActive: {
    color: '#fff',
  },
  playBtn: {
    marginTop: 24,
    paddingVertical: 16,
    backgroundColor: '#2563eb',
    borderRadius: 12,
    alignItems: 'center',
  },
  playBtnText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  multiplayerBtn: {
    marginTop: 12,
    paddingVertical: 16,
    backgroundColor: '#16213E',
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#2563eb',
  },
  multiplayerBtnText: {
    color: '#60a5fa',
    fontSize: 18,
    fontWeight: 'bold',
  },
  ttsSpeedRow: {
    flexDirection: 'row',
    gap: 6,
  },
  ttsSpeedBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#ccc',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  ttsSpeedBtnActive: {
    backgroundColor: '#2563eb',
    borderColor: '#2563eb',
  },
  ttsSpeedBtnText: {
    fontSize: 14,
    color: '#333',
    fontWeight: '600',
  },
  ttsSpeedBtnTextActive: {
    color: '#fff',
  },
  charVoicesLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#555',
    marginTop: 8,
    marginBottom: 4,
    paddingLeft: 4,
  },
  charVoiceRow: {
    paddingLeft: 4,
  },
  charVoiceName: {
    fontSize: 14,
    flex: 1,
  },
});
