// Shared code of the knowledge-base scripts: frontmatter parsing, loading knowledge/, and rendering the
// bundle the agent reads (instructions.md + prompt.md). check.ts and build.ts render through the same
// functions, so the check scans exactly the text that gets uploaded.
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
// scripts/ is not a workspace package, so the schemas come in by path.
import { CaseStudyFrontmatter, type CaseStudyStatus } from '../../shared/protocol/src/index.ts';

export type CaseStudy = { slug: string; file: string; meta: CaseStudyFrontmatter; body: string };

/** Token estimate used for the size limits (no tokenizer: about 3.5 characters per token for English prose). */
export const estimateTokens = (chars: number): number => Math.ceil(chars / 3.5);
export const WARN_TOKENS = 120_000;
export const FAIL_TOKENS = 180_000;

/** Statuses that are kept in the repo but never uploaded. */
export const UNPUBLISHED: readonly CaseStudyStatus[] = ['excluded', 'never_disclose'];

// ── Frontmatter (a small YAML subset) ─────────────────────────────────────
// Supports `key: value` lines whose value is a plain, "double-quoted" (JSON escapes) or 'single-quoted'
// string, null / ~, a flow list `[a, "b"]`, or a block list of `  - item` lines, and ` # comments`. Enough
// for case studies, without a YAML dependency.

/** Cuts a ` # comment` that is outside quotes. */
function stripComment(raw: string): string {
  let quote: string | null = null;
  for (let i = 0; i < raw.length; i++) {
    const c = raw[i]!;
    if (quote) {
      if (c === '\\' && quote === '"') i++;
      else if (c === quote) quote = null;
    } else if (c === '"' || c === "'") quote = c;
    else if (c === '#' && (i === 0 || /\s/.test(raw[i - 1]!))) return raw.slice(0, i).trimEnd();
  }
  return raw;
}

function scalar(raw: string): string | null {
  const v = raw.trim();
  if (v === '' || v === 'null' || v === '~') return null;
  if (v.startsWith('"')) return JSON.parse(v) as string;
  if (v.startsWith("'")) {
    if (!v.endsWith("'") || v.length < 2) throw new Error(`unterminated string: ${v}`);
    return v.slice(1, -1).replaceAll("''", "'");
  }
  return v;
}

function flowList(raw: string): string[] {
  const inner = raw.trim().slice(1, -1).trim();
  if (inner === '') return [];
  const items: string[] = [];
  let current = '';
  let quote: string | null = null;
  for (let i = 0; i < inner.length; i++) {
    const c = inner[i]!;
    if (quote) {
      current += c;
      if (c === '\\' && quote === '"') current += inner[++i] ?? '';
      else if (c === quote) quote = null;
    } else if (c === '"' || c === "'") {
      quote = c;
      current += c;
    } else if (c === ',') {
      items.push(current);
      current = '';
    } else current += c;
  }
  if (quote) throw new Error(`unterminated string in list: ${raw}`);
  items.push(current);
  return items.map((item) => scalar(item) ?? '');
}

/** Splits `---` frontmatter from the body and parses it. Throws when there is none or it is malformed. */
export function parseFrontmatter(text: string): { data: Record<string, unknown>; body: string } {
  const match = /^---\r?\n([\s\S]*?)\r?\n---[ \t]*(?:\r?\n|$)/.exec(text);
  if (!match) throw new Error('no frontmatter (the file must start with a --- block)');
  const data: Record<string, unknown> = {};
  let listKey: string | null = null;
  for (const line of match[1]!.split(/\r?\n/)) {
    if (line.trim() === '' || line.trimStart().startsWith('#')) continue;
    const item = /^\s+-\s*(.*)$/.exec(line);
    if (item) {
      if (listKey === null) throw new Error(`list item outside a list: ${line}`);
      (data[listKey] as string[]).push(scalar(stripComment(item[1]!)) ?? '');
      continue;
    }
    const pair = /^([A-Za-z_][\w-]*):(?:\s+(.*))?$/.exec(line);
    if (!pair) throw new Error(`cannot read line: ${line}`);
    const [, key] = pair;
    const value = stripComment(pair[2] ?? '');
    if (key! in data) throw new Error(`duplicate key: ${key}`);
    listKey = null;
    if (value.trim() === '') {
      // Either null or the start of a block list; a following `- item` line decides.
      data[key!] = [];
      listKey = key!;
    } else data[key!] = value.trim().startsWith('[') ? flowList(value) : scalar(value);
  }
  // A key with nothing after it and no items is null, not an empty list.
  for (const [key, value] of Object.entries(data))
    if (
      Array.isArray(value) &&
      value.length === 0 &&
      new RegExp(`^${key}:\\s*$`, 'm').test(match[1]!)
    )
      data[key] = null;
  return { data, body: text.slice(match[0].length) };
}

