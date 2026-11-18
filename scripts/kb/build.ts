// Builds the knowledge-base bundle the agent reads from R2: `pnpm kb:build`.
//
//   node --experimental-strip-types scripts/kb/build.ts [dir] [outDir]   (defaults: knowledge dist/kb)
//
// Writes outDir/<version>/{instructions.md,prompt.md,manifest.json} and prints the version as the last line
// (scripts/kb/publish.sh reads it). The version is a hash of the uploaded text, so the same knowledge base
// always gets the same version. Refuses to build when `checkKb` reports errors.
import { createHash } from 'node:crypto';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import type { KbManifest } from '../../shared/protocol/src/index.ts';
import { checkKb } from './check.ts';
import { estimateTokens, loadKb, render } from './lib.ts';

export function buildKb(dir: string, outDir: string): KbManifest {
  const { errors } = checkKb(dir);
  if (errors.length) throw new Error(`knowledge base check failed:\n${errors.join('\n')}`);

  const rendered = render(loadKb(dir));
  const version = createHash('sha256')
    .update(`instructions.md\0${rendered.instructions}\0prompt.md\0${rendered.prompt}`)
    .digest('hex')
    .slice(0, 12);
  const manifest: KbManifest = {
    version,
    builtAt: new Date().toISOString(),
    tokens: estimateTokens(rendered.prompt.length + rendered.instructions.length),
    files: rendered.included.length,
    allowlist: rendered.allowlist,
  };
  const target = join(outDir, version);
  mkdirSync(target, { recursive: true });
  writeFileSync(join(target, 'instructions.md'), rendered.instructions);
  writeFileSync(join(target, 'prompt.md'), rendered.prompt);
  writeFileSync(join(target, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
  return manifest;
}

if (import.meta.main) {
  const [dir = 'knowledge', outDir = join('dist', 'kb')] = process.argv.slice(2);
  try {
    const m = buildKb(dir, outDir);
    console.log(
      `built ${join(outDir, m.version)}: ${m.files} case studies, about ${m.tokens} tokens`,
    );
    console.log(m.version);
  } catch (e) {
    console.error((e as Error).message);
    process.exitCode = 1;
  }
}
