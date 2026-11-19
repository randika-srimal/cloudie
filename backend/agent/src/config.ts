import { AssistantConfig, DEFAULT_CONFIG } from '@engaging-assistant/protocol';
import { z } from 'zod/mini';
import type { Env } from './env.ts';

const TTL_MS = 60_000;
/** The last config read from KV (kept past its TTL as the fallback during a KV outage). */
let cached: { value: AssistantConfig; expires: number } | undefined;
/** Whether the current KV outage has been logged already. */
let outage = false;

/** Clears the per-isolate cache. For tests. */
export function resetConfigCache(): void {
  cached = undefined;
  outage = false;
}

/**
 * Reads KV key `config` (JSON), merges it over DEFAULT_CONFIG and validates. Anything invalid falls back to
 * the defaults. Cached per isolate for 60 s. Never throws: when KV itself fails, the last config read is
 * used (however old), or a copy of the defaults when none has been read yet; the outage is logged once.
 */
export async function loadConfig(env: Env, now = Date.now()): Promise<AssistantConfig> {
  if (cached && now < cached.expires) return cached.value;
  let value: AssistantConfig = { ...DEFAULT_CONFIG };
  let raw: string | null;
  try {
    raw = await env.CONFIG.get('config');
  } catch (e) {
    if (!outage) console.error('config KV unavailable, using last good config', String(e));
    outage = true;
    return cached?.value ?? { ...DEFAULT_CONFIG };
  }
  outage = false;
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
