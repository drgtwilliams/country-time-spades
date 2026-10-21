# M5: Voice — TTS for Avatars + Optional Player STT

> **Milestone gate:** M4 is complete. Per CLAUDE.md workflow: "do not start coding a milestone without the user's approval of its plan."

## What M5 delivers

**Text-first parity always.** Every voice feature works perfectly with zero audio. The voice layer is an *overlay* on the existing text banter system — it never replaces or degrades text.

### Key outcomes

1. **Avatar TTS** — each of the 6 characters speaks their banter lines via TTS, with text displayed simultaneously
2. **Player STT** — optional voice input for bids (player says "five" → bid 5), text always co-present
3. **Announcer voice** — special event beats get a dedicated announcer TTS voice
4. **Configurable voice** — per-character voice selection, on/off toggles, text-voice sync
5. **On-device by default** — no mic data leaves the device without consent

## 1. Architecture decisions

### TTS approach

**Decision: Expo-compatible TTS using `expo-av` + `ReactNativeTTS` or native `AVSpeechSynthesizer` (iOS) / `TextToSpeech` (web).**

For M5, we use the platform's built-in TTS:
- **iOS:** `AVSpeechSynthesizer` (via `ReactNativeTTS`) — good quality, native voices
- **Web:** Web Speech API (`window.speechSynthesis`) — no native voices available, but functional
- **Android:** `TextToSpeech` engine — falls back to system default

**Why not ElevenLabs API?** The user's model-recommendations doc says to prototype on free/local first. ElevenLabs is the *final* polish choice for hero characters. M5 prototypes with system TTS.

### STT approach

**Decision: On-device STT via `react-native-voice` (offline-capable) for iOS, Web Speech API for web.**

- Player can speak bids instead of tapping the pad
- Text of what was recognized shown in real-time
- Fallback to text input always available
- No data leaves device

### Text-voice architecture

```
EngineEvent → BanterSelector → DisplayBanterLine[] → { text, ttsUrl? }
                                                  → SpeechBubble (text)
                                                  → TTSPlayer (voice)
```

The existing `DisplayBanterLine` interface already has `text: string`. We add:
- `speaking: boolean` — is this line currently being spoken?
- `ttsQueued: boolean` — was it sent to the TTS queue?

The TTS layer reads `DisplayBanterLine.text` and speaks it. No phrase changes needed.

### Per-character voice config

Each cast member gets a `voiceId` (TTS voice identifier) in their definition. The banter selector passes the speaker's `voiceId` to the TTS player. The TTS player queues speech with per-character voice selection.

```typescript
interface CastMember {
  name: string;
  voiceId?: string;  // TTS voice identifier (platform-dependent)
  // ... existing fields
}
```

### Voice config screen

The setup screen gets a "Voice" section:
- **Avatar Voice:** On/Off toggle (default: On)
- **Announcer Voice:** On/Off toggle (default: On)
- **Per-character toggles:** Each character's voice can be toggled independently
- **Player STT:** On/Off toggle (default: Off, text-first)
- **Speed:** Slider for TTS rate (0.5x – 2x)

## 2. Per-phase deliverables

### M5.1: TTS infrastructure + avatar voice

**Deliverables:**
- `packages/app-core/src/tts.ts` — `TTSPlayer` class:
  - `speak(text: string, voiceId?: string)` — queue a line for TTS
  - `cancel()` — stop current speech
  - `setVolume(volume: number)` — volume control
  - `setRate(rate: number)` — speech rate control
  - `onSpeakEnd(callback)` — hook for auto-dismissing speech bubbles
  - Per-voice selection via voice ID
  - Queue management (FIFO, no overlap)
- `packages/app-core/src/stt.ts` — `STTPlayer` class (stub, M5.2):
  - `startListening()` — begin recognition
  - `stopListening()` — stop and return recognized text
  - `onResult(callback)` — real-time text feedback
