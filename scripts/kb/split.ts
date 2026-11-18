// One-off migration from the old assistant's knowledge base (three Google-Docs exports, a hand-written index
// and instructions with a URL list) to one file per case study. Run once and committed with its output; kept
// for the record of how the files were made.
//
//   node --experimental-strip-types scripts/kb/split.ts <old knowledge dir> <new knowledge dir>
//   (in the container: scripts/kb/split.ts .tmp/old-kb knowledge)
//
// Prints a report: counts per status, unmatched documents, anonymous-name replacements and hand fixes.
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import type { CaseStudyFrontmatter, CaseStudyStatus } from '../../shared/protocol/src/index.ts';
import { nameRegExp, serializeFrontmatter } from './lib.ts';

const UPDATED = '2026-11-18';

type Rec = {
  name: string;
  status: CaseStudyStatus;
  fields: Record<string, string>;
  /** Real names the client must never be called by (from the Naming field). */
  restricted: string[];
  summary: string;
  docs: { title: string; body: string }[];
  /** From "In the case study documents, not yet in this index" (no record fields). */
  notIndexed?: boolean;
};

// ── Hand fixes, all reported ──────────────────────────────────────────────

const fixes: string[] = [];

/** Index section → status. */
const SECTION_STATUS: Record<string, CaseStudyStatus> = {
  'Published, client can be named': 'published',
  'Published anonymously, do not name the client': 'anonymous',
  'Approved for reference, no verified public page': 'reference',
  'In the case study documents, not yet in this index': 'draft',
  'Draft, not yet client approved': 'draft',
  Excluded: 'excluded',
  'Never disclose': 'never_disclose',
};

/** Document titles that do not contain their record's name. */
const TITLE_ALIASES: Record<string, string> = {
  'Bailie Lodges': 'A collection of award-winning luxury lodges',
  'E-Commerce Equation': 'Ecommerce Equation',
  'COUNTRY WIDE': 'Countrywide Food Services',
  FRONTIER: 'An enterprise HR and payroll software provider',
  'AUCTIONS PLUS': 'An Australian agricultural and livestock marketplace',
  JWH: 'JWH Group',
  'Australian Film Television and Radio School':
    'AFTRS (Australian Film Television and Radio School)',
  'Evergreen Enterprise': 'Evergreen Enterprises',
  'Miami Grand Prix': 'A Miami-based stadium: its motorsport event brand',
};

/** Real-name replacements in anonymous bodies. Default: the descriptor with "the" for "a". */
const ANON_REPLACE: Record<string, [string, string][]> = {
  'A Miami-based stadium and its major sports and entertainment brands': [
    ['Crypto.com Miami Grand Prix', "the stadium's motorsport event"],
    ['Miami Grand Prix', "the stadium's motorsport event"],
    ['Hard Rock Stadium Concerts', "the stadium's concert brand"],
    ['Miami Dolphins', "the stadium's football team"],
    ['Dolphins', 'the football team'],
    ['Miami Open', "the stadium's tennis tournament"],
    ['Hard Rock Stadium', 'the stadium'],
    ['Hard Rock', 'the stadium'],
    ['HRS', 'the stadium'],
  ],
  'A collection of award-winning luxury lodges': [
    ['Baillie Lodges', 'the lodges brand'],
    ['Bailie Lodges', 'the lodges brand'],
    ['Tierra Hotels', 'the hotels brand'],
  ],
  'A luxury hospitality group operating a hotel, restaurant and spa': [
    ['Lake House Daylesford', 'the luxury hospitality group'],
    ['Lake House', 'the luxury hospitality group'],
    ['Lakehouse', 'the luxury hospitality group'],
    ['Daylesford', 'its regional town'],
  ],
  'A global food and beverage manufacturer': [
    ['Kraft Heinz', 'the global food and beverage manufacturer'],
  ],
  'A NSW Government entity managing cemetery and memorial services': [
    ['Metropolitan Memorial Parks (MMPLM)', 'the entity'],
    ['Metropolitan Memorial Parks', 'the entity'],
    // Used as an adjective ("four MMPLM cemetery sites"): drop the name.
    ['MMPLM cemetery', 'cemetery'],
    ['MMPLM sites', 'sites'],
    ['MMPLM site', 'site'],
    ['MMPLM staff', 'staff'],
    ['MMPLM network', 'network'],
    ['MMPLM', 'the entity'],
    ['MMP', 'the entity'],
  ],
};