const yamlString = (v: string): string => JSON.stringify(v);

/** Writes frontmatter that parseFrontmatter reads back (strings always double-quoted). */
export function serializeFrontmatter(meta: CaseStudyFrontmatter): string {
  const list = (v: string[]) => `[${v.map(yamlString).join(', ')}]`;
  return [
    '---',
    `client: ${yamlString(meta.client)}`,
    `display_name: ${yamlString(meta.display_name)}`,
    `status: ${meta.status}`,
    `url: ${meta.url === null ? 'null' : yamlString(meta.url)}`,
    `industry: ${list(meta.industry)}`,
    `region: ${list(meta.region)}`,
    `hubs: ${list(meta.hubs)}`,
    `migration_from: ${list(meta.migration_from)}`,
    `updated: ${meta.updated}`,
    '---',
    '',
  ].join('\n');
}

/** Parses a case study file. Throws an Error naming `path` when the frontmatter is missing or invalid. */
export function parseCaseStudy(
  path: string,
  text: string,
): { meta: CaseStudyFrontmatter; body: string } {
  let parsed: { data: Record<string, unknown>; body: string };
  try {
    parsed = parseFrontmatter(text);
  } catch (e) {
    throw new Error(`${path}: ${(e as Error).message}`, { cause: e });
  }
  const result = CaseStudyFrontmatter.safeParse(parsed.data);
  if (!result.success) {
    const issues = result.error.issues
      .map((i) => `${i.path.join('.') || '(frontmatter)'}: ${i.message}`)
      .join('; ');
    throw new Error(`${path}: invalid frontmatter: ${issues}`);
  }
  return { meta: result.data, body: parsed.body.replace(/^\s+/, '').trimEnd() + '\n' };
}

// ── Loading knowledge/ ────────────────────────────────────────────────────

export type LoadedKb = {
  instructions: string;
  studies: CaseStudy[];
  /** Names from never-disclose.txt (comments and blank lines dropped). */
  neverDisclose: string[];
  /** Files that could not be parsed, with the reason. */
  errors: string[];
};

/**
 * Reads `dir/instructions.md`, `dir/never-disclose.txt` (optional) and every `dir/case-studies/*.md`.
 * Files and folders starting with `_` (such as `_unmatched/`) are skipped.
 */
export function loadKb(dir: string): LoadedKb {
  const errors: string[] = [];
  const instructions = readFileSync(join(dir, 'instructions.md'), 'utf8');
  const ndPath = join(dir, 'never-disclose.txt');
  const neverDisclose = existsSync(ndPath)
    ? readFileSync(ndPath, 'utf8')
        .split(/\r?\n/)
        .map((l) => l.trim())
        .filter((l) => l !== '' && !l.startsWith('#'))
    : [];
  const studies: CaseStudy[] = [];
  const csDir = join(dir, 'case-studies');
  const files = readdirSync(csDir)
    .filter((f) => f.endsWith('.md') && !f.startsWith('_'))
    .sort();
  for (const file of files) {
    try {
      const { meta, body } = parseCaseStudy(
        `case-studies/${file}`,
        readFileSync(join(csDir, file), 'utf8'),
      );
      studies.push({
        slug: file.slice(0, -3).toLowerCase(),
        file: `case-studies/${file}`,
        meta,
        body,
      });
    } catch (e) {
      errors.push((e as Error).message);
    }
  }
  return { instructions, studies, neverDisclose, errors };
}

// ── Rendering the bundle ──────────────────────────────────────────────────

/** Index sections, in order, with the status each one lists. Headings as in the old case_study_index.md. */
const SECTIONS: { status: CaseStudyStatus; heading: string; intro: string; naming: string }[] = [
  {
    status: 'published',
    heading: 'Published, client can be named',
    intro: 'These have a public page and can be quoted freely and shared with their link.',
    naming: 'Nameable',
  },
  {
    status: 'anonymous',
    heading: 'Published anonymously, do not name the client',
    intro:
      'The client asked not to be named. Always use the descriptor in bold, never a client name, and give no detail that would identify them.',
    naming: 'RESTRICTED. Use only the descriptor above; never name the client.',
  },
  {
    status: 'reference',
    heading: 'Approved for reference, no verified public page',
    intro: 'Reference these where they are the best match. There is no page to link to.',
    naming: 'Nameable',
  },
  {
    status: 'draft',
    heading: 'Draft, not yet client approved',
    intro:
      'Written up internally but not approved by the client or published. Discuss them where they are the best match and say the write-up is still in draft. Do not quote their metrics, testimonials or client quotes.',
    naming: 'Nameable. Draft, not yet client approved.',
  },
];

/** The first paragraph of the body (its first block of non-blank lines), on one line. */
export function summaryOf(body: string): string {
  const para = body.trim().split(/\n\s*\n/)[0] ?? '';
  return para.replace(/\s*\n\s*/g, ' ').trim();
}

