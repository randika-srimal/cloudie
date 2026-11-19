import { describe, expect, it } from 'vitest';
import { createReconnectPolicy, MAX_RETRIES } from '../src/lib/chat/reconnect.ts';

describe('createReconnectPolicy', () => {
  it('caps reconnect attempts', () => {
    expect(MAX_RETRIES).toBe(8);
  });

  it('keeps reconnecting while visible, and gives up when the socket stops', () => {
    const p = createReconnectPolicy(() => false);
    expect(p.shouldReconnectOnClose()).toBe(true);
    expect(p.gaveUp).toBe(false);
    p.onConnectionError(); // maxRetries spent, or a terminal close
    expect(p.gaveUp).toBe(true);
    expect(p.onVisible()).toBe(false); // giving up is not undone by visibility
  });

  it('pauses while hidden without giving up, and resumes once visible', () => {
    let hidden = true;
    const p = createReconnectPolicy(() => hidden);
    expect(p.shouldReconnectOnClose()).toBe(false);
    p.onConnectionError(); // the SDK reports the declined reconnect as an error
    expect(p.gaveUp).toBe(false);
    hidden = false;
    expect(p.onVisible()).toBe(true);
    expect(p.onVisible()).toBe(false); // only once
  });

  it('clears everything on open and on a manual retry', () => {
    const p = createReconnectPolicy(() => false);
    p.onConnectionError();
    p.retry();
    expect(p.gaveUp).toBe(false);
    p.onConnectionError();
    p.onOpen();
    expect(p.gaveUp).toBe(false);
  });
});
