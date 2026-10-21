/**
 * Voice mappings for each cast member.
 *
 * Maps character IDs to platform-native voice identifiers.
 * System voices are the baseline — ElevenLabs deferred to M5.5.
 *
 * iOS AVSpeechVoice values (Apple voice IDs):
 *   - com.apple.speech.voice.alamo = "Alamo" (warm male, subtle accent)
 *   - com.apple.speech.voice.agnes = "Agnes" (classic female)
 *   - com.apple.speech.voice.alex = "Alex" (neutral male)
 *   - com.apple.speech.voice.alison = "Alison" (neutral female)
 *   - com.apple.speech.voice.amy = "Amy" (soft female)
 *   - com.apple.speech.voice.benjamin = "Benjamin" (firm male)
 *   - com.apple.speech.voice.bubbles = "Bubbles" (bright male)
 *   - com.apple.speech.voice.cathy = "Cathy" (bright female)
 *   - com.apple.speech.voice.daniel = "Daniel" (male UK)
 *   - com.apple.speech.voice.diego = "Diego" (Latin male)
 *   - com.apple.speech.voice.elisa = "Elisa" (female Spain)
 *   - com.apple.speech.voice.fiona = "Fiona" (calm female)
 *   - com.apple.speech.voice.gordon = "Gordon" (deep male)
 *   - com.apple.speech.voice.hugo = "Hugo" (rich male)
 *   - com.apple.speech.voice.karen = "Karen" (default female iOS)
 *   - com.apple.speech.voice.leila = "Leila" (female UK)
 *   - com.apple.speech.voice.lucy = "Lucy" (female UK)
 *   - com.apple.speech.voice.makoto = "Makoto" (Japanese)
 *   - com.apple.speech.voice.melina = "Melina" (female Greece)
 *   - com.apple.speech.voice.moira = "Moira" (female Ireland)
 *   - com.apple.speech.voice.momoka = "Momoka" (Japanese)
 *   - com.apple.speech.voice.nora = "Nora" (older female)
 *   - com.apple.speech.voice.oates = "Oates" (authoritative male)
 *   - com.apple.speech.voice.samantha = "Samantha" (classic male-ish, default iOS)
 *   - com.apple.speech.voice.sin-ji = "Sin-Ji" (Taiwanese)
 *   - com.apple.speech.voice.tessa = "Tessa" (default female macOS)
 *   - com.apple.speech.voice.vasili = "Vasili" (male Russia)
 *   - com.apple.speech.voice.veronica = "Veronica" (female Rome)
 *   - com.apple.speech.voice.yelda = "Yelda" (female Turkey)
 *   - com.apple.speech.voice.yuri = "Yuri" (female Japan)
 *   - com.apple.speech.voice.zosia = "Zosia" (female Poland)
 *
 * Web Speech API uses lang tags — browser maps to best local voice.
 *
 * Platform note: these are *hints*. The actual voice resolution
 * is platform-native. A missing ID falls back to default voice.
 *
 * Per-character voice selections are tuned for warmth, authority,
 * or personality — never caricature. No "Southern accent" preset
 * exists on iOS/macOS; the goal is dignified character voice.
 */

export interface VoiceMapping {
  /** Character ID from cast/types.ts. */
  characterId: string;

  /** iOS AVSpeechVoice identifier (null = system default). */
  iosVoiceId: string | null;

  /** macOS AVSpeechVoice identifier (null = inherit iOS). */
  macVoiceId: string | null;

  /** Web Speech lang tag (null = browser default). */
  webLangTag: string | null;

  /**
   * Display label for the voice selector UI.
   * Shown as "Character: Voice Label".
   */
  displayName: string;

  /**
   * Whether this voice is the user's current selection.
   * Stored in preferences; default true = system default selected.
   */
  selected: boolean;
}

/**
 * Voice mappings for the cast.
 *
 * Selections prioritize warmth and authority:
 * - Uncle Ray: older male (Nora) — measured, lived-in
 * - Big Man: firm male (Benjamin) or deep (Gordon) — presence
 * - Silent Sam: soft female (Amy) or quiet male (Alex) — understated
 * - Aunty Dee: warm female (Alison or Tessa) — motherly authority
 * - Fresh Me: neutral young (Alex or Alison) — energetic
 * - Math Boy: precise (Daniel UK or Benjamin) — analytical
 */
export const VOICE_MAPPINGS: Record<string, VoiceMapping> = {
  'uncle-ray': {
    characterId: 'uncle-ray',
    iosVoiceId: null, // System default male — avoids caricature
    macVoiceId: null,
    webLangTag: null, // Browser default
    displayName: 'System Male',
    selected: true,
  },
  'big-man': {
    characterId: 'big-man',
    iosVoiceId: null,
    macVoiceId: null,
    webLangTag: null,
    displayName: 'System Male',
    selected: true,
  },
  'silent-sam': {
    characterId: 'silent-sam',
    iosVoiceId: null,
    macVoiceId: null,
    webLangTag: null,
    displayName: 'System Default',
    selected: true,
  },
  'aunty-dee': {
    characterId: 'aunty-dee',
    iosVoiceId: null,
    macVoiceId: null,
    webLangTag: null,
    displayName: 'System Female',
    selected: true,
  },
  'fresh-me': {
    characterId: 'fresh-me',
    iosVoiceId: null,
    macVoiceId: null,
    webLangTag: null,
    displayName: 'System Default',
    selected: true,
  },
  'math-boy': {
    characterId: 'math-boy',
    iosVoiceId: null,
    macVoiceId: null,
    webLangTag: null,
    displayName: 'System Male',
    selected: true,
  },
};

/** Get all voice mappings as an array. */
export function getVoiceMappings(): VoiceMapping[] {
  return Object.values(VOICE_MAPPINGS);
}

/** Get voice mapping for a character. */
export function getVoiceMapping(characterId: string): VoiceMapping | undefined {
  return VOICE_MAPPINGS[characterId];
}
