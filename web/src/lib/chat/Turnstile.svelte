<!--
  Cloudflare Turnstile, rendered explicitly and run on demand: getToken() runs the check and resolves with a new
  single-use token. With appearance "interaction-only" nothing shows unless Cloudflare needs the visitor to
  click, and then the checkbox appears here.
-->
<script lang="ts" module>
  interface TurnstileOptions {
    sitekey: string;
    appearance: 'always' | 'execute' | 'interaction-only';
    execution: 'render' | 'execute';
    retry: 'auto' | 'never';
    callback: (token: string) => void;
    'error-callback': (code: string) => boolean;
    'expired-callback': () => void;
    'timeout-callback': () => void;
  }

  interface TurnstileApi {
    render: (container: HTMLElement, options: TurnstileOptions) => string;
    execute: (widgetId: string) => void;
    reset: (widgetId: string) => void;
  }

  const SCRIPT_URL = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
  let loading: Promise<TurnstileApi> | null = null;

  function loadTurnstile(): Promise<TurnstileApi> {
    loading ??= new Promise<TurnstileApi>((resolve, reject) => {
      const script = document.createElement('script');
      script.src = SCRIPT_URL;
      script.async = true;
      script.onload = () => {
        const api = (window as { turnstile?: TurnstileApi }).turnstile;
        if (api) resolve(api);
        else reject(new Error('Turnstile did not load'));
      };
      script.onerror = () => {
        loading = null; // allow a later retry
        reject(new Error('Turnstile did not load'));
      };
      document.head.append(script);
    });
    return loading;
  }
</script>

<script lang="ts">
  let { sitekey }: { sitekey: string } = $props();

  let container: HTMLDivElement;
  let widgetId: string | null = null;
  let waiting: { resolve: (token: string) => void; reject: (err: Error) => void } | null = null;
  // One check at a time: tokens are single-use, so two callers must not share one.
  let queue: Promise<unknown> = Promise.resolve();

  function settle(token: string | null, reason = 'Verification failed'): void {
    const current = waiting;
    waiting = null;
    if (!current) return;
    if (token) current.resolve(token);
    else current.reject(new Error(reason));
  }

  async function run(): Promise<string> {
    const api = await loadTurnstile();
    const token = new Promise<string>((resolve, reject) => (waiting = { resolve, reject }));
    if (widgetId === null) {
      widgetId = api.render(container, {
        sitekey,
        appearance: 'interaction-only',
        execution: 'execute',
        retry: 'never',
        callback: (t) => settle(t),
        'error-callback': (code) => {
          settle(null, `Verification failed (${code})`);
          return true; // handled: Turnstile does not throw
        },
        'expired-callback': () => settle(null, 'Verification expired'),
        'timeout-callback': () => settle(null, 'Verification timed out'),
      });
    } else {
      api.reset(widgetId);
    }
    api.execute(widgetId);
    return token;
  }

  /** Runs a Turnstile check and resolves with a fresh token. */
  export function getToken(): Promise<string> {
    const next = queue.then(run);
    queue = next.catch(() => undefined);
    return next;
  }
</script>

<div bind:this={container} class="flex justify-center empty:hidden"></div>
