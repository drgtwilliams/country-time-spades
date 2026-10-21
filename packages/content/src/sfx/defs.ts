/**
 * SFX definitions — sound effects keyed by event type.
 *
 * Each SFX is a minimal base64-encoded WAV file. These are placeholder
 * tones for M5.3 polish — real SFX should be recorded/produced later.
 *
 * SFX play alongside TTS (never interrupt it). Volume is per-SFX and
 * configurable via AudioPlayer.setSFXVolume().
 */

/** Minimal 200ms silence WAV (16-bit, 44.1kHz, mono) — used as fallback. */
const SILENCE_WAV =
  'UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA=';

/**
 * Generate a short sine-wave WAV at the given frequency and duration.
 * Returns base64-encoded WAV data.
 */
function generateToneWav(hz: number, durationMs: number, volume = 0.5): string {
  const sampleRate = 44100;
  const numSamples = Math.floor(sampleRate * durationMs / 1000);
  const numBytes = 2 * numSamples + 44; // 16-bit PCM + header
  const buffer = new ArrayBuffer(numBytes);
  const view = new DataView(buffer);

  // WAV header
  writeString(view, 0, 'RIFF');
  view.setUint32(4, numBytes - 8, true);
  writeString(view, 8, 'WAVE');
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true); // fmt chunk size
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, 1, true); // mono
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true); // block align
  view.setUint16(34, 16, true); // bits per sample
  writeString(view, 36, 'data');
  view.setUint32(40, numSamples * 2, true);

  // Samples
  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    const env = 1 - i / numSamples; // fade out
    const sample = Math.sin(2 * Math.PI * hz * t) * volume * env * 32767;
    view.setInt16(44 + i * 2, Math.max(-32768, Math.min(32767, sample)), true);
  }

  return btoa(String.fromCharCode(...new Uint8Array(buffer)));
}

function writeString(view: DataView, offset: number, s: string) {
  for (let i = 0; i < s.length; i++) {
    view.setUint8(offset + i, s.charCodeAt(i));
  }
}

// --- SFX definitions ---

/** Card slap — played when a card is thrown. */
export const SFX_CARD_SLAP = {
  name: 'cardSlap',
  data: generateToneWav(800, 80, 0.3),
  volume: 0.4,
};

/** Trick win — short ascending chirp. */
export const SFX_TRICK_WON = {
  name: 'trickWon',
  data: generateToneWav(600, 200, 0.3),
  volume: 0.5,
};

/** Set stinger — dramatic low burst. */
export const SFX_SET = {
  name: 'set',
  data: generateToneWav(150, 500, 0.6),
  volume: 0.7,
};

/** Boston — triumphant fanfare. */
export const SFX_BOSTON = {
  name: 'boston',
  data: generateToneWav(400, 600, 0.5),
  volume: 0.7,
};

/** Nil made — quick success ping. */
export const SFX_NIL_MADE = {
  name: 'nilMade',
  data: generateToneWav(1000, 150, 0.3),
  volume: 0.5,
};

/** Nil caught — descending fail tone. */
export const SFX_NIL_CAUGHT = {
  name: 'nilCaught',
  data: generateToneWav(200, 400, 0.4),
  volume: 0.6,
};

/** Spade break — sharp crack. */
export const SFX_SPADE_BREAK = {
  name: 'spadeBreak',
  data: generateToneWav(300, 120, 0.4),
  volume: 0.5,
};

/** Deal — soft shuffle click. */
export const SFX_DEAL = {
  name: 'deal',
  data: generateToneWav(1200, 60, 0.2),
  volume: 0.3,
};

/** Game over — final chord. */
export const SFX_GAME_OVER = {
  name: 'gameOver',
  data: generateToneWav(350, 800, 0.5),
  volume: 0.6,
};

/** Bag threshold — warning buzz. */
export const SFX_BAG_THRESHOLD = {
  name: 'bagThreshold',
  data: generateToneWav(180, 300, 0.5),
  volume: 0.6,
};

/** Bid confirmed — soft click. */
export const SFX_BID = {
  name: 'bid',
  data: generateToneWav(900, 80, 0.2),
  volume: 0.3,
};

/** Mute/unmute click. */
export const SFX_MUTE_CLICK = {
  name: 'muteClick',
  data: generateToneWav(500, 50, 0.15),
  volume: 0.2,
};

/**
 * Map engine event types to SFX names.
 * Used by the banter effect to play SFX on big moments.
 */
export const EVENT_TO_SFX: Record<string, string> = {
  DealComplete: 'deal',
  BidMade: 'bid',
  TrickWon: 'trickWon',
  Set: 'set',
  Boston: 'boston',
  NilMade: 'nilMade',
  NilCaught: 'nilCaught',
  BreakSpades: 'spadeBreak',
  BagThresholdHit: 'bagThreshold',
  GameOver: 'gameOver',
};

/** All registered SFX definitions. */
export const ALL_SFX: Record<string, SFXDef> = {
  cardSlap: SFX_CARD_SLAP,
  trickWon: SFX_TRICK_WON,
  set: SFX_SET,
  boston: SFX_BOSTON,
  nilMade: SFX_NIL_MADE,
  nilCaught: SFX_NIL_CAUGHT,
  spadeBreak: SFX_SPADE_BREAK,
  deal: SFX_DEAL,
  gameOver: SFX_GAME_OVER,
  bagThreshold: SFX_BAG_THRESHOLD,
  bid: SFX_BID,
  muteClick: SFX_MUTE_CLICK,
};
