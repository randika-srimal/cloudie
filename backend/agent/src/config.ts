import { AssistantConfig, DEFAULT_CONFIG } from '@cloudie/protocol';
import { z } from 'zod/mini';
import type { Env } from './env.ts';

const TTL_MS = 60_000;
let cached: { value: AssistantConfig; expires: number } | undefined;

/** Clears the per-isolate cache. For tests. */
export function resetConfigCache(): void {
  cached = undefined;
}

/**
 * Reads KV key `config` (JSON), merges it over DEFAULT_CONFIG and validates. Anything unreadable or
 * invalid falls back to the defaults. Cached per isolate for 60 s.
 */
export async function loadConfig(env: Env, now = Date.now()): Promise<AssistantConfig> {
  if (cached && now < cached.expires) return cached.value;
  let value: AssistantConfig = { ...DEFAULT_CONFIG };
  const raw = await env.CONFIG.get('config');
  if (raw !== null) {
    try {
      const parsed = AssistantConfig.safeParse({
        ...DEFAULT_CONFIG,
        ...(JSON.parse(raw) as object),
      });
      if (parsed.success) value = parsed.data;
      else console.warn('config invalid', z.prettifyError(parsed.error));
    } catch {
      console.warn('config invalid', 'not JSON');
    }
  }
  cached = { value, expires: now + TTL_MS };
  return value;
}
