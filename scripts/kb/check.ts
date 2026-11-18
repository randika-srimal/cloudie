// Checks knowledge/ before it is built or published: `pnpm kb:check` (CI runs it on every pull request).
//
//   node --experimental-strip-types scripts/kb/check.ts [dir]     (dir defaults to knowledge)
//
// Errors fail the run; warnings only print. Confidentiality is enforced here, on the rendered upload, not by
// the prompt: a name that must never appear stops the build wherever it turns up.
import {
  estimateTokens,
  FAIL_TOKENS,
  loadKb,
  nameRegExp,
  render,
  WARN_TOKENS,
  type LoadedKb,
} from './lib.ts';

export type CheckResult = { errors: string[]; warnings: string[]; tokens: number };

/** Leftover Google Docs markdown escapes (`\*`, `https\:`). */
const ESCAPES = /\\\*|https?\\:/;

/** Names that must not appear in any uploaded text, each with the reason it is restricted. */
function restrictedNames(kb: LoadedKb): { name: string; why: string }[] {
  const names = kb.neverDisclose.map((name) => ({ name, why: 'never-disclose.txt' }));
  for (const s of kb.studies) {
    const { client, display_name, status } = s.meta;
    if (status === 'never_disclose')
      names.push({ name: client, why: `never_disclose (${s.file})` });
    // An anonymous record's client field holds the real name; only display_name may be uploaded. Records
    // whose real name is not known keep the descriptor in both fields, which is not a name to look for.
    if (status === 'anonymous' && !nameRegExp(client).test(display_name))
      names.push({ name: client, why: `anonymous client of ${s.file}` });
  }
  return names;
}

export function checkKb(dir: string): CheckResult {
  const kb = loadKb(dir);
  const errors = [...kb.errors];
  const warnings: string[] = [];

  const seen = new Map<string, string>();
  for (const s of kb.studies) {
    const other = seen.get(s.slug);
    if (other) errors.push(`${s.file}: slug "${s.slug}" is also used by ${other}`);
    else seen.set(s.slug, s.file);
    if (ESCAPES.test(s.body))
      errors.push(`${s.file}: Google Docs escape left in the text (\\* or https\\:)`);
  }
  if (ESCAPES.test(kb.instructions))
    errors.push('instructions.md: Google Docs escape left in the text (\\* or https\\:)');

  const rendered = render(kb);
  const uploaded: [string, string][] = [
    ['instructions.md', rendered.instructions],
    ...rendered.included.map((s): [string, string] => [s.file, rendered.parts.get(s.slug) ?? '']),
  ];
  for (const { name, why } of restrictedNames(kb)) {
    const re = nameRegExp(name);
    for (const [file, text] of uploaded)
      if (re.test(text))
        errors.push(`${file}: contains "${name}" (${why}), which must never be uploaded`);
  }

  const tokens = estimateTokens(rendered.prompt.length + rendered.instructions.length);
  if (tokens > FAIL_TOKENS)
    errors.push(`the bundle is about ${tokens} tokens, over the ${FAIL_TOKENS} limit`);
  else if (tokens > WARN_TOKENS)
    warnings.push(`the bundle is about ${tokens} tokens, over the ${WARN_TOKENS} warning level`);

  return { errors, warnings, tokens };
}

if (import.meta.main) {
  const dir = process.argv[2] ?? 'knowledge';
  const { errors, warnings, tokens } = checkKb(dir);
  const kb = loadKb(dir);
  const counts = new Map<string, number>();
  for (const s of kb.studies) counts.set(s.meta.status, (counts.get(s.meta.status) ?? 0) + 1);
  console.log(
    `${kb.studies.length} case studies (${[...counts].map(([k, v]) => `${k} ${v}`).join(', ')})`,
  );
  console.log(`about ${tokens} tokens`);
  for (const w of warnings) console.warn(`warning: ${w}`);
  for (const e of errors) console.error(`error: ${e}`);
  console.log(`${errors.length} errors, ${warnings.length} warnings`);
  process.exitCode = errors.length ? 1 : 0;
}
