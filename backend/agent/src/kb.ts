import { KbManifest } from '@cloudie/protocol';
import { z } from 'zod/mini';
import type { Env } from './env.ts';

export type Kb = { version: string; prompt: string; instructions: string; manifest: KbManifest };

let cached: Kb | undefined;

/** Clears the per-isolate cache. For tests. */
export function resetKbCache(): void {
  cached = undefined;
}

/**
 * Loads the published knowledge-base bundle `kb/<version>/{instructions.md,prompt.md,manifest.json}` from R2.
 * The last good bundle is cached per isolate. A missing or invalid version is logged and answers with the
 * cached bundle (whatever its version), or null when none has loaded yet.
 */
export async function loadKb(env: Env, version: string): Promise<Kb | null> {
  if (version === '' || cached?.version === version) return cached ?? null;
  const base = `kb/${version}/`;
  const [instructions, prompt, manifestRaw] = await Promise.all([
    env.KB.get(`${base}instructions.md`).then((o) => o?.text() ?? null),
    env.KB.get(`${base}prompt.md`).then((o) => o?.text() ?? null),
    env.KB.get(`${base}manifest.json`).then((o) => o?.text() ?? null),
  ]);
  const fail = (reason: string): Kb | null => {
    console.warn(`kb ${version} unavailable: ${reason}`);
    return cached ?? null;
  };
  if (instructions === null || prompt === null || manifestRaw === null)
    return fail('object missing');
  let json: unknown;
  try {
    json = JSON.parse(manifestRaw);
  } catch {
    return fail('manifest not JSON');
  }
  const manifest = KbManifest.safeParse(json);
  if (!manifest.success) return fail(`manifest invalid: ${z.prettifyError(manifest.error)}`);
  cached = { version, prompt, instructions, manifest: manifest.data };
  return cached;
}
