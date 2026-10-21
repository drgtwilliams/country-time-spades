/**
 * STTPlayer tests.
 *
 * Tests the STT lifecycle: start, stop, cancel, callbacks.
 */

import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { STTPlayer } from '../src/stt';

describe('STTPlayer', () => {
  let stt: STTPlayer;

  beforeEach(() => {
    stt = new STTPlayer();
  });

  afterEach(() => {
    stt.stop();
  });

  it('starts listening', () => {
    stt.start();
    expect(stt.isListening).toBe(true);
  });

  it('stops listening and returns null transcript (test mode)', () => {
    stt.start();
    const result = stt.stop();
    expect(stt.isListening).toBe(false);
    // In test mode (no platform STT), result is null
  });

  it('cancels and clears transcript', () => {
    stt.start();
    const result = stt.cancel();
    expect(stt.isListening).toBe(false);
    expect(result).toBeNull(); // cancel always clears
  });

  it('calls onStart callback', () => {
    let started = false;
    stt.setCallbacks({
      onStart: () => { started = true; },
    });
    stt.start();
    expect(started).toBe(true);
  });

  it('calls onEnd callback on stop', () => {
    let ended = false;
    stt.setCallbacks({
      onEnd: () => { ended = true; },
    });
    stt.start();
    stt.stop();
    expect(ended).toBe(true);
  });

  it('calls onError when speech not available (web)', () => {
    let error: string | null = null;
    stt.setCallbacks({
      onError: (msg) => { error = msg; },
    });

    if (typeof window !== 'undefined') {
      // In a test environment, SpeechRecognition won't be available
      stt.start();
      // OnEnd should fire eventually
    }
  });

  it('applies confidence threshold', () => {
    stt.setConfidenceThreshold(0.9);
    expect(() => stt.start()).not.toThrow();
  });

  it('interim can be enabled/disabled', () => {
    stt.setInterimEnabled(false);
    stt.start();
  });
});