const HEADING = /^(#{1,6})\s+(.*)$/;
/** A line that is only bold text, used as a heading in the Google Docs exports ("**Results**"). */
const BOLD_LINE = /^\*\*([^*]+?)\*\*:?\s*$/;
/** Draft sections left out of the bundle: unverified numbers and client quotes. */
const DRAFT_DROP =
  /^(?:the\s+|key\s+)?(?:results?|impact|outcomes?|testimonials?|client (?:feedback|quotes?)|stats?\s*\/\s*callouts?|metrics?(?:\s+block)?)\b/i;

/**
 * For drafts: removes Results / Impact (and similar: outcomes, metrics, stats, testimonials) sections and
 * every quote block. A section runs to the next heading of the same or a higher level; a bold-only line
 * counts as a heading below all `#` levels.
 */
export function stripDraft(body: string): string {
  const out: string[] = [];
  let dropLevel = 0;
  for (const line of body.split('\n')) {
    const h = HEADING.exec(line);
    const bold = h ? undefined : BOLD_LINE.exec(line.trim());
    if (h || bold) {
      const level = h ? h[1]!.length : 7;
      if (dropLevel && level <= dropLevel) dropLevel = 0;
      const title = (h ? h[2]! : bold![1]!)
        .replace(/[*_`]/g, '')
        .replace(/^[^\p{L}]+/u, '')
        .trim();
      if (!dropLevel && DRAFT_DROP.test(title)) dropLevel = level;
    }
    if (dropLevel || /^\s*>/.test(line)) continue;
    out.push(line);
  }
  return out.join('\n').replace(/\n{3,}/g, '\n\n');
}

function indexBlock(s: CaseStudy, naming: string): string {
  const m = s.meta;
  const lines = [
    `**${m.display_name}**`,
    `Naming: ${naming}`,
    `Industry: ${m.industry.join(', ') || 'Not recorded'}`,
    `Region: ${m.region.join(', ') || 'Not recorded'}`,
    `HubSpot licensing: ${m.hubs.join(', ') || 'Not recorded'}`,
  ];
  if (m.migration_from.length) lines.push(`Migrated from: ${m.migration_from.join(', ')}`);
  lines.push(`Link: ${m.url ?? 'none published'}`, `Summary: ${summaryOf(s.body)}`);
  return lines.join('\n');
}

function documentBlock(s: CaseStudy): string {
  const body = s.meta.status === 'draft' ? stripDraft(s.body) : s.body;
  return `<document name="${s.slug}">\n# ${s.meta.display_name}\n\n${body.trim()}\n</document>`;
}

export type Rendered = {
  /** The studies that go into the bundle (excluded and never_disclose dropped). */
  included: CaseStudy[];
  /** Index block plus document of each included study, by slug: what each file contributes. */
  parts: Map<string, string>;
  prompt: string;
  instructions: string;
  allowlist: string[];
};

/** Renders the upload: instructions.md unchanged, and prompt.md = generated index + documents. */
export function render(kb: LoadedKb): Rendered {
  const included = kb.studies.filter((s) => !UNPUBLISHED.includes(s.meta.status));
  const parts = new Map<string, string>();
  const index: string[] = [
    '# Engaging.io case study index',
    '',
    'Generated from knowledge/case-studies. Every engagement you may reference is listed here, and the Link lines are the only case study URLs that exist.',
  ];
  for (const section of SECTIONS) {
    const studies = included.filter((s) => s.meta.status === section.status);
    if (!studies.length) continue;
    index.push('', `## ${section.heading}`, '', section.intro);
    for (const s of studies) {
      const block = indexBlock(s, section.naming);
      index.push('', block);
      parts.set(s.slug, block);
    }
  }
  const docs = included.map((s) => {
    const doc = documentBlock(s);
    parts.set(s.slug, `${parts.get(s.slug) ?? ''}\n\n${doc}`);
    return doc;
  });
  const prompt =
    `<case_study_index>\n${index.join('\n')}\n</case_study_index>\n\n` +
    `<case_study_documents>\n${docs.join('\n\n')}\n</case_study_documents>\n`;
  const allowlist = [
    ...new Set(included.map((s) => s.meta.url).filter((u): u is string => u !== null)),
  ];
  return { included, parts, prompt, instructions: kb.instructions, allowlist };
}

// ── Name matching ─────────────────────────────────────────────────────────

const escapeRegExp = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** A case-insensitive whole-word matcher for `name` (letters or digits may not touch either end). */
export const nameRegExp = (name: string, flags = 'iu'): RegExp =>
  new RegExp(
    `(?<![\\p{L}\\p{N}])${escapeRegExp(name.trim()).replace(/\s+/g, '\\s+')}(?![\\p{L}\\p{N}])`,
    flags,
  );