/** Extra names to replace beyond the Naming field's "Do not name …" list. */
const EXTRA_RESTRICTED: Record<string, string[]> = {
  'A Miami-based stadium and its major sports and entertainment brands': [
    'Dolphins',
    'Hard Rock',
    'HRS',
  ],
  'A collection of award-winning luxury lodges': ['Bailie Lodges'],
  'A luxury hospitality group operating a hotel, restaurant and spa': [
    'Lake House',
    'Lakehouse',
    'Daylesford',
  ],
  'A NSW Government entity managing cemetery and memorial services': ['MMPLM', 'MMP'],
  'An Australian air conditioning and ventilation manufacturer': ['Polyaire'],
};

/** Prior platforms that the Tech stack field does not spell as "migration from". */
const MIGRATION_OVERRIDES: Record<string, string[]> = {
  'Cash Converters': ['Adobe Campaign'],
  'Race Roster': ['Salesforce'],
  'Michael Cassel Group': ['Salesforce'],
  Montu: ['Zendesk Sell', 'Zendesk Service', 'spreadsheets'],
  'NSW Rugby League': ['Salesforce Marketing Cloud'],
  'Dream Vacations': ['SugarCRM'],
};

// ── Parsing the old index ─────────────────────────────────────────────────

function parseIndex(text: string): Rec[] {
  const recs: Rec[] = [];
  const sections = text.split(/^## /m).slice(1);
  for (const section of sections) {
    const heading = section.slice(0, section.indexOf('\n')).trim();
    const status = SECTION_STATUS[heading];
    if (!status) throw new Error(`unknown index section: ${heading}`);
    const content = section.slice(section.indexOf('\n') + 1);
    if (heading === 'In the case study documents, not yet in this index') {
      for (const para of content.split(/\n\s*\n/).map((p) => p.trim())) {
        if (!para || para.startsWith('These have') || para === '---') continue;
        const sentences = para.split(/\.\s+/).map((s) => s.replace(/\.$/, ''));
        const [name, naming, industry, ...rest] = sentences;
        const restricted = /do not name (.+)$/i.exec(naming ?? '')?.[1];
        // "Do not describe the security architecture" is a rule, not a summary; instructions.md has it.
        const details = rest.filter((s) => !/^Do not /.test(s));
        if (details.length < rest.length)
          fixes.push(`${name}: "Do not …" rule dropped from the summary`);
        recs.push({
          name: name!,
          status: restricted ? 'anonymous' : status,
          fields: { Naming: naming!, Industry: industry ?? '' },
          restricted: restricted ? [restricted] : [],
          summary: details.join('. ') + (details.length ? '.' : ''),
          docs: [],
          notIndexed: true,
        });
        if (restricted)
          fixes.push(
            `${name}: listed as not yet indexed with a naming restriction, so status anonymous (no page) instead of draft`,
          );
      }
      continue;
    }
    if (heading === 'Excluded') {
      recs.push({
        name: 'British American Tobacco',
        status,
        fields: { Naming: 'Excluded', Industry: 'Consumer products', Region: 'NZ' },
        restricted: [],
        summary: content.trim().split('\n')[0]!.trim(),
        docs: [],
      });
      continue;
    }
    if (heading === 'Never disclose') continue; // lists kinds of material, no client names
    for (const block of content.split(/^\*\*/m).slice(1)) {
      const name = block.slice(0, block.indexOf('**')).trim();
      const fields: Record<string, string> = {};
      for (const line of block.split('\n').slice(1)) {
        const m = /^([A-Z][A-Za-z ]+): (.*)$/.exec(line.trim());
        if (m) fields[m[1]!] = m[2]!.trim();
      }
      if (!fields.Naming) continue; // a bold phrase in a section intro, not a record
      const list = /Do not name (.+?)\.(?:\s|$)/.exec(fields.Naming)?.[1];
      const restricted = list
        ? list.split(/,\s*|\s+or\s+/).map((n) => n.replace(/^the\s+/, '').trim())
        : [];
      recs.push({ name, status, fields, restricted, summary: fields.Summary ?? '', docs: [] });
    }
  }
  return recs;
}

// ── Splitting the documents ───────────────────────────────────────────────

function unescapeGoogleDocs(text: string): string {
  return text.replace(/\\([\\`*_{}[\]()#+\-.!:<>|~&=$'"])/g, '$1');
}

const BOLD_TITLE = /^\*\*([^*].*?)\*\*\s*$/;
const H1 = /^#\s+(.*?)\s*$/;
const NOT_A_TITLE = /^(?:\**\s*)?(?:PROJECT DEBRIEF|Blog Case Study Content|Award Category)\b/i;

/** Splits a combined export into documents: a `# Title` heading, or a lone bold line followed by `---`. */
function splitDocuments(text: string): { title: string; body: string }[] {
  const lines = text.split('\n');
  const nextNonBlank = (i: number) => {
    for (let j = i + 1; j < lines.length; j++) if (lines[j]!.trim()) return lines[j]!.trim();
    return '';
  };
  const docs: { title: string; lines: string[] }[] = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!;
    const h1 = H1.exec(line)?.[1]?.replace(/\*\*/g, '').trim();
    const bold = BOLD_TITLE.exec(line.trim())?.[1];
    const next = nextNonBlank(i);
    const isTitle =
      (h1 && !NOT_A_TITLE.test(h1)) ||
      (bold && (next === '---' || H1.test(next)) && !NOT_A_TITLE.test(bold));
    const title = (h1 || bold || '').trim();
    const current = docs.at(-1);
    // A title right after another title with nothing in between (only rules and empty headings) is a
    // subtitle of the same document.
    const currentEmpty = current && current.lines.every((l) => /^\s*(?:---|#+)?\s*$/.test(l));
    if (isTitle && !currentEmpty) docs.push({ title, lines: [] });
    else if (isTitle && current) current.title += ` | ${title}`;
    else if (current) current.lines.push(line);
    else if (line.trim()) docs.push({ title: '', lines: [line] });
  }
  return docs
    .filter((d) => !/^Quick prompt example/i.test(d.title))
    .map((d) => ({ title: unescapeGoogleDocs(d.title), body: d.lines.join('\n') }));
}

/** Removes Google Docs boilerplate from a document body. */
function cleanBody(raw: string): string {
  return (
    unescapeGoogleDocs(raw)
      .split('\n')
      .filter(
        (l) =>
          !/^\s*(?:#+\s*)?PROJECT DEBRIEF\s*$/i.test(l) &&
          !/Project debriefs form the basis of our content/i.test(l) &&
          !/^\s*#+\s*$/.test(l) &&
          !/^\s*\**\s*Case Study Link/i.test(l),
      )
      // Headings inside a document sit under its own "# name" heading in the bundle.
      .map((l) => l.replace(/^#(?=\s)/, '##').replace(/\s+$/, ''))
      .join('\n')
      .replace(/^(?:\s*---\s*\n)+/, '')
      .replace(/\n{3,}/g, '\n\n')
      .trim()
  );
}

// ── Matching ──────────────────────────────────────────────────────────────

const norm = (s: string) => s.replace(/[’‘]/g, "'").toLowerCase();

/** Name keys of a record with a score: the longest matching key wins, explicit aliases over everything. */
function keysOf(r: Rec): [string, number][] {
  const keys = new Map<string, number>();
  for (const k of [r.name, r.name.replace(/\s*\(.*\)\s*$/, ''), ...r.restricted])
    keys.set(k, k.length);
  for (const [alias, target] of Object.entries(TITLE_ALIASES))
    if (target === r.name) keys.set(alias, 1000 + alias.length);
  return [...keys].filter(([k]) => k.length >= 3);
}

function match(title: string, recs: Rec[]): Rec | undefined {
  let best: { rec: Rec; score: number } | undefined;
  for (const rec of recs)
    for (const [key, score] of keysOf(rec))
      if (nameRegExp(norm(key)).test(norm(title)) && (!best || score > best.score))
        best = { rec, score };
  return best?.rec;
}

// ── Writing ───────────────────────────────────────────────────────────────

const slugify = (s: string) => {
  const slug = s
    .toLowerCase()
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  if (slug.length <= 60) return slug;
  return slug.slice(0, 60).replace(/-[^-]*$/, '');
};

const list = (v: string | undefined) =>
  !v || /^not recorded$/i.test(v)
    ? []
    : v
        .split(/,\s*/)
        .map((s) => s.trim())
        .filter(Boolean);

/** "Marketing Hub Enterprise, Operations Hub Professional" → two items; "Marketing, Sales and Service Hub Enterprise" stays one. */
const hubsOf = (v: string | undefined) => {
  const parts = list(v);
  return parts.every((p) => /\bHubs?\b/.test(p)) ? parts : v && parts.length ? [v] : [];
};

function migrationsOf(r: Rec): string[] {
  if (MIGRATION_OVERRIDES[r.name]) return MIGRATION_OVERRIDES[r.name]!;
  const text = `${r.fields['Tech stack'] ?? ''}`;
  const m = /(?:migration from|replacing|retirement of)\s+([^,]+)/i.exec(text);
  return m ? m[1]!.split(/\s+and\s+/).map((s) => s.trim()) : [];
}

const definite = (descriptor: string) => descriptor.replace(/^(?:A|An)\s+/, 'the ');

/** Replaces each real name (and a leading "the") in `text`; returns the text and the replacement counts. */
function anonymise(text: string, rec: Rec): { text: string; counts: Map<string, number> } {
  const pairs: [string, string][] = [...(ANON_REPLACE[rec.name] ?? [])];
  const names = [...rec.restricted, ...(EXTRA_RESTRICTED[rec.name] ?? [])];
  for (const n of names) if (!pairs.some(([a]) => a === n)) pairs.push([n, definite(rec.name)]);
  pairs.sort((a, b) => b[0].length - a[0].length);
  const counts = new Map<string, number>();
  for (const [name, replacement] of pairs) {
    const re = new RegExp(`(?:\\bthe\\s+)?${nameRegExp(name).source}`, 'giu');
    text = text.replace(re, (found, offset: number, whole: string) => {
      counts.set(name, (counts.get(name) ?? 0) + 1);
      const before = whole.slice(0, offset).replace(/[\s*#_>-]+$/, '');
      const sentenceStart = before === '' || /[.!?:\n|]$/.test(before);
      return sentenceStart ? replacement[0]!.toUpperCase() + replacement.slice(1) : replacement;
    });
  }
  return { text, counts };
}

/** The paragraph after "About the Business" / "Summary of the business", for records with no index summary. */
function aboutParagraph(body: string): string {
  const m =
    /(?:About the Business|Summary of the business)[:*\s]*\n+([^\n]+(?:\n[^\n#*][^\n]*)*)/i.exec(
      body,
    );
  return (m?.[1] ?? '').replace(/\s*\n\s*/g, ' ').trim();
}

function main(oldDir: string, newDir: string): void {
  const recs = parseIndex(readFileSync(join(oldDir, 'case_study_index.md'), 'utf8'));

  // Restricted records filed under "Published": they are published anonymously.
  for (const r of recs)
    if (r.status === 'published' && /^RESTRICTED/.test(r.fields.Naming ?? '')) {
      r.status = 'anonymous';
      fixes.push(
        `${r.name}: RESTRICTED record in "Published, client can be named", so status anonymous`,
      );
    }

  // Records the index puts in "Published" without a page: the schema needs a URL for published.
  for (const r of recs)
    if (r.status === 'published' && !/^https:\/\/www\.engaging\.io\//.test(r.fields.Link ?? '')) {
      r.status = 'reference';
      fixes.push(
        `${r.name}: in "Published, client can be named" but "Link: none published", so status reference`,
      );
    }

  // Two records with a second published page: one file per page, so each URL is a Link in the index.
  for (const name of [
    'Map My Plan',
    'A Miami-based stadium and its major sports and entertainment brands',
  ]) {
    const r = recs.find((x) => x.name === name)!;
    const second = r.fields['Additional page']!;
    delete r.fields['Additional page'];
    const copy: Rec = {
      ...r,
      fields: { ...r.fields, Link: second },
      docs: [],
      restricted: [...r.restricted],
    };
    if (name === 'Map My Plan') {
      copy.name = 'Map My Plan (UX-first design)';
      r.summary =
        'An Australian fintech providing automated financial guidance had custom HubSpot development and integration delivered.';
      copy.summary =
        'A separate engagement for the same Australian fintech, providing automated financial guidance, covering UX-first product design.';
    } else {
      copy.name = 'A Miami-based stadium: its motorsport event brand';
      copy.summary =
        "Operations for the stadium's motorsport event brand, the first business unit of the multi-brand Marketing Hub Enterprise rollout described under A Miami-based stadium and its major sports and entertainment brands.";
      ANON_REPLACE[copy.name] = ANON_REPLACE[name]!;
      EXTRA_RESTRICTED[copy.name] = EXTRA_RESTRICTED[name]!;
    }
    recs.splice(recs.indexOf(r) + 1, 0, copy);
    fixes.push(`${name}: second page ${second} split into its own file "${copy.name}"`);
  }

  // Documents → records.
  const unmatched: { title: string; body: string; why: string }[] = [];
  for (const n of [1, 2, 3]) {
    const text = readFileSync(join(oldDir, `case_studies_${n}.md`), 'utf8');
    for (const doc of splitDocuments(text)) {
      const rec = match(doc.title, recs);
      const body = cleanBody(doc.body);
      if (rec) rec.docs.push({ title: doc.title, body });
      else unmatched.push({ ...doc, body, why: 'no index record matches the title' });
    }
  }
  // Montu exists twice; the index says to prefer the more recent (case_studies_3, without the internal award flag).
  const montu = recs.find((r) => r.name === 'Montu')!;
  if (montu.docs.length === 2) {
    unmatched.push({
      ...montu.docs[0]!,
      why: 'older of the two Montu versions (the index says to use the more recent)',
    });
    montu.docs.shift();
    montu.summary = montu.summary.replace(/\s*Two versions exist[\s\S]*$/, '').trim();
    fixes.push(
      'Montu: kept the case_studies_3 version, older case_studies_2 copy moved to _unmatched; internal "two versions" note dropped from the summary',
    );
  }
  const tas = recs.find((r) => r.name === 'TasRacing')!;
  tas.fields['HubSpot licensing'] = tas.summary.replace(/\.$/, '');
  tas.summary = '';
  fixes.push('TasRacing: the not-yet-indexed note was its hub list; moved to hubs');

  // Write.
  const csDir = join(newDir, 'case-studies');
  rmSync(csDir, { recursive: true, force: true });
  mkdirSync(join(csDir, '_unmatched'), { recursive: true });
  const used = new Set<string>();
  const counts = new Map<CaseStudyStatus, number>();
  const replacements: string[] = [];
  for (const r of recs) {
    const anonymous = r.status === 'anonymous';
    let summary = r.summary;
    if (!summary || r.notIndexed) {
      const about = r.docs.map((d) => aboutParagraph(d.body)).find(Boolean) ?? '';
      summary = [about, summary].filter(Boolean).join(' ');
    }
    if (r.fields.Award) summary += ` Award won: ${r.fields.Award}.`;
    const facts: string[] = [];
    if (r.fields['Tech stack'] && !/^not recorded$/i.test(r.fields['Tech stack']))
      facts.push(`**Tech stack:** ${r.fields['Tech stack']}`);
    const naming = r.fields.Naming ?? '';
    if (/^Nameable\S*\s+\S/.test(naming)) facts.push(`**Naming note:** ${naming}`);
    let body = [summary, ...facts].filter(Boolean).join('\n\n');
    for (const d of r.docs) body += `\n\n## Case study document\n\n${d.body}`;

    const display = r.name;
    if (anonymous) {
      const { text, counts: c } = anonymise(body, r);
      body = text;
      // Client websites and social links identify the client; engaging.io links are dropped elsewhere.
      const before = body.split('\n').length;
      body = body
        .split('\n')
        .filter((l) => !/(?:https?:\/\/|www\.)(?!www\.engaging\.io)/i.test(l))
        .join('\n');
      const dropped = before - body.split('\n').length;
      for (const [name, n] of c) replacements.push(`${r.name}: "${name}" × ${n}`);
      if (dropped)
        replacements.push(
          `${r.name}: ${dropped} line(s) with client website or social links removed`,
        );
    }
    // Anonymous: the real name when the index gives one (kept in the repo, never uploaded), else the descriptor.
    const client = anonymous
      ? (r.restricted[0] ?? r.name)
      : r.name.replace(/\s*\((?:custom objects|UX-first design)\)$/, '');
    const meta: CaseStudyFrontmatter = {
      client,
      display_name: display,
      status: r.status,
      url: /^https:\/\//.test(r.fields.Link ?? '') ? r.fields.Link! : null,
      industry: list(r.fields.Industry),
      region: list(r.fields.Region),
      hubs: hubsOf(r.fields['HubSpot licensing']),
      migration_from: migrationsOf(r),
      updated: UPDATED,
    };
    let slug = slugify(display);
    for (let i = 2; used.has(slug); i++) slug = `${slugify(display)}-${i}`;
    used.add(slug);
    writeFileSync(join(csDir, `${slug}.md`), `${serializeFrontmatter(meta)}\n${body.trim()}\n`);
    counts.set(r.status, (counts.get(r.status) ?? 0) + 1);
  }
  unmatched.forEach((d, i) => {
    const slug = slugify(d.title || `untitled-${i + 1}`) || `untitled-${i + 1}`;
    writeFileSync(
      join(csDir, '_unmatched', `${slug}.md`),
      `<!-- Not in the build: ${d.why}. Title in the old export: ${d.title || '(none)'} -->\n\n${d.body}\n`,
    );
  });

  writeFileSync(
    join(newDir, 'instructions.md'),
    rewriteInstructions(readFileSync(join(oldDir, 'instructions.md'), 'utf8')),
  );

  console.log(`records: ${recs.length} (${[...counts].map(([k, v]) => `${k} ${v}`).join(', ')})`);
  console.log(
    `records with no document: ${recs
      .filter((r) => !r.docs.length)
      .map((r) => r.name)
      .join('; ')}`,
  );
  console.log(`unmatched documents (case-studies/_unmatched/):`);
  for (const d of unmatched) console.log(`  - ${d.title || '(untitled)'}: ${d.why}`);
  console.log('anonymous-name replacements:');
  for (const r of replacements) console.log(`  - ${r}`);
  console.log('hand fixes:');
  for (const f of fixes) console.log(`  - ${f}`);
}

// ── instructions.md ───────────────────────────────────────────────────────

const LINKS = `## Links

The only case study URLs that exist are the Link lines in \`<case_study_index>\`. You may only output a URL by copying it character for character from a Link line. You cannot repair, shorten, complete or construct one. Slugs on engaging.io do not follow a predictable pattern and change when pages are rewritten, so a URL that looks plausible is wrong unless it is a Link line. A slug built from a client name is always wrong.

Never take a URL from a case study document, from a fetched page or from memory. Documents contain old and internal links that do not work.

If the index says "Link: none published", or the engagement is a draft, the engagement has no page. Write "Not published yet" as plain text with no link. This is a correct answer, not a failure. Do not write "not available", which implies the page exists and you could not find it.

Never output a link pointing to docs.google.com, drive.google.com or app.hubspot.com, or any URL containing hs_preview.

Before you send a response, check every link you have written. If its URL is not a Link line in the index, remove the link and write "Not published yet" instead. The chat page also turns any other link into plain text.`;

const RESPONSE_FORMAT = `## Response format

Write markdown. Use headings, bold, bullet lists and links only; no HTML, tables, images or code blocks.

Start the response with the first case study block. Do not write an introductory sentence, summary, count or heading before it. The only exception is when you have no direct match or could not read a domain the user gave: then write one plain sentence saying so, followed by the closest alternatives.

Omit any line you have no recorded value for. A missing line is correct and expected. Never keep a line and fill it with a placeholder, a fallback phrase or a plausible guess. Only Client, Industry and Overview are always present.

Each case study block looks like this, with a horizontal rule between blocks:

    ### Client name or generic descriptor

    - **Industry:** Industry sector
    - **Region:** Region as recorded
    - **HubSpot licences:** Hubs and tier as recorded
    - **Migrated from:** Prior platform
    - **Integrations:** Named integrations
    - **Case study:** [Read the case study](EXACT_URL_FROM_A_LINK_LINE)
    - **Overview:** One to two sentences on the problem and the solution
    - **Why this matters:** One line on how this supports Engaging's credibility in a similar challenge, industry, platform or migration context

    ---

Line by line rules:

- Migrated from: include only where the engagement replaced a named prior platform. If it was a fresh implementation, omit the line entirely. Do not write "Not a migration" or "N/A".
- Integrations: include only where integrations are recorded. If there were none, omit the line. Do not write "No integration was required".
- Case study: include the link only where the index gives a URL. Where the index says none published, write \`- **Case study:** Not published yet\` with no link. Where the record is a draft, write "Draft, not yet published".
- HubSpot licences: if not recorded, omit the line rather than guessing a tier. If the rep asks directly, say the licence detail is not recorded and suggest they confirm with Engaging.`;

const MIAMI = /^The Miami stadium record needs particular care\..*$/m;
const MIAMI_NEW =
  'The Miami-based stadium records need particular care. Refer only to a Miami-based stadium and its major sports and entertainment brands, and never name the stadium, its teams, its events or its tournaments, even where a document hints at them.';

function rewriteInstructions(text: string): string {
  const sections = text.split(/^(?=## )/m);
  const out: string[] = [];
  for (const s of sections) {
    const heading = s.slice(0, s.indexOf('\n')).trim();
    if (/^## (?:Case study URL list|With a published page|No published page)/.test(heading))
      continue;
    if (heading === '## Links') out.push(LINKS + '\n\n');
    else if (heading === '## Response format') out.push(RESPONSE_FORMAT + '\n\n');
    else out.push(s);
  }
  return (
    out
      .join('')
      .replace('# Sales assistant instructions (v6, Claude)', '# Sales assistant instructions (v7)')
      .replace(MIAMI, MIAMI_NEW)
      .replace(/You have a web_fetch tool/, 'You have a fetchPage tool')
      .replace(
        /use links exactly as written in the URL list/,
        'use links exactly as written in the index',
      )
      .replace(
        /Every case study URL that exists is listed at the end of these instructions[^\n]*\n/,
        '',
      )
      // the trailing rule before the removed URL list
      .replace(/\n---\s*$/, '')
      .trimEnd() + '\n'
  );
}

if (import.meta.main) {
  const [oldDir, newDir] = process.argv.slice(2);
  if (!oldDir || !newDir) {
    console.error('usage: split.ts <old knowledge dir> <new knowledge dir>');
    process.exit(1);
  }
  main(oldDir, newDir);
}
