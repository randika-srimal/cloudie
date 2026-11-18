<!--
  /chat: the sales assistant, embedded by HubSpot in an iframe (about 700 px tall). The page itself is static;
  it connects to the SalesAgent over a WebSocket through the guarded /agents proxy after a Turnstile check.
-->
<script lang="ts">
  import { PUBLIC_TURNSTILE_SITEKEY } from '$app/env/public';
  import { onDestroy, onMount, tick } from 'svelte';
  import type { UIMessage } from 'ai';
  import { createChat, type ChatHandle } from '#lib/chat/chat.svelte.ts';
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

  function send(): void {
    const text = input.trim();
    if (!chat || busy || !text) return;
    input = '';
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

  function textOf(message: UIMessage): string {
    return message.parts.map((p) => (p.type === 'text' ? p.text : '')).join('');
  }

  /** True while the assistant is running a tool (reading a web page) and has not finished it. */
  function usingTool(message: UIMessage): boolean {
    return message.parts.some(
      (p) =>
        (p.type.startsWith('tool-') || p.type === 'dynamic-tool') &&
        'state' in p &&
        p.state !== 'output-available' &&
        p.state !== 'output-error',
    );
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
  <title>Sales assistant</title>
  <meta name="robots" content="noindex" />
</svelte:head>

<div class="flex h-dvh flex-col bg-surface text-ink">
  <header class="flex items-center justify-between border-b border-current/10 px-4 py-2">
    <h1 class="text-base font-semibold">Sales assistant</h1>
    <button
      type="button"
      class="rounded-md border border-current/15 px-2.5 py-1 text-sm hover:bg-current/5 focus-visible:outline-2 focus-visible:outline-brand"
      onclick={newChat}
    >
      New chat
    </button>
  </header>

  <section
    bind:this={list}
    aria-label="Conversation"
    class="flex-1 space-y-3 overflow-y-auto px-4 py-3"
  >
    {#if !chat || chat.messages.length === 0}
      <p class="text-sm text-muted">
        Ask about Engaging's services, case studies or how to position them for a prospect.
      </p>
    {/if}

    {#each chat?.messages ?? [] as message (message.id)}
      {#if message.role === 'user'}
        <div class="flex justify-end">
          <p
            class="max-w-[85%] rounded-2xl rounded-br-sm bg-brand px-3 py-2 text-sm whitespace-pre-wrap text-white"
          >
            <span class="sr-only">You:</span>
            {textOf(message)}
          </p>
        </div>
      {:else if message.role === 'assistant'}
        <div class="max-w-[95%] text-sm">
          <span class="sr-only">Assistant:</span>
          {#each message.parts as part, i (i)}
            {#if part.type === 'text'}
              <!-- renderReply sanitises with DOMPurify and strips links not on the allowlist -->
              <!-- eslint-disable-next-line svelte/no-at-html-tags -->
              <div class="reply">{@html renderReply(part.text, allowlist)}</div>
            {/if}
          {/each}
          {#if usingTool(message)}
            <p class="text-xs text-muted italic">Reading a web page…</p>
          {/if}
        </div>
      {/if}
    {/each}

    {#if status === 'submitted'}
      <p class="text-sm text-muted italic">Thinking…</p>
    {/if}
    {#if status === 'error'}
      <p class="text-sm text-red-600" role="alert">
        The reply did not come through.
        <button type="button" class="underline" onclick={() => chat?.regenerate()}>
          Try again
        </button>
      </p>
    {/if}
  </section>

  <div class="sr-only" aria-live="polite" aria-atomic="true">{announcement}</div>

  <footer class="border-t border-current/10 px-4 pt-2 pb-1">
    {#if verifyFailed}
      <p class="mb-2 text-sm text-red-600" role="alert">
        We couldn't verify your browser.
        <button type="button" class="underline" onclick={start}>Try again</button>
      </p>
    {:else if connecting}
      <p class="mb-2 text-xs text-muted" aria-live="polite">
        {handle?.connection.everOpened ? 'Reconnecting…' : 'Connecting…'}
      </p>
    {/if}

    <Turnstile bind:this={turnstile} sitekey={PUBLIC_TURNSTILE_SITEKEY} />

    <form
      class="flex items-end gap-2"
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
        class="max-h-40 min-h-11 flex-1 resize-y rounded-lg border border-current/20 bg-transparent px-3 py-2 text-sm focus-visible:outline-2 focus-visible:outline-brand"
      ></textarea>
      <button
        type="submit"
        disabled={!canSend}
        class="h-11 rounded-lg bg-brand px-4 text-sm font-medium text-white disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
      >
        Send
      </button>
    </form>
    <p id="chat-hint" class="mt-1 flex justify-between text-[11px] text-muted">
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
    font-weight: 600;
    margin: 0.6em 0 0.2em;
  }
  .reply :global(a) {
    color: var(--color-brand);
    text-decoration: underline;
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
    border: 1px solid color-mix(in oklch, currentColor 15%, transparent);
    padding: 0.2em 0.5em;
  }
</style>
