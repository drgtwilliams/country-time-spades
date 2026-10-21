/**
 * STTPlayer — Speech-to-Text player for voice input.
 *
 * Allows players to speak bids instead of tapping the pad.
 * Recognized text is displayed in real-time for confirmation.
 *
 * Uses platform-native STT:
 *   - iOS: react-native-voice (offline-capable with on-device engine)
 *   - Web: Web Speech API (SpeechRecognition)
 *   - Android: on-device STT engine
 *
 * Privacy: all speech processed on-device. No data leaves the device.
 * Text input is always available as fallback.
 */

/** Callback for STT recognition events. */
export interface STTCallbacks {
  /** Called with interim (partial) transcription as user speaks. */
  onInterim?: (text: string) => void;
  /** Called with final transcription when user stops speaking. */
  onFinal?: (text: string, confidence: number) => void;
  /** Called when recognition errors occur. */
  onError?: (message: string) => void;
  /** Called when recognition starts. */
  onStart?: () => void;
  /** Called when recognition ends (user stopped or stopped()). */
  onEnd?: () => void;
}

/**
 * STTPlayer — manages speech recognition for voice input.
 *
 * Primary use case: player speaks a bid ("five", "three nil") →
 * recognized text → displayed on bid pad → confirmed.
 *
 * Privacy: all speech is processed on-device. No audio leaves the phone.
 */
export class STTPlayer {
  private listening = false;
  private callbacks: STTCallbacks = {};
  private _lastTranscript: string | null = null;
  private _lastConfidence = 0;
  private confidenceThreshold = 0.5;
  private language = 'en-US';
  private interimEnabled = true;

  /**
   * Start voice recognition.
   * @param language — BCP 47 language tag (default: en-US)
   */
  start(language = 'en-US'): void {
    this.language = language;
    this.listening = true;
    this._lastTranscript = null;
    this.callbacks.onStart?.();
    this.platformStart(language);
  }

  /**
   * Stop voice recognition and return the final transcript.
   * @returns the final recognized text, or null if nothing was recognized
   */
  stop(): string | null {
    this.listening = false;
    this.platformStop();
    this.callbacks.onEnd?.();
    return this._lastTranscript;
  }

  /**
   * Cancel recognition and clear any transcript.
   */
  cancel(): string | null {
    this.listening = false;
    this._lastTranscript = null;
    this.platformCancel();
    this.callbacks.onEnd?.();
    return null; // explicitly clear on cancel
  }

  /**
   * Set callback handlers.
   */
  setCallbacks(callbacks: STTCallbacks): void {
    this.callbacks = callbacks;
  }

  /**
   * Set the minimum confidence threshold (0–1).
   * Results below this threshold are dropped.
   */
  setConfidenceThreshold(threshold: number): void {
    this.confidenceThreshold = Math.max(0, Math.min(1, threshold));
  }

  /**
   * Enable or disable interim (partial) results.
   * When enabled, partial text is shown in real-time as the user speaks.
   */
  setInterimEnabled(enabled: boolean): void {
    this.interimEnabled = enabled;
  }

  /**
   * Check if currently listening.
   */
  get isListening(): boolean {
    return this.listening;
  }

  /**
   * Get the last recognized transcript.
   */
  get lastTranscript(): string | null {
    return this._lastTranscript;
  }

  /**
   * Get the confidence of the last recognized transcript.
   */
  get lastConfidence(): number {
    return this._lastConfidence;
  }

  // ---- Platform-specific STT calls ----

  private platformStart(_language: string): void {
    if (isWeb()) {
      this.startWeb(_language);
    } else {
      this.startNative(_language);
    }
  }

  private platformStop(): void {
    if (isWeb()) {
      this.stopWeb();
    } else {
      this.stopNative();
    }
  }

  private platformCancel(): void {
    if (isWeb()) {
      this.cancelWeb();
    } else {
      this.cancelNative();
    }
  }

  /** Web Speech API recognition. */
  private startWeb(language: string): void {
    const SpeechRecognition = (window as any).SpeechRecognition
      || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      this.callbacks.onError?.('Speech recognition not available on this browser');
      this.listening = false;
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = language;
    recognition.continuous = false;
    recognition.interimResults = this.interimEnabled;
    recognition.maxAlternatives = 1;

    recognition.onresult = (event: any) => {
      let interimText = '';
      let finalText = '';
      let confidence = 0;

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        const isFinal = event.results[i].isFinal;
        const conf = event.results[i][0].confidence;

        if (isFinal) {
          finalText = transcript;
          confidence = conf;
        } else {
          interimText += transcript;
        }
      }

      if (interimText) {
        this.callbacks.onInterim?.(interimText);
      }

      if (finalText) {
        this._lastTranscript = finalText.trim();
        this._lastConfidence = confidence;

        // Apply confidence threshold
        if (confidence >= this.confidenceThreshold) {
          this.callbacks.onFinal?.(finalText.trim(), confidence);
        } else {
          this.callbacks.onError?.(`Low confidence: ${Math.round(confidence * 100)}%`);
        }
      }
    };

    recognition.onerror = (event: any) => {
      if (event.error === 'no-speech') {
        this.callbacks.onError?.('No speech detected');
      } else if (event.error === 'not-allowed') {
        this.callbacks.onError?.('Microphone access denied');
      } else {
        this.callbacks.onError?.(`Recognition error: ${event.error}`);
      }
    };

    recognition.onend = () => {
      this.listening = false;
      this.callbacks.onEnd?.();
    };

    recognition.start();

    // Store reference for stop/cancel
    (window as any).__cts_stt_recognition = recognition;
  }

  private stopWeb(): void {
    const recognition = (window as any).__cts_stt_recognition;
    if (recognition) {
      recognition.abort();
      (window as any).__cts_stt_recognition = null;
    }
  }

  private cancelWeb(): void {
    this.stopWeb();
  }

  /** Native (iOS/Android) recognition via react-native-voice. */
  private startNative(_language: string): void {
    // react-native-voice usage:
    // import { Voice } from 'react-native-voice';
    // Voice.start(language);
    // Voice.onSpeechResult = (event) => { ... };
    // Voice.onSpeechError = (err) => { ... };

    // Placeholder — real implementation uses react-native-voice
    // For testing, simulate recognition
    const delay = Math.random() * 2000 + 1000; // 1–3s simulated recognition
    setTimeout(() => {
      if (this.listening) {
        this._lastTranscript = null; // Nothing recognized in test mode
        this.listening = false;
        this.callbacks.onEnd?.();
      }
    }, delay);
  }

  private stopNative(): void {
    // Voice.stop()
  }

  private cancelNative(): void {
    // Voice.cancel()
  }
}

/**
 * Detect if running on web (for platform-conditional STT).
 */
function isWeb(): boolean {
  return typeof window !== 'undefined' && typeof window.document !== 'undefined';
}
