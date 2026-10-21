/**
 * AudioPlayer — simple audio mixing layer for SFX and ambience.
 *
 * Manages short sound effects (card slap, set stinger, etc.) with
 * per-channel volume control. Uses platform-native audio APIs:
 *   - iOS: expo-av Audio
 *   - Web: HTML5 Audio
 *   - Android: expo-av Audio
 *
 * M5: SFX layered under TTS. Ambience deferred.
 */

/** SFX definition: pre-loaded audio clip with a name key. */
export interface SFXDef {
  /** Unique identifier for this SFX. */
  name: string;
  /** Base64-encoded WAV audio data, or a platform-specific audio source. */
  data: string;
  /** Default volume (0–1). */
  volume?: number;
}

/**
 * AudioPlayer — manages SFX playback with per-channel volume control.
 *
 * SFX are short sounds (≤2s) that play on top of TTS. They do not
 * interrupt ongoing speech. Ambience (long-form background audio)
 * is deferred to M5.3 polish.
 */
export class AudioPlayer {
  private sfxCache: Map<string, SFXInstance> = new Map();
  private sfxVolume = 0.5;
  private masterVolume = 1;
  private enabled = true;

  constructor() {
    // SFX are loaded from content — for now, empty cache
    // In production, SFXDefs would be loaded from packages/content
  }

  /**
   * Register an SFX clip.
   * @param def — the SFX definition
   */
  registerSFX(def: SFXDef): void {
    const volume = def.volume ?? 0.5;
    this.sfxCache.set(def.name, new SFXInstance(def.data, volume));
  }

  /**
   * Play an SFX by name.
   * @param name — the SFX key
   * @param volumeOverride — optional volume override (0–1)
   */
  play(name: string, volumeOverride?: number): void {
    if (!this.enabled) return;

    const instance = this.sfxCache.get(name);
    if (!instance) {
      console.warn(`AudioPlayer: unknown SFX "${name}"`);
      return;
    }

    const vol = (volumeOverride ?? instance.baseVolume) * this.sfxVolume * this.masterVolume;
    instance.play(vol);
  }

  /**
   * Set SFX volume (0–1).
   */
  setSFXVolume(volume: number): void {
    this.sfxVolume = Math.max(0, Math.min(1, volume));
  }

  /**
   * Set master volume (0–1).
   */
  setMasterVolume(volume: number): void {
    this.masterVolume = Math.max(0, Math.min(1, volume));
  }

  /**
   * Enable or disable all audio.
   */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    if (!enabled) {
      this.stopAll();
    }
  }

  /**
   * Stop all currently playing SFX.
   */
  stopAll(): void {
    for (const instance of this.sfxCache.values()) {
      instance.stop();
    }
  }

  /**
   * Check if audio is enabled.
   */
  get isEnabled(): boolean {
    return this.enabled;
  }
}

/**
 * SFXInstance — a single sound effect that can be played multiple times.
 * Allows overlapping playback (e.g., rapid card slaps).
 */
class SFXInstance {
  private data: string;
  private baseVolume: number;
  private active: Audio | null = null;

  constructor(data: string, baseVolume: number) {
    this.data = data;
    this.baseVolume = baseVolume;
  }

  play(volume: number): void {
    if (isWeb()) {
      this.playWeb(volume);
    } else {
      this.playNative(volume);
    }
  }

  stop(): void {
    if (isWeb() && this.active) {
      this.active.pause();
      this.active = null;
    }
    // Native: stop()
  }

  private playWeb(volume: number): void {
    // Create audio from base64 data
    const audio = new Audio(this.data);
    audio.volume = volume;
    audio.play().catch(() => {
      // Autoplay policy may block — silently fail
    });
    audio.onended = () => {
      this.active = null;
    };
    this.active = audio;
  }

  private playNative(_volume: number): void {
    // expo-av usage:
    // import { Audio } from 'expo-av';
    // const [sound] = await Audio.Sound.createAsync({ uri: this.data });
    // await sound.setVolumeAsync(volume);
    // await sound.playAsync();

    // Placeholder — no SFX data loaded in M5.1
  }
}

/**
 * Detect if running on web.
 */
function isWeb(): boolean {
  return typeof window !== 'undefined' && typeof window.document !== 'undefined';
}
