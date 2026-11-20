import type { UIMessage } from 'ai';
import { describe, expect, it } from 'vitest';
import { isEmptyAssistant, showThinking, visibleMessages } from '../src/lib/chat/messages.ts';

const user = (id: string, text: string): UIMessage => ({
  id,
  role: 'user',
  parts: [{ type: 'text', text }],
});
const assistant = (id: string, parts: UIMessage['parts']): UIMessage => ({
  id,
  role: 'assistant',
  parts,
});

describe('chat message display', () => {
  // The server's first stream chunk adds an assistant message with no parts before any text arrives.
  const waiting = [user('u1', 'hi'), assistant('a1', [])];

  it('treats an assistant message with no text and no running tool as empty', () => {
    expect(isEmptyAssistant(assistant('a', []))).toBe(true);
    expect(isEmptyAssistant(assistant('a', [{ type: 'text', text: '' }]))).toBe(true);
    expect(isEmptyAssistant(assistant('a', [{ type: 'step-start' }]))).toBe(true);
    expect(isEmptyAssistant(assistant('a', [{ type: 'text', text: 'Hello' }]))).toBe(false);
    expect(isEmptyAssistant(user('u', ''))).toBe(false);
  });

  it('counts a running tool as content, so "Reading a web page…" still shows', () => {
    const reading = assistant('a', [
      {
        type: 'tool-fetchPage',
        toolCallId: 't1',
        state: 'input-available',
        input: { url: 'https://example.com' },
      },
    ]);
    expect(isEmptyAssistant(reading)).toBe(false);
  });

  it('shows one thinking bubble and no empty assistant bubble while the reply has not started', () => {
    expect(visibleMessages(waiting).map((m) => m.id)).toEqual(['u1']);
    expect(showThinking(waiting, 'streaming')).toBe(true);
    expect(showThinking([user('u1', 'hi')], 'submitted')).toBe(true);
  });

  it('drops the thinking bubble once text arrives', () => {
    const started = [user('u1', 'hi'), assistant('a1', [{ type: 'text', text: 'Hel' }])];
    expect(visibleMessages(started).map((m) => m.id)).toEqual(['u1', 'a1']);
    expect(showThinking(started, 'streaming')).toBe(false);
  });

  it('shows no thinking bubble when idle, even if a reply ended empty', () => {
    expect(showThinking(waiting, 'ready')).toBe(false);
    expect(showThinking(waiting, 'error')).toBe(false);
  });
});