- `content/cast/voices.json` — per-character TTS voice mappings (platform-specific)
- Setup screen: avatar voice toggle, speed slider
- **Verification:** A banter line triggers TTS with character's voice, text displayed simultaneously

### M5.2: Player STT + bid voice input

**Deliverables:**
- `STTPlayer` fully implemented:
  - `react-native-voice` for iOS (offline capable)
  - Web Speech API for web
  - Real-time transcription displayed on bid pad
  - "Tap to speak" button replaces tap-to-bid
  - Confidence threshold filtering
- Bid pad: voice input mode with real-time text feedback
- "Recognized: [text]" confirmation before confirming bid
- **Verification:** Say "five" → bid pad shows "five" → confirm → bid 5 made

### M5.3: Announcer voice + sound effects + polish

**Deliverables:**
- Announcer TTS for special beats (BreakSpades, Set, Boston, GameOver)
- SFX layer: card-slap on trick completion, mild stinger on Set/Boston
- `packages/app-core/src/audio.ts` — `AudioPlayer` class:
  - Short SFX via base64-encoded audio (no external assets needed)
  - Volume-per-channel mixing (TTS, SFX, ambience)
- Voice config: per-character voice toggles
- Mute button on table layout
- **Verification:** Full hand plays with voice — banter spoken, SFX layered, announcer on big moments

## 3. Key components

### `TTSPlayer` (app-core)

```typescript
export class TTSPlayer {
  private queue: Array<{ text: string; voiceId?: string }> = [];
  private isSpeaking = false;
  private volume = 1;
  private rate = 1;
  private enabled = true;

  speak(text: string, voiceId?: string): void {
    if (!this.enabled) return;
    this.queue.push({ text, voiceId });
    this.processQueue();
  }

  private async processQueue(): Promise<void> {
    if (this.isSpeaking || this.queue.length === 0) return;
    this.isSpeaking = true;

    const { text, voiceId } = this.queue.shift()!;
    // Platform-specific TTS call:
    // iOS: ReactNativeTTS.speak(text, { engine: voiceId, rate: this.rate })
    // Web: const utter = new SpeechSynthesisUtterance(text); utter.voice = findVoice(voiceId);
    // speechSynthesis.speak(utter);

    this.isSpeaking = false;
    // Recursively process next
    this.processQueue();
  }

  cancel(): void {
    this.queue = [];
    this.isSpeaking = false;
    // Platform-specific cancel
  }

  setVolume(v: number): void { this.volume = v; }
  setRate(r: number): void { this.rate = r; }
  setEnabled(on: boolean): void { this.enabled = on; }
}
```

### `STTPlayer` (app-core)

```typescript
export type STTListener = (text: string, confidence: number) => void;

export class STTPlayer {
  private listening = false;
  private listeners: STTListener[] = [];
  private recognition: any = null; // Platform-specific recognizer

  startListening(language = 'en-US'): void {
    // iOS: VoiceManager.shared().start(language, token)
    // Web: recognition = new webkitSpeechRecognition(); recognition.continuous = false;
    this.listening = true;
  }

  stopListening(): string | null {
    // Return the final recognized text
    this.listening = false;
    return this.lastTranscript ?? null;
  }

  addListener(listener: STTListener): void {
    this.listeners.push(listener);
  }

  private onResult(text: string, confidence: number): void {
    for (const l of this.listeners) {
      l(text, confidence);
    }
  }
}
```

### Voice config in setup screen

```
Voice Settings
┌─────────────────────────────────┐
│ Avatar Voice        [●] On      │
│ Announcer Voice     [●] On      │
│ TTS Speed           [====|====] 1x │
│ Player STT          [○] Off     │
└─────────────────────────────────┘
Per-Character Voices (expandable)
├─ Cookout Queen     [●] On  (Voice: Amy)
├─ Big Man           [●] On  (Voice: Marcus)
├─ Math Boy          [●] On  (Voice: Kai)
├─ Silent Sam        [○] Off (Voice: N/A)
├─ Auntie Pearl      [●] On  (Voice: Gloria)
└─ Cousin Ray        [●] On  (Voice: Ray)
```

