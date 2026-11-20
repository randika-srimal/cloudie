<!--
  /chat: the sales assistant, embedded by HubSpot in an iframe (about 700 px tall). The page itself is static;
  it connects to the SalesAgent over a WebSocket through the guarded /agents proxy after a Turnstile check.
-->
<script lang="ts">
  import { PUBLIC_TURNSTILE_SITEKEY } from '$app/env/public';
  import { onDestroy, onMount, tick } from 'svelte';
  import { createChat, type ChatHandle } from '#lib/chat/chat.svelte.ts';
  import { showThinking, textOf, usingTool, visibleMessages } from '#lib/chat/messages.ts';
  import { renderReply } from '#lib/chat/render.ts';
  import { clearSession } from '#lib/chat/session.ts';
  import Turnstile from '#lib/chat/Turnstile.svelte';

  const MAX_CHARS = 4000;

  let turnstile: Turnstile;
  let handle = $state<ChatHandle | null>(null);
  let verifyFailed = $state(false);
  let input = $state('');
  let textarea: HTMLTextAreaElement;
  let list: HTMLElement;
  let announcement = $state('');

  const chat = $derived(handle?.chat ?? null);
  const status = $derived(chat?.status ?? 'ready');
  const busy = $derived(status === 'submitted' || status === 'streaming');
  const allowlist = $derived(handle?.state.current?.allowlist ?? []);
  const connecting = $derived(!handle || !handle.connection.open);
  const canSend = $derived(!!chat && !busy && input.trim().length > 0);
  const shown = $derived(visibleMessages(chat?.messages ?? []));
  const thinking = $derived(showThinking(chat?.messages ?? [], status));

  async function start(): Promise<void> {
    verifyFailed = false;
    try {
      const token = await turnstile.getToken();
      handle = createChat({ turnstileToken: token, freshToken: () => turnstile.getToken() });
    } catch {
      verifyFailed = true;
    }
  }

  onMount(() => void start());
  onDestroy(() => handle?.close());

  /** Starter questions shown on an empty chat; clicking one sends it. */
  const SUGGESTIONS = [
    'Which case studies cover a Salesforce to HubSpot migration?',
    'What services does Engaging offer?',
    'How should I position Engaging for a manufacturing prospect?',
  ];

  function send(prompt?: string): void {
    const text = (prompt ?? input).trim();
    if (!chat || busy || !text) return;
    if (prompt === undefined) input = '';
    void chat.sendMessage({ text: text.slice(0, MAX_CHARS) });
    textarea.focus();
  }

  function onKeydown(event: KeyboardEvent): void {
    // Enter sends, Shift+Enter adds a line; never send in the middle of an IME composition.
    if (event.key === 'Enter' && !event.shiftKey && !event.isComposing) {
      event.preventDefault();
      send();
    }
  }

  function newChat(): void {
    clearSession();
    location.reload();
  }

  // Keep the newest message in view while a reply streams in.
  $effect(() => {
    const last = chat?.messages.at(-1);
    void [chat?.messages.length, last && textOf(last).length, status];
    void tick().then(() => list?.scrollTo({ top: list.scrollHeight }));
  });

  // Screen readers hear "Thinking…" and then the whole reply once, not every streamed word.
  let lastStatus = 'ready';
  $effect(() => {
    const now = status;
    if (now === lastStatus) return;
    if (now === 'submitted') announcement = 'Thinking…';
    else if (now === 'ready' && lastStatus === 'streaming') {
      const last = chat?.messages.at(-1);
      if (last?.role === 'assistant') announcement = `Assistant: ${textOf(last)}`;
    } else if (now === 'error') announcement = 'The reply failed.';
    lastStatus = now;
  });
</script>

<svelte:head>
  <title>Sales assistant · Engaging.io</title>
  <meta name="robots" content="noindex" />
</svelte:head>

