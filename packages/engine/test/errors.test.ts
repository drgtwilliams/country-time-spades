import { describe, it, expect } from 'vitest';
import { EngineError, type EngineErrorCode } from '../src/config';

describe('EngineError', () => {
  it.each(['INVALID_CONFIG', 'ILLEGAL_ACTION', 'WRONG_ACTOR', 'WRONG_PHASE'])(
    'has code %s',
    (code) => {
      const err = new EngineError(code as EngineErrorCode, 'detail');
      expect(err.code).toBe(code);
      expect(err.name).toBe('EngineError');
      expect(err.message).toContain(code);
    },
  );

  it('works without detail', () => {
    const err = new EngineError('WRONG_ACTOR');
    expect(err.message).toBe('WRONG_ACTOR');
  });
});
