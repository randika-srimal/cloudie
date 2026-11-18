import { beforeEach, describe, expect, it } from 'vitest';
import { clearSession, sessionId } from '../src/lib/chat/session.ts';

describe('sessionId', () => {
  beforeEach(() => sessionStorage.clear());

  it('creates a UUID once and keeps it in sessionStorage', () => {
    const id = sessionId();
    expect(id).toMatch(/^[0-9a-f-]{36}$/);
    expect(sessionStorage.getItem('chat-session')).toBe(id);
    expect(sessionId()).toBe(id);
  });

  it('starts a new id after clearSession', () => {
    const first = sessionId();
    clearSession();
    expect(sessionStorage.getItem('chat-session')).toBeNull();
    expect(sessionId()).not.toBe(first);
  });
});