<div class="flex h-dvh flex-col bg-surface text-ink">
  <header class="flex items-center justify-between gap-3 border-b border-line px-4 py-3">
    <div class="flex min-w-0 items-center gap-3">
      <img
        src="/brand/engaging-logo.png"
        alt="Engaging.io"
        width="120"
        height="32"
        class="h-8 w-auto"
      />
      <span class="h-6 w-px bg-line" aria-hidden="true"></span>
      <h1 class="truncate text-sm font-semibold tracking-tight">Sales assistant</h1>
    </div>
    <button
      type="button"
      class="flex shrink-0 items-center gap-1.5 rounded-full border-2 border-ink px-3 py-1 text-xs font-bold transition-colors hover:bg-ink hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
      onclick={newChat}
    >
      <svg
        viewBox="0 0 16 16"
        class="size-3.5"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        aria-hidden="true"
      >
        <path d="M8 3v10M3 8h10" stroke-linecap="round" />
      </svg>
      New chat
    </button>
  </header>

  <section
    bind:this={list}
    aria-label="Conversation"
    class="flex-1 space-y-4 overflow-y-auto bg-[linear-gradient(to_bottom,var(--color-surface),var(--color-panel)_140%)] px-4 py-5"
  >
    {#if !chat || chat.messages.length === 0}
      <div
        class="mx-auto max-w-md rounded-xl border-l-4 border-brand bg-surface p-5 shadow-[0_1px_3px_rgb(33_32_41/0.08),0_4px_12px_rgb(33_32_41/0.06)]"
      >
        <h2 class="text-lg font-bold">Hi there <span aria-hidden="true">👋</span></h2>
        <p class="mt-1 text-sm text-muted">
          Ask about Engaging's services, case studies or how to position them for a prospect.
        </p>
        <ul class="mt-4 flex flex-col gap-2" aria-label="Suggested questions">
          {#each SUGGESTIONS as suggestion (suggestion)}
            <li>
              <button
                type="button"
                disabled={!chat || connecting || busy}
                onclick={() => send(suggestion)}
                class="w-full rounded-lg bg-brand-pale px-3 py-2 text-left text-sm text-ink transition-colors hover:bg-brand hover:text-white disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-brand-pale disabled:hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
              >
                {suggestion}
              </button>
            </li>
          {/each}
        </ul>
      </div>
    {/if}

    {#each shown as message (message.id)}
      {#if message.role === 'user'}
        <div class="bubble-in flex justify-end">
          <p
            class="max-w-[85%] rounded-2xl rounded-br-md bg-ink px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap text-white shadow-sm"
          >
            <span class="sr-only">You:</span>
            {textOf(message)}
          </p>
        </div>
      {:else if message.role === 'assistant'}
        <div class="bubble-in flex items-end gap-2">
          <span
            class="mb-0.5 grid size-7 shrink-0 place-items-center rounded-full bg-brand text-sm leading-none font-bold text-white"
            aria-hidden="true"
          >
            e
          </span>
          <div
            class="max-w-[85%] min-w-0 rounded-2xl rounded-bl-md border border-line bg-surface px-4 py-2.5 text-sm leading-relaxed shadow-[0_1px_3px_rgb(33_32_41/0.08),0_4px_12px_rgb(33_32_41/0.06)]"
          >
            <span class="sr-only">Assistant:</span>
            {#each message.parts as part, i (i)}
              {#if part.type === 'text'}
                <!-- renderReply sanitises with DOMPurify and strips links not on the allowlist -->
                <!-- eslint-disable-next-line svelte/no-at-html-tags -->
                <div class="reply">{@html renderReply(part.text, allowlist)}</div>
              {/if}
            {/each}
            {#if usingTool(message)}
              <p class="mt-1 flex items-center gap-1.5 text-xs text-muted italic">
                <span class="size-1.5 animate-pulse rounded-full bg-brand" aria-hidden="true"
                ></span>
                Reading a web page…
              </p>
            {/if}
          </div>
        </div>
      {/if}
    {/each}

    {#if thinking}
      <div class="bubble-in flex items-end gap-2">
        <span
          class="mb-0.5 grid size-7 shrink-0 place-items-center rounded-full bg-brand text-sm leading-none font-bold text-white"
          aria-hidden="true"
        >
          e
        </span>
        <div
          class="flex items-center gap-1 rounded-2xl rounded-bl-md border border-line bg-surface px-4 py-3.5 shadow-sm"
        >
          <span class="sr-only">Thinking…</span>
          <span class="typing-dot" aria-hidden="true"></span>
          <span class="typing-dot [animation-delay:150ms]" aria-hidden="true"></span>
          <span class="typing-dot [animation-delay:300ms]" aria-hidden="true"></span>
        </div>
      </div>
    {/if}
    {#if status === 'error'}
      <p class="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
        The reply did not come through.
        <button type="button" class="font-semibold underline" onclick={() => chat?.regenerate()}>
          Try again
        </button>
      </p>
    {/if}
  </section>

  <div class="sr-only" aria-live="polite" aria-atomic="true">{announcement}</div>

  <footer class="border-t border-line bg-surface px-4 pt-3 pb-2">
    {#if verifyFailed}
      <p class="mb-2 text-sm text-red-700" role="alert">
        We couldn't verify your browser.
        <button type="button" class="font-semibold underline" onclick={start}>Try again</button>
      </p>
    {:else if handle?.connection.gaveUp}
      <p class="mb-2 text-sm text-red-700" role="alert">
        The connection was lost.
        <button type="button" class="font-semibold underline" onclick={() => handle?.reconnect()}>
          Reconnect
        </button>
      </p>
    {:else if connecting}
      <p class="mb-2 flex items-center gap-1.5 text-xs text-muted" aria-live="polite">
        <span class="size-1.5 animate-pulse rounded-full bg-brand" aria-hidden="true"></span>
        {handle?.connection.everOpened ? 'Reconnecting…' : 'Connecting…'}
      </p>
    {/if}

    <Turnstile bind:this={turnstile} sitekey={PUBLIC_TURNSTILE_SITEKEY} />

    <form
      class="flex items-end gap-2 rounded-2xl border border-line bg-panel p-1.5 transition-colors focus-within:border-brand focus-within:bg-surface"
      onsubmit={(e) => {
        e.preventDefault();
        send();
      }}
    >
      <label for="chat-input" class="sr-only">Your message</label>
      <textarea
        id="chat-input"
        bind:this={textarea}
        bind:value={input}
        onkeydown={onKeydown}
        maxlength={MAX_CHARS}
        rows="2"
        placeholder="Ask a question…"
        aria-describedby="chat-hint"
        class="max-h-40 min-h-11 flex-1 resize-none bg-transparent px-2.5 py-2 text-sm placeholder:text-muted focus:outline-none"
      ></textarea>
      <button
        type="submit"
        disabled={!canSend}
        aria-label="Send"
        class="grid size-10 shrink-0 place-items-center rounded-xl bg-brand text-white transition-colors hover:bg-brand-strong disabled:bg-muted/30 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
      >
        <svg viewBox="0 0 20 20" class="size-5" fill="currentColor" aria-hidden="true">
          <path
            d="M3.1 2.3a.75.75 0 0 0-1 .9l1.9 6.05H11a.75.75 0 0 1 0 1.5H4l-1.9 6.05a.75.75 0 0 0 1 .9l15-7.25a.75.75 0 0 0 0-1.35l-15-6.8Z"
          />
        </svg>
      </button>
    </form>
    <p id="chat-hint" class="mt-1.5 flex justify-between px-1 text-[11px] text-muted">
      <span>Enter to send, Shift+Enter for a new line</span>
      <span>
        {#if input.length > MAX_CHARS - 500}{input.length} / {MAX_CHARS} ·
        {/if}powered by AI
      </span>
    </p>
  </footer>
</div>

<style>
  .reply :global(p) {
    margin: 0.4em 0;
  }
  .reply :global(:first-child) {
    margin-top: 0;
  }
  .reply :global(:last-child) {
    margin-bottom: 0;
  }
  .reply :global(strong) {
    font-weight: 700;
  }
  .reply :global(li::marker) {
    color: var(--color-brand);
  }
  .reply :global(ul) {
    list-style: disc;
    padding-left: 1.25em;
    margin: 0.4em 0;
  }
  .reply :global(ol) {
    list-style: decimal;
    padding-left: 1.25em;
    margin: 0.4em 0;
  }
  .reply :global(h1),
  .reply :global(h2),
  .reply :global(h3) {
    font-weight: 700;
    margin: 0.8em 0 0.3em;
  }
  .reply :global(a) {
    color: var(--color-brand-strong);
    font-weight: 600;
    text-decoration: underline;
    text-underline-offset: 2px;
  }
  .reply :global(code) {
    font-size: 0.9em;
    background: color-mix(in oklch, currentColor 8%, transparent);
    padding: 0 0.25em;
    border-radius: 0.25em;
  }
  .reply :global(table) {
    border-collapse: collapse;
    margin: 0.4em 0;
  }
  .reply :global(th),
  .reply :global(td) {
    border-bottom: 1px solid var(--color-line);
    padding: 0.35em 0.6em;
    text-align: left;
  }
  .reply :global(th) {
    background: var(--color-ink);
    color: #fff;
    font-weight: 700;
  }
  .reply :global(tbody tr:nth-child(odd) td) {
    background: var(--color-brand-pale);
  }

  .bubble-in {
    animation: bubble-in 180ms ease-out both;
  }
  @keyframes bubble-in {
    from {
      opacity: 0;
      transform: translateY(6px);
    }
  }
  .typing-dot {
    width: 0.4rem;
    height: 0.4rem;
    border-radius: 9999px;
    background: var(--color-brand);
    animation: typing 1s ease-in-out infinite;
  }
  @keyframes typing {
    0%,
    80%,
    100% {
      opacity: 0.3;
      transform: translateY(0);
    }
    40% {
      opacity: 1;
      transform: translateY(-3px);
    }
  }
  @media (prefers-reduced-motion: reduce) {
    .bubble-in,
    .typing-dot {
      animation: none;
    }
  }
</style>
