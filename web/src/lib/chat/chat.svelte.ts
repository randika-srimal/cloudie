// The chat page's connection to the SalesAgent: an Agents SDK AgentClient (a reconnecting WebSocket to
// /agents/sales-agent/<sessionId>), the SDK's WebSocketChatTransport over it, and the AI SDK's Svelte Chat on
// top. The agent pushes its state (KB version and link allowlist) on connect.
import { Chat } from '@ai-sdk/svelte';
import { AgentState } from '@cloudie/protocol';
import type { UIMessage } from 'ai';
import { WebSocketChatTransport } from 'agents/chat/transport';
import { AgentClient } from 'agents/client';
import { createReconnectPolicy, MAX_RETRIES } from './reconnect.ts';
import { sessionId } from './session.ts';

export interface ChatOptions {
  /** A Turnstile token for the first connect. Tokens are single-use. */
  turnstileToken: string;
  /**
   * Gets a new Turnstile token for every later (re)connect. The proxy accepts a chat_pass cookie instead, but
   * Safari may not store that partitioned cookie in an iframe and it expires after 12 hours, so each connect
   * carries a fresh token and works either way.
   */
  freshToken: () => Promise<string>;
}

export interface ChatHandle {
  chat: Chat;
  /** The agent's latest state; null until the first state message. */
  state: { current: AgentState | null };
  /**
   * `open` is true while the WebSocket is connected; `everOpened` tells a first connect from a reconnect;
   * `gaveUp` is true once reconnecting stopped (MAX_RETRIES spent): the page offers `reconnect`.
   */
  connection: { open: boolean; everOpened: boolean; gaveUp: boolean };
  /** Starts connecting again after the socket gave up. */
  reconnect: () => void;
  close: () => void;
}

/** Messages the agent sends besides the transport's stream frames (Agents SDK wire type names). */
type AgentFrame = { type?: unknown; messages?: unknown };

export function createChat(opts: ChatOptions): ChatHandle {
  const id = sessionId();
  const state = $state<{ current: AgentState | null }>({ current: null });
  const connection = $state({ open: false, everOpened: false, gaveUp: false });
  const policy = createReconnectPolicy(() => document.hidden);

  let firstToken: string | null = opts.turnstileToken;
  const agent = new AgentClient({
    agent: 'SalesAgent',
    name: id,
    host: location.host,
    protocol: location.protocol === 'https:' ? 'wss' : 'ws',
    // Called by the socket before every connect attempt, so a reconnect never reuses a spent token. The token
    // goes on the WebSocket URL only; the proxy strips it before the agent sees the request.
    query: async () => {
      const token = firstToken ?? (await opts.freshToken());
      firstToken = null;
      return { cf_turnstile: token };
    },
    maxRetries: MAX_RETRIES,
    shouldReconnectOnClose: () => policy.shouldReconnectOnClose(),
    onConnectionError: () => {
      policy.onConnectionError();
      connection.gaveUp = policy.gaveUp;
    },
    onStateUpdate: (next: unknown) => {
      const parsed = AgentState.safeParse(next);
      if (parsed.success) state.current = parsed.data;
    },
  });

  const transport = new WebSocketChatTransport({ agent });
  const chat = new Chat({ id, transport });

  agent.addEventListener('open', () => {
    const first = !connection.everOpened;
    connection.open = true;
    connection.everOpened = true;
    policy.onOpen();
    connection.gaveUp = false;
    if (first) void loadHistory();
  });
  agent.addEventListener('close', () => {
    connection.open = false;
  });

  // The agent re-sends the whole transcript when it changes outside this tab's own stream (another tab on the
  // same chat, a dropped request). Take it only while idle, so a reply being streamed here is not cut off.
  agent.addEventListener('message', (event: MessageEvent) => {
    if (typeof event.data !== 'string') return;
    let frame: AgentFrame;
    try {
      frame = JSON.parse(event.data) as AgentFrame;
    } catch {
      return;
    }
    if (frame.type === 'cf_agent_chat_messages' && Array.isArray(frame.messages)) {
      if (chat.status === 'ready' || chat.status === 'error') {
        chat.messages = frame.messages as UIMessage[];
      }
    }
  });

  // After a reload the conversation is still on the agent: fetch it once the first connect has succeeded (so
  // the chat_pass cookie is set). No Turnstile token goes on this GET; if the browser did not keep the cookie
  // (Safari, partitioned) the proxy answers 401 and the page just starts empty.
  async function loadHistory(): Promise<void> {
    try {
      const res = await fetch(`/agents/sales-agent/${encodeURIComponent(id)}/get-messages`, {
        credentials: 'include',
      });
      if (!res.ok) return;
      const messages: unknown = await res.json();
      if (Array.isArray(messages) && messages.length > 0 && chat.messages.length === 0) {
        chat.messages = messages as UIMessage[];
      }
    } catch {
      // history is a convenience; the chat works without it
    }
  }

  // Reconnecting pauses while the tab is hidden (see reconnect.ts); pick it up again when it is shown.
  const onVisibility = () => {
    if (!document.hidden && policy.onVisible()) agent.reconnect();
  };
  document.addEventListener('visibilitychange', onVisibility);

  function reconnect(): void {
    policy.retry();
    connection.gaveUp = false;
    agent.reconnect();
  }

  function close(): void {
    document.removeEventListener('visibilitychange', onVisibility);
    agent.close();
  }

  return { chat, state, connection, reconnect, close };
}
