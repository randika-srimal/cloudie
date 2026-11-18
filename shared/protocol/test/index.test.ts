import { describe, expect, it } from 'vitest';
import { Hello } from '../src/index.ts';

describe('Hello', () => {
  it('accepts a valid reply', () => {
    const reply = { message: 'Hello, world!', colo: 'local', at: '2026-01-01T00:00:00.000Z' };
    expect(Hello.parse(reply)).toEqual(reply);
  });

  it('rejects a reply without a time', () => {
    expect(Hello.safeParse({ message: 'hi', colo: 'local' }).success).toBe(false);
  });
});
