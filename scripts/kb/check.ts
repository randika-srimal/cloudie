// Checks knowledge/ before it is built or published: `pnpm kb:check` (CI runs it on every pull request).
//
//   node --experimental-strip-types scripts/kb/check.ts [dir]     (dir defaults to knowledge)
//
// Errors fail the run; warnings only print. Confidentiality is enforced here, on the rendered upload, not by
// the prompt: a name that must never appear stops the build wherever it turns up.
//
// In GitHub Actions it also reports for people who edit on github.com (knowledge/EDITING.md): each error becomes
// an annotation on its file in the pull request, and the run gets a plain-language summary.
import { appendFileSync } from 'node:fs';
import {
  estimateTokens,
  FAIL_TOKENS,
  loadKb,
  foldAccents,
  nameRegExp,
  restrictedNameMatcher,
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
  // Link URLs are the client-approved public pages and cannot be changed here, so they are not scanned: a
  // restricted word inside one (e.g. "grand-prix" in a page slug) is allowed there and nowhere else.
  const scanned = uploaded.map(([file, text]): [string, string] => [
    file,
    foldAccents(rendered.allowlist.reduce((t, url) => t.split(url).join(' '), text)),
  ]);
  for (const { name, why } of restrictedNames(kb)) {
    const re = restrictedNameMatcher(name);
    for (const [file, text] of scanned)
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

/** Characters GitHub workflow commands need escaped in a message (`%`, CR, LF) and in a property (also `:` `,`). */
const escapeData = (s: string) =>
  s.replaceAll('%', '%25').replaceAll('\r', '%0D').replaceAll('\n', '%0A');
const escapeProperty = (s: string) => escapeData(s).replaceAll(':', '%3A').replaceAll(',', '%2C');

/** The file an error or warning is about (`case-studies/x.md`, `instructions.md`…) and the rest of it. */
function splitFile(message: string): { file: string | null; text: string } {
  const m = /^((?:case-studies\/[^:\s]+\.md)|instructions\.md|never-disclose\.txt): (.*)$/s.exec(
    message,
  );
  return m ? { file: m[1]!, text: m[2]! } : { file: null, text: message };
}

/**
 * What a GitHub Actions run shows for a check: `annotations` (workflow commands that pin each error or warning
 * to its file in the pull request's "Files changed") and `summary` (markdown for the run's summary page),
 * worded for someone who edited a file on github.com. `dir` is the knowledge folder relative to the repo root;
 * `helpUrl`, when given, links the editing guide.
 */
export function githubReport(
  result: CheckResult,
  dir: string,
  helpUrl?: string,
): { annotations: string[]; summary: string } {
  const annotate = (level: 'error' | 'warning', message: string) => {
    const { file, text } = splitFile(message);
    const where = file ? `file=${escapeProperty(`${dir}/${file}`)},` : '';
    return `::${level} ${where}title=Knowledge base check::${escapeData(text)}`;
  };
  const annotations = [
    ...result.errors.map((e) => annotate('error', e)),
    ...result.warnings.map((w) => annotate('warning', w)),
  ];

  const cell = (s: string) => s.replaceAll('|', '\\|').replaceAll('\n', ' ');
  const rows = (messages: string[]) =>
    messages.map((m) => {
      const { file, text } = splitFile(m);
      return `| ${file ? `\`${file}\`` : 'whole knowledge base'} | ${cell(text)} |`;
    });
  const lines = ['## Knowledge base check', ''];
  if (result.errors.length === 0) {
    lines.push('**Passed.** Nothing blocks this change. A reviewer can merge it.');
  } else {
    lines.push(
      `**${result.errors.length} problem${result.errors.length === 1 ? '' : 's'} to fix before this can be merged.**`,
      '',
      'Open the file named below, click the pencil icon, fix it and commit to this same branch. The check runs again by itself.',
      '',
      '| File | Problem |',
      '| --- | --- |',
      ...rows(result.errors),
    );
  }
  if (result.warnings.length > 0)
    lines.push(
      '',
      '**Notes** (these do not block the change):',
      '',
      '| File | Note |',
      '| --- | --- |',
      ...rows(result.warnings),
    );
  if (helpUrl) lines.push('', `Help: [How to edit the knowledge base](${helpUrl})`);
  return { annotations, summary: `${lines.join('\n')}\n` };
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
  if (process.env.GITHUB_ACTIONS === 'true') {
    const { GITHUB_SERVER_URL: server, GITHUB_REPOSITORY: repo } = process.env;
    const help = server && repo ? `${server}/${repo}/blob/main/${dir}/EDITING.md` : undefined;
    const report = githubReport({ errors, warnings, tokens }, dir, help);
    for (const a of report.annotations) console.log(a);
    if (process.env.GITHUB_STEP_SUMMARY)
      appendFileSync(process.env.GITHUB_STEP_SUMMARY, report.summary);
  }
  process.exitCode = errors.length ? 1 : 0;
}
