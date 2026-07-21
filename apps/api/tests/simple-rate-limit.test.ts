import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createRateLimiter } from '../src/api/middleware/simple-rate-limit.js';

describe('createRateLimiter', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('permite ate o limite dentro da janela', () => {
    const check = createRateLimiter(3, 60_000);
    expect(check('user-1')).toBe(true);
    expect(check('user-1')).toBe(true);
    expect(check('user-1')).toBe(true);
  });

  it('bloqueia a chamada seguinte ao limite', () => {
    const check = createRateLimiter(3, 60_000);
    check('user-1');
    check('user-1');
    check('user-1');
    expect(check('user-1')).toBe(false);
  });

  it('conta cada chave separadamente', () => {
    const check = createRateLimiter(1, 60_000);
    expect(check('user-1')).toBe(true);
    expect(check('user-2')).toBe(true);
    expect(check('user-1')).toBe(false);
  });

  it('reseta depois que a janela expira', () => {
    const check = createRateLimiter(2, 60_000);
    check('user-1');
    check('user-1');
    expect(check('user-1')).toBe(false);

    vi.advanceTimersByTime(60_001);

    expect(check('user-1')).toBe(true);
    expect(check('user-1')).toBe(true);
    expect(check('user-1')).toBe(false);
  });

  it('limiters independentes nao compartilham estado', () => {
    const a = createRateLimiter(1, 60_000);
    const b = createRateLimiter(1, 60_000);
    expect(a('user-1')).toBe(true);
    expect(b('user-1')).toBe(true);
  });
});
