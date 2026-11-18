// Types `env` from `cloudflare:test` as the Functions' own Env, so tests and code agree.
import type { Env as AppEnv } from '../functions/_lib/env.ts';

declare global {
  namespace Cloudflare {
    // eslint-disable-next-line @typescript-eslint/no-empty-object-type
    interface Env extends AppEnv {}
  }
}
