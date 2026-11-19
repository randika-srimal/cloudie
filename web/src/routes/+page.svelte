<script lang="ts">
  import { Hello } from '@engaging-assistant/protocol';

  // The page itself is static HTML; the greeting below comes live from the Pages Function
  // in backend/api/functions/api/hello.ts.
  let reply = $state<Hello | null>(null);
  let failed = $state(false);

  $effect(() => {
    fetch('/api/hello')
      .then((res) => res.json())
      .then((json) => (reply = Hello.parse(json)))
      .catch(() => (failed = true));
  });
</script>

<svelte:head>
  <title>Engaging Assistant</title>
  <meta name="description" content="Hello world on Cloudflare Pages" />
</svelte:head>

<main class="mx-auto flex min-h-dvh max-w-xl flex-col justify-center gap-6 px-6">
  <h1 class="text-5xl font-bold tracking-tight">
    Hello, <span class="text-brand">world</span>
  </h1>
  <p class="text-muted text-lg">Static SvelteKit page on Cloudflare Pages.</p>

  <p class="rounded-lg border border-current/10 p-4 font-mono text-sm" aria-live="polite">
    {#if reply}
      <span data-testid="api-message">{reply.message}</span>
      <span class="text-muted">from the API at {reply.colo}</span>
    {:else if failed}
      <span class="text-muted">The API is not answering (is <code>pnpm dev</code> running?)</span>
    {:else}
      <span class="text-muted">Asking the API…</span>
    {/if}
  </p>
</main>
