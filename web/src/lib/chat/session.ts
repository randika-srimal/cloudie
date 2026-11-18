// One chat (one SalesAgent Durable Object) per browser tab: the id lives in sessionStorage, so a reload keeps
// the conversation and a new tab starts a fresh one.
const KEY = 'chat-session';

// Used when storage is blocked (some embedded-iframe privacy settings): the chat still works, but a reload
// starts a new conversation.
let memoryId: string | null = null;

/** The chat id for this tab, created on first use. */
export function sessionId(): string {
  try {
    let id = sessionStorage.getItem(KEY);
    if (!id) {
      id = crypto.randomUUID();
      sessionStorage.setItem(KEY, id);
    }
    return id;
  } catch {
    memoryId ??= crypto.randomUUID();
    return memoryId;
  }
}

/** Forgets the chat id, so the next sessionId() starts a new conversation. */
export function clearSession(): void {
  memoryId = null;
  try {
    sessionStorage.removeItem(KEY);
  } catch {
    // storage blocked: nothing stored
  }
}
