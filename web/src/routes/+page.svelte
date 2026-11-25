<!--
  / (home): the sales assistant, a copy of the HubSpot page info.engaging.io/eio-sales-assistant that it replaces.
  The old /chat address redirects here (web/static/_redirects).
  Three views: the password form (until /api/access says this browser entered the password), the start screen
  (intro, suggestion buttons, question box, awards) and the conversation (messages, the question box pinned to
  the bottom). The page itself is static; the chat connects to the SalesAgent over a WebSocket through the
  guarded /agents proxy, which needs the chat_access cookie and a Turnstile check.
-->
<script lang="ts">
  import { PUBLIC_TURNSTILE_SITEKEY } from '$app/env/public';
  import { onDestroy, onMount, tick } from 'svelte';
  import { checkAccess, unlock } from '#lib/chat/access.ts';
  import { createChat, type ChatHandle } from '#lib/chat/chat.svelte.ts';
  import { showThinking, textOf, usingTool, visibleMessages } from '#lib/chat/messages.ts';
  import { renderReply } from '#lib/chat/render.ts';
  import { clearSession } from '#lib/chat/session.ts';
  import Turnstile from '#lib/chat/Turnstile.svelte';

  const MAX_CHARS = 4000;
  const CONTACT_URL = 'https://www.engaging.io/contact-us';

  /** Suggestion buttons on the start screen; clicking one sends its text as the question. */
  const SUGGESTIONS = [
    'Real estate client examples',
    'Entertainment client examples',
    'Tourism/travel client examples',
    'Data migration and integration examples',
  ];

  let access = $state<'checking' | 'locked' | 'unlocked'>('checking');
  let password = $state('');
  let unlocking = $state(false);
  let passwordError = $state('');

  let turnstile = $state<Turnstile>();
  let handle = $state<ChatHandle | null>(null);
  let verifyFailed = $state(false);
  let input = $state('');
  let textarea = $state<HTMLTextAreaElement>();
  let list = $state<HTMLElement>();
  let announcement = $state('');

  const chat = $derived(handle?.chat ?? null);
  const status = $derived(chat?.status ?? 'ready');
  const busy = $derived(status === 'submitted' || status === 'streaming');
  const allowlist = $derived(handle?.state.current?.allowlist ?? []);
  const connecting = $derived(!handle || !handle.connection.open);
  const ready = $derived(!!chat && !connecting && !busy);
  const canSend = $derived(ready && input.trim().length > 0);
  const shown = $derived(visibleMessages(chat?.messages ?? []));
  const thinking = $derived(showThinking(chat?.messages ?? [], status));
  /** The conversation view: once there is anything to show, the intro, suggestions and awards make room. */
  const talking = $derived((chat?.messages.length ?? 0) > 0);

  async function start(): Promise<void> {
    verifyFailed = false;
    await tick(); // the Turnstile widget mounts with the unlocked view
    if (!turnstile) return;
    const widget = turnstile;
    try {
      const token = await widget.getToken();
      handle = createChat({ turnstileToken: token, freshToken: () => widget.getToken() });
    } catch {
      verifyFailed = true;
    }
  }

  onMount(async () => {
    access = (await checkAccess()) ? 'unlocked' : 'locked';
    if (access === 'unlocked') await start();
  });
  onDestroy(() => handle?.close());

  async function submitPassword(event: SubmitEvent): Promise<void> {
    event.preventDefault();
    if (unlocking || !password) return;
    unlocking = true;
    passwordError = '';
    const problem = await unlock(password);
    unlocking = false;
    if (problem) {
      passwordError = problem;
      return;
    }
    password = '';
    access = 'unlocked';
    await start();
    textarea?.focus();
  }

  function send(prompt?: string): void {
    const text = (prompt ?? input).trim();
    if (!chat || busy || !text) return;
    if (prompt === undefined) input = '';
    void chat.sendMessage({ text: text.slice(0, MAX_CHARS) });
    textarea?.focus();
  }

  function onKeydown(event: KeyboardEvent): void {
    // Enter sends, Shift+Enter adds a line; never send in the middle of an IME composition.
    if (event.key === 'Enter' && !event.shiftKey && !event.isComposing) {
      event.preventDefault();
      send();
    }
  }

  function newSearch(): void {
    clearSession();
    location.reload();
  }

  // Keep the newest message in view while a reply streams in.
  $effect(() => {
    const last = chat?.messages.at(-1);
    void [chat?.messages.length, last && textOf(last).length, status];
    void tick().then(() => list?.scrollTo({ top: list.scrollHeight }));
  });

  // Screen readers hear "Searching…" and then the whole reply once, not every streamed word.
  let lastStatus = 'ready';
  $effect(() => {
    const now = status;
    if (now === lastStatus) return;
    if (now === 'submitted') announcement = 'Searching my knowledge…';
    else if (now === 'ready' && lastStatus === 'streaming') {
      const last = chat?.messages.at(-1);
      if (last?.role === 'assistant') announcement = `Assistant: ${textOf(last)}`;
    } else if (now === 'error') announcement = 'The reply failed.';
    lastStatus = now;
  });