### Muted state on table

```
apps/game/app/(game)/table/index.tsx
┌─────────────────────────────────────┐
│ [🔊 Mute]  (top-right corner)       │
│                                     │
│        ♠  ♣  ♦  ♥                  │
│    ┌──────────────────┐            │
│    │                  │            │
│  N │   Trick Center   │  E         │
│    │                  │            │
│    └──────────────────┘            │
│  S  ─ Hand ─────────────────── W    │
│                                     │
│  [Speech Bubbles Zone]              │
└─────────────────────────────────────┘
```

## 4. Testing strategy

### TTS tests
- TTSPlayer queues and processes lines in order
- Cancel clears queue and stops speech
- Disabled TTS rejects all speak calls
- Rate/volume changes apply to subsequent utterances

### STT tests
- STTPlayer starts/stops listening
- Recognized text passed to listeners
- Confidence filtering works (low-confidence results dropped)

### Integration tests
- Banter line → TTS speaks, speech bubble shows simultaneously
- Voice bid → STT recognizes "five" → displays text → confirms bid
- Mute button stops all TTS immediately

## 5. Risk areas and mitigations

### Risk: System TTS voices don't sound culturally appropriate
**Mitigation:** M5 uses system voices as a baseline. The quality bar for the *final* voice layer is reviewed against cultural respect standards. ElevenLabs custom voices or real human speech is the target for M5 polish, but system TTS proves the architecture.

### Risk: Web Speech API voices are robotic
**Mitigation:** Expected. The web target has no native TTS voices beyond what the browser ships. Text-first is the parity guarantee. Voice is a nice-to-have on web; the experience is equally playable.

### Risk: STT permissions on iOS
**Mitigation:** `react-native-voice` handles permission requests. App must include `NSMicrophoneUsageDescription` in `app.json` infoPlist. Graceful fallback to text if permission denied.

### Risk: TTS conflicts with speech bubbles timing
**Mitigation:** TTS processes FIFO. Speech bubbles auto-dismiss when TTS completes (or after a fixed timeout, whichever is longer). If TTS is off, bubbles use the fixed timeout.

## 6. Definition of done

M5 is complete when ALL of the following are true:

1. **Avatar TTS works** — banter lines are spoken via TTS with text displayed simultaneously
2. **Per-character voice selection** — each character has a distinct TTS voice (system voices)
3. **Player STT works** — voice input for bids, text shown in real-time, text input always available
4. **Mute button** — one tap stops all TTS immediately
5. **Voice config** — toggles for avatar voice, announcer voice, per-character voices, TTS speed
6. **Text-first parity** — game is fully playable with voice disabled (this is the default assumption)
7. **Announcer voice** — special beats (Set, Boston, GameOver) get announcer TTS
8. **On-device privacy** — no voice data leaves the device
9. **Tests** — TTSPlayer and STTPlayer tests green

## 7. Milestone sequence

```
M1 ✓  Rules engine
M2 ✓  Playable table
M3 ✓  Personality layer
M4 ✓  Live-table server

M5.1  TTS infrastructure + avatar voice    (~3 days)
M5.2  Player STT + bid voice input        (~2 days)
M5.3  Announcer voice + SFX + polish      (~2 days)

M5.5  Look-and-feel review (voice polish)  ← user gates final voice quality
```

## 8. Immediate next steps after approval

1. Create `TTSPlayer` in `app-core` with iOS + web support
2. Create `STTPlayer` in `app-core` with iOS + web support
3. Add voice config to setup screen
4. Wire TTS into banter display (SpeechBubble → TTSPlayer)
5. Add voice input to bid pad
6. Add mute button to table layout
7. Commit after each verified phase
8. Test with actual voices before claiming done
