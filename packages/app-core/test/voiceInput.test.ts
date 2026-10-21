import { describe, it, expect } from 'vitest';
import { parseVoiceBid } from '../src/voiceInput';

describe('parseVoiceBid', () => {
  it('parses number words 0-9', () => {
    expect(parseVoiceBid('zero')).toBe(0);
    expect(parseVoiceBid('one')).toBe(1);
    expect(parseVoiceBid('two')).toBe(2);
    expect(parseVoiceBid('three')).toBe(3);
    expect(parseVoiceBid('four')).toBe(4);
    expect(parseVoiceBid('five')).toBe(5);
    expect(parseVoiceBid('six')).toBe(6);
    expect(parseVoiceBid('seven')).toBe(7);
    expect(parseVoiceBid('eight')).toBe(8);
    expect(parseVoiceBid('nine')).toBe(9);
  });

  it('parses digit strings', () => {
    expect(parseVoiceBid('3')).toBe(3);
    expect(parseVoiceBid('5')).toBe(5);
    expect(parseVoiceBid('9')).toBe(9);
  });

  it('parses "oh" as zero', () => {
    expect(parseVoiceBid('oh')).toBe(0);
  });

  it('parses "00" as 10', () => {
    expect(parseVoiceBid('00')).toBe(10);
    expect(parseVoiceBid('oh oh')).toBe(10);
    expect(parseVoiceBid('zero zero')).toBe(10);
  });

  it('parses "nil" bids', () => {
    expect(parseVoiceBid('nil')).toBe('nil');
    expect(parseVoiceBid('NIL')).toBe('nil');
    expect(parseVoiceBid('blind nil')).toBe('nil');
    expect(parseVoiceBid('blind')).toBe('nil');
  });

  it('returns null for unparseable text', () => {
    expect(parseVoiceBid('hello')).toBe(null);
    expect(parseVoiceBid('')).toBe(null);
    expect(parseVoiceBid('   ')).toBe(null);
    expect(parseVoiceBid('joker')).toBe(null);
  });

  it('returns null for out-of-range bids', () => {
    // 10 is a valid Spades bid but our pad only supports 1-9
    expect(parseVoiceBid('ten')).toBe(null);
    expect(parseVoiceBid('10')).toBe(null);
    expect(parseVoiceBid('11')).toBe(null);
  });

  it('handles mixed input with punctuation', () => {
    expect(parseVoiceBid("'five'")).toBe(5);
    expect(parseVoiceBid("(nil)")).toBe('nil');
  });
});