</script>

<svelte:head>
  <title>Engaging.io AI Sales Assistant</title>
  <meta name="robots" content="noindex" />
</svelte:head>

{#snippet brand(compact: boolean)}
  <a
    href="https://www.engaging.io/"
    class="inline-block focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand"
  >
    <img
      src="/brand/engaging-logo-dark.png"
      alt="Engaging.io"
      width="317"
      height="79"
      class={compact ? 'h-7 w-auto' : 'h-10 w-auto'}
    />
  </a>
  <h1
    class={[
      'font-semibold tracking-[0.01em] text-white uppercase',
      compact ? 'mt-2 text-lg sm:text-xl' : 'mt-6 text-[1.625rem] leading-tight sm:text-[2.5rem]',
    ]}
  >
    Engaging.io AI Sales Assistant
  </h1>
{/snippet}

{#snippet awards()}
  <section
    aria-label="About Engaging.io"
    class="mx-auto w-full max-w-[540px] px-5 pt-6 text-center"
  >
    <hr class="border-line" />
    <p class="mt-6 text-sm text-muted">
      Engaging.io is an award winner 8 years in a row and #1 in HubSpot advanced implementations
      globally
    </p>
    <a
      href="https://www.engaging.io/"
      class="mt-3 inline-block text-sm font-bold text-brand hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
    >
      Find out more about Engaging.io &gt;
    </a>
  </section>
  <picture class="mx-auto mt-10 block w-full max-w-[800px] px-5">
    <source
      media="(max-width: 767px)"
      srcset="/brand/awards-2025-mobile.png"
      width="1054"
      height="1376"
    />
    <img
      src="/brand/awards-2025.png"
      alt="HubSpot Solutions Partner Program Elite; HubSpot 2025 Impact Awards: JAPAC Partner of the Year, Platform Migration and Product Excellence; HubSpot Academy accreditations in Advanced Implementation, Platform Enablement, Onboarding, Custom Integration and Solutions Architecture Design"
      width="1600"
      height="628"
      loading="lazy"
      class="h-auto w-full"
    />
  </picture>
{/snippet}

{#snippet siteFooter()}
  <footer class="flex justify-center gap-5 px-5 py-3 text-xs text-ink">
    <span>© 2026 Engaging.io</span>
    <a
      href="https://www.engaging.io/privacy-and-terms"
      target="_blank"
      rel="noopener noreferrer"
      class="hover:underline focus-visible:outline-2 focus-visible:outline-brand"
    >
      Privacy and terms
    </a>
  </footer>
{/snippet}

{#if access === 'checking'}
  <main class="min-h-dvh bg-surface" aria-busy="true"></main>
{:else if access === 'locked'}
  <main class="flex min-h-dvh flex-col bg-surface text-ink">
    <div class="mx-auto w-full max-w-[730px] px-5 pt-6 text-center">
      {@render brand(false)}
      <p class="mx-auto mt-4 max-w-[540px] text-[#bebebe]">
        Use our AI assistant to quickly find snippets of information about the clients and
        industries we have worked with.
      </p>

      <form
        class="mx-auto mt-8 flex max-w-[312px] flex-col items-center gap-4"
        onsubmit={submitPassword}
      >
        <label for="chat-password" class="text-xs text-white">
          Please enter the password required to view this page.
        </label>
        <input
          id="chat-password"
          type="password"
          autocomplete="current-password"
          required
          maxlength="256"
          bind:value={password}
          aria-invalid={passwordError ? 'true' : undefined}
          aria-describedby={passwordError ? 'password-error' : undefined}
          class="h-[37px] w-full rounded-md border-2 border-zinc-500 bg-panel px-3 text-white focus:border-brand focus:outline-none"
        />
        {#if passwordError}
          <p id="password-error" class="text-sm text-brand-soft" role="alert">{passwordError}</p>
        {/if}
        <button
          type="submit"
          disabled={unlocking}
          class="rounded-sm bg-brand-strong px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-80 disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
        >
          {unlocking ? 'Checking…' : 'Access the assistant'}
        </button>
      </form>
    </div>

    <div class="mt-16 flex-1">{@render awards()}</div>
    <div class="mt-10">{@render siteFooter()}</div>
  </main>
{:else}
  <main class={['flex flex-col bg-surface text-ink', talking ? 'h-dvh' : 'min-h-dvh']}>
    <div class={['mx-auto w-full max-w-[730px] px-5 text-center', talking ? 'pt-4 pb-2' : 'pt-6']}>
      {@render brand(talking)}
      {#if !talking}
        <p class="mt-4 text-sm text-muted sm:text-base">
          Use our AI assistant to quickly find snippets of information about the clients and
          industries we have worked with. Alternatively, provide it with a URL, and it can classify
          the industry and match with relevant case study examples for outreach.
        </p>
        <ul class="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4" aria-label="Suggested searches">
          {#each SUGGESTIONS as suggestion (suggestion)}
            <li class="flex">
              <button
                type="button"
                disabled={!ready}
                onclick={() => send(suggestion)}
                class="flex w-full items-center justify-center bg-paper px-4 py-3.5 font-mono text-sm leading-snug font-bold text-paper-ink uppercase transition-colors hover:bg-brand hover:text-white focus-visible:bg-brand focus-visible:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white disabled:cursor-wait disabled:opacity-70 disabled:hover:bg-paper disabled:hover:text-paper-ink"
              >
                {suggestion}
              </button>
            </li>
          {/each}
        </ul>
      {/if}
    </div>

    <section
      bind:this={list}
      aria-label="Conversation"
      class={[
        'mx-auto w-full max-w-[570px] px-2.5',
        talking ? 'fade-top min-h-0 flex-1 overflow-y-auto pt-8 pb-4' : '',
      ]}
    >
      <div class="flex flex-col gap-2.5">
        {#each shown as message (message.id)}
          {#if message.role === 'user'}
            <p
              class="bubble-in max-w-[70%] self-end bg-paper px-4 py-3 text-left whitespace-pre-wrap text-paper-ink max-sm:text-sm"
            >
              <span class="sr-only">You:</span>
              {textOf(message)}
            </p>
          {:else if message.role === 'assistant'}
            <div class="bubble-in reply-block mb-5 w-full pt-3 text-left max-sm:text-sm">
              <span class="sr-only">Assistant:</span>
              {#each message.parts as part, i (i)}
                {#if part.type === 'text'}
                  <!-- renderReply sanitises with DOMPurify and strips links not on the allowlist -->
                  <!-- eslint-disable-next-line svelte/no-at-html-tags -->
                  <div class="reply">{@html renderReply(part.text, allowlist)}</div>
                {/if}
              {/each}
              {#if usingTool(message)}
                <p class="mt-2 flex items-center gap-2.5 font-mono text-sm">
                  <span class="pulse-dot size-3" aria-hidden="true"></span>
                  <span class="shining" data-text="Reading a web page">Reading a web page</span>
                </p>
              {/if}
            </div>
          {/if}
        {/each}

        {#if thinking}
          <div class="bubble-in flex items-center gap-2.5 font-mono">
            <span class="pulse-dot m-2.5 size-6" aria-hidden="true"></span>
            <span class="shining" data-text="Searching my knowledge">Searching my knowledge</span>
          </div>
        {/if}
        {#if status === 'error'}
          <p class="text-left text-sm text-brand-soft" role="alert">
            The reply did not come through.
            <button type="button" class="font-bold underline" onclick={() => chat?.regenerate()}>
              Try again
            </button>
          </p>
        {/if}
      </div>
    </section>

    <div class="sr-only" aria-live="polite" aria-atomic="true">{announcement}</div>

    <div class={['mx-auto w-full max-w-[570px] px-2.5', talking ? 'pb-2' : 'mt-8 sm:mt-14']}>
      {#if verifyFailed}
        <p class="mb-2 text-sm text-brand-soft" role="alert">
          We couldn't verify your browser.
          <button type="button" class="font-bold underline" onclick={start}>Try again</button>
        </p>
      {:else if handle?.connection.gaveUp}
        <p class="mb-2 text-sm text-brand-soft" role="alert">
          The connection was lost.
          <button type="button" class="font-bold underline" onclick={() => handle?.reconnect()}>
            Reconnect
          </button>
        </p>
      {:else if connecting}
        <p class="mb-2 flex items-center gap-2 font-mono text-xs text-muted" aria-live="polite">
          <span class="pulse-dot size-2" aria-hidden="true"></span>
          {handle?.connection.everOpened ? 'Reconnecting…' : 'Connecting…'}
        </p>
      {/if}

      <Turnstile bind:this={turnstile} sitekey={PUBLIC_TURNSTILE_SITEKEY} />

      <form
        class="relative flex border border-line bg-panel p-4 transition-colors focus-within:border-brand"
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
          placeholder="Ask about industries or hubs we've worked with or integrations we have done"
          aria-describedby="chat-hint"
          class="field-sizing-content max-h-50 min-h-20 w-full resize-none bg-transparent pr-14 pb-8 text-ink placeholder:text-placeholder focus:outline-none focus:placeholder:text-transparent max-sm:min-h-15"
        ></textarea>
        <button
          type="submit"
          disabled={!canSend}
          class="absolute right-2.5 bottom-2.5 bg-brand px-[15px] py-3 font-mono text-sm leading-none text-white uppercase transition-opacity hover:opacity-70 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
        >
          Go
        </button>
      </form>
      <p id="chat-hint" class="sr-only">Enter to send, Shift+Enter for a new line</p>
      {#if input.length > MAX_CHARS - 500}
        <p class="mt-1 text-right font-mono text-[11px] text-muted">{input.length} / {MAX_CHARS}</p>
      {/if}

      {#if talking}
        <div class="mt-4 flex flex-col items-center gap-3.5 text-center text-sm">
          <p class="font-bold">
            <button
              type="button"
              class="font-bold text-brand hover:underline focus-visible:outline-2 focus-visible:outline-brand"
              onclick={newSearch}
            >
              Start a new search
            </button>
            <span class="text-muted" aria-hidden="true">&nbsp;|&nbsp;</span>
            <a
              href={CONTACT_URL}
              target="_blank"
              rel="noopener noreferrer"
              class="text-brand hover:underline focus-visible:outline-2 focus-visible:outline-brand"
            >
              Contact Engaging.io
            </a>
          </p>
          <p class="text-xs text-muted max-sm:hidden">
            This chat is powered by Claude and customised by Engaging.io. Responses may not always
            be accurate. For support or feedback, please
            <a
              href={CONTACT_URL}
              target="_blank"
              rel="noopener noreferrer"
              class="text-ink underline hover:no-underline"
            >
              contact us.
            </a>
          </p>
        </div>
      {:else}
        <p class="mt-3 text-center text-xs text-muted">
          This assistant is powered by Claude. Check with Engaging.io if information is missing or
          inaccurate.
        </p>
      {/if}
    </div>

    {#if !talking}
      <div class="mt-8 flex-1">{@render awards()}</div>
      <div class="mt-10">{@render siteFooter()}</div>
    {:else}
      {@render siteFooter()}
    {/if}
  </main>
{/if}

<style>
  .reply {
    color: var(--color-ink);
    line-height: 1.6;
  }
  .reply :global(p) {
    margin: 0 0 1em;
  }
  .reply :global(:last-child) {
    margin-bottom: 0;
  }
  .reply :global(strong) {
    color: #fff;
    font-weight: 700;
  }
  .reply :global(h1),
  .reply :global(h2),
  .reply :global(h3) {
    color: #fff;
    font-size: 1.25rem;
    font-weight: 400;
    margin: 0 0 0.5rem;
  }
  .reply :global(h2 strong),
  .reply :global(h3 strong) {
    font-weight: 400;
  }
  .reply :global(ul) {
    list-style: disc;
    padding-left: 1.25em;
    margin: 0 0 1em;
  }
  .reply :global(ol) {
    list-style: decimal;
    padding-left: 1.25em;
    margin: 0 0 1em;
  }
  .reply :global(ol > li) {
    border-bottom: 1px solid var(--color-line);
    margin-bottom: 2rem;
    padding-bottom: 1.5rem;
  }
  .reply :global(ol > li:first-child) {
    padding-top: 1.25rem;
  }
  .reply :global(li::marker) {
    color: var(--color-muted);
  }
  .reply :global(hr) {
    border-color: var(--color-line);
    margin: 2.5rem 0;
  }
  .reply :global(a) {
    color: var(--color-brand-soft);
    text-decoration: underline;
    text-underline-offset: 2px;
  }
  .reply :global(code) {
    font-family: var(--font-mono);
    font-size: 0.9em;
    background: color-mix(in oklch, currentColor 10%, transparent);
    padding: 0 0.25em;
  }
  .reply :global(table) {
    border-collapse: collapse;
    margin: 0 0 1em;
    display: block;
    overflow-x: auto;
  }
  .reply :global(th),
  .reply :global(td) {
    border-bottom: 1px solid var(--color-line);
    padding: 0.4em 0.6em;
    text-align: left;
  }
  .reply :global(th) {
    color: #fff;
    font-weight: 700;
  }

  /* Replies scroll under the title: fade them out at the top edge instead of cutting them off. */
  .fade-top {
    mask-image: linear-gradient(to bottom, transparent, #000 2rem);
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

  /* The pink pulsing dot and the shimmering "Searching my knowledge" text of the HubSpot page. */
  .pulse-dot {
    flex-shrink: 0;
    border-radius: 9999px;
    background: var(--color-brand-strong);
    animation: pulse 2s ease infinite;
  }
  @keyframes pulse {
    0% {
      transform: scale(0.95);
      box-shadow: 0 0 0 0 rgb(219 39 129 / 0.7);
    }
    70% {
      transform: scale(1);
      box-shadow: 0 0 0 10px rgb(219 39 129 / 0);
    }
    100% {
      transform: scale(0.95);
      box-shadow: 0 0 0 0 rgb(219 39 129 / 0);
    }
  }
  .shining {
    position: relative;
    display: inline-block;
    overflow: hidden;
    color: grey;
  }
  .shining::after {
    content: attr(data-text);
    position: absolute;
    inset: 0;
    color: transparent;
    background: linear-gradient(90deg, transparent, rgb(255 255 255 / 0.8) 50%, transparent) -100%
      0 / 50% 100% no-repeat text;
    animation: shine 2s linear infinite;
    pointer-events: none;
  }
  @keyframes shine {
    to {
      background-position: 200% 0;
    }
  }
  @media (prefers-reduced-motion: reduce) {
    .bubble-in,
    .pulse-dot,
    .shining::after {
      animation: none;
    }
  }
</style>
