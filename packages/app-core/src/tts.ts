/**
 * TTSPlayer — Text-to-Speech player for avatar banter and announcer beats.
 *
 * Queues speech lines (FIFO), selects per-character voices, respects mute/rate/volume.
 * Uses platform-native TTS:
 *   - iOS: AVSpeechSynthesizer (via ReactNativeTTS or direct API)
 *   - Web: Web Speech API (SpeechSynthesisUtterance)
 *   - Android: TextToSpeech engine
 *
 * M5: system voices as baseline (proves architecture).
 * Future: ElevenLabs custom voices for hero characters.
 *
 * Global mute: call TTSPlayerMute.toggle() to mute all instances.
 */

/**
 * Global mute controller — shared by all TTSPlayer instances.
 * Toggle via TTSPlayerMute.toggle() or set TTSPlayerMute.muted directly.
 */
export const TTSPlayerMute = { muted: false };

/** Callback for TTS lifecycle events. */
export interface TTSCallbacks {
  onSpeakStart?: (text: string) => void;
  onSpeakEnd?: (text: string) => void;
  onSpeakCancel?: () => void;
}

/**
 * TTSPlayer — manages a queue of speech lines with per-character voice selection.
 *
 * Thread-safe FIFO queue. Each line is spoken sequentially. If disabled,
 * new lines are silently dropped and the queue is not processed.
 */
export class TTSPlayer {
  private queue: TTSLine[] = [];
  private isProcessing = false;
  private volume = 1;
  private rate = 1;
  private enabled = true;
  private callbacks: TTSCallbacks = {};

  /**
   * Queue a line for speech.
   * @param text — the text to speak (must be non-empty)
   * @param voiceId — optional voice identifier (platform-specific)
   * @param priority — if true, insert at front of queue (for urgent beats)
   */
  speak(text: string, voiceId?: string, priority = false): void {
    if (!this.enabled || !text.trim() || TTSPlayerMute.muted) return;

    const line: TTSLine = { text, voiceId, priority };

    if (priority) {
      this.queue.unshift(line);
    } else {
      this.queue.push(line);
    }

    this.processQueue();
  }

  /**
   * Cancel all queued speech and stop current utterance.
   */
  cancel(): void {
    this.queue = [];
    this.isProcessing = false;
    this.platformCancel();
    this.callbacks.onSpeakCancel?.();
  }

  /**
   * Stop the current utterance only (if any).
   */
  stop(): void {
    this.isProcessing = false;
    this.platformStop();
  }

  /**
   * Set speech volume (0–1).
   */
  setVolume(volume: number): void {
    this.volume = Math.max(0, Math.min(1, volume));
    this.platformSetVolume(this.volume);
  }

  /**
   * Set speech rate (0.5–2x, where 1 is normal).
   */
  setRate(rate: number): void {
    this.rate = Math.max(0.5, Math.min(2, rate));
  }

  /**
   * Enable or disable TTS entirely.
   * When disabled, the queue is drained and not processed.
   */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    if (!enabled) {
      this.cancel();
    }
  }

  /**
   * Check if TTS is currently speaking.
   */
  get isSpeaking(): boolean {
    return this.isProcessing;
  }

  /**
   * Check if TTS is enabled.
   */
  get isEnabled(): boolean {
    return this.enabled;
  }

  /**
   * Set callback handlers.
   */
  setCallbacks(callbacks: TTSCallbacks): void {
    this.callbacks = callbacks;
  }

  /**
   * Register a per-character voice.
   * @param voiceId — unique voice identifier
   * @param voiceIndex — platform-specific voice index/name
   */
  setVoice(voiceId: string, voiceIndex: string | number): void {
    this.platformVoices[voiceId] = voiceIndex;
  }

  /**
   * Get the list of available voices (for config UI).
   */
  getAvailableVoices(): string[] {
    return this.platformGetVoices();
  }

  // ---- Platform-specific TTS calls ----

  /** The platform voice mapping: user-facing voiceId → platform voice index/name. */
  private platformVoices: Record<string, string | number> = {};

  /** Process the next line in the queue. */
  private async processQueue(): Promise<void> {
    if (this.isProcessing || this.queue.length === 0 || !this.enabled) {
      this.isProcessing = false;
      return;
    }

    this.isProcessing = true;
    const line = this.queue.shift()!;

    try {
      // Get the platform voice for this line
      const voice = line.voiceId ? this.platformVoices[line.voiceId] : undefined;

      // Speak the line
      this.callbacks.onSpeakStart?.(line.text);
      await this.platformSpeak(line.text, voice);
      this.callbacks.onSpeakEnd?.(line.text);
    } catch {
      // TTS failed — skip to next line
    }

    this.isProcessing = false;
    // Recursively process the next line
    this.processQueue();
  }

  /**
   * Platform-specific speak implementation.
   * Returns when speech is complete.
   */
  private platformSpeak(_text: string, _voice?: string | number): Promise<void> {
    if (isWeb()) {
      return this.speakWeb(_text, _voice);
    }
    // iOS: use ReactNativeTTS or native AVSpeechSynthesizer
    // For now, a no-op placeholder — the real implementation uses the platform API
    return this.speakNative(_text, _voice);
  }

  private speakWeb(text: string, voice?: string | number): Promise<void> {
    return new Promise((resolve) => {
      if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
        resolve();
        return;
      }

      const utter = new SpeechSynthesisUtterance(text);
      utter.volume = this.volume;
      utter.rate = this.rate;

      // Select voice if specified
      if (voice !== undefined) {
        const allVoices = speechSynthesis.getVoices();
        const voiceObj = allVoices.find((v) => v.name === String(voice));
        if (voiceObj) utter.voice = voiceObj;
      }

      utter.onend = () => resolve();
      utter.onerror = () => resolve(); // Don't block queue on errors

      speechSynthesis.speak(utter);
    });
  }

  private speakNative(_text: string, _voice?: string | number): Promise<void> {
    // iOS/Android: uses ReactNativeTTS or native APIs
    // This is called when running on a device
    // Implementation depends on the installed TTS library
    return new Promise((resolve) => {
      // Placeholder for native TTS:
      // import ReactNativeTTS from '@tonyflour/react-native-tts';
      // ReactNativeTTS.speak(text, {
      //   engine: voice as string | undefined,
      //   rate: this.rate,
      //   volume: this.volume,
      // }).then(() => resolve()).catch(() => resolve());

      // For testing / web fallback, resolve after a simulated delay
      const delay = Math.max(200, text.length * 30 / this.rate);
      setTimeout(() => resolve(), delay);
    });
  }

  private platformCancel(): void {
    if (isWeb()) {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        speechSynthesis.cancel();
      }
    }
    // Native: ReactNativeTTS.stop()
  }

  private platformStop(): void {
    if (isWeb()) {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        speechSynthesis.pause();
      }
    }
  }

  private platformSetVolume(_volume: number): void {
    // Native: set volume on the TTS engine
    // Web: applied per-utterance in speakWeb
  }

  private platformGetVoices(): string[] {
    if (isWeb()) {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        const voices = speechSynthesis.getVoices();
        return voices.map((v) => v.name);
      }
      return [];
    }
    // Native: list available TTS voices
    return [];
  }
}

/** A single line in the TTS queue. */
interface TTSLine {
  text: string;
  voiceId?: string;
  priority: boolean;
}

/**
 * Detect if running on web (for platform-conditional TTS).
 */
function isWeb(): boolean {
  return typeof window !== 'undefined' && typeof window.document !== 'undefined';
}
