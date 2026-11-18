import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { buildKb } from '../build.ts';
import { checkKb } from '../check.ts';
import { parseCaseStudy } from '../lib.ts';

const FIXTURES = join(import.meta.dirname, 'fixtures', 'kb');

let dir: string;
let out: string;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'kb-'));
  out = mkdtempSync(join(tmpdir(), 'kb-out-'));
  cpSync(FIXTURES, dir, { recursive: true });
});

afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
  rmSync(out, { recursive: true, force: true });
});

const file = (name: string) => join(dir, 'case-studies', name);
const edit = (name: string, change: (text: string) => string) =>
  writeFileSync(file(name), change(readFileSync(file(name), 'utf8')));
const removePlant = () =>
  edit('global-logistics.md', (t) =>
    t.replace('The project started after a joint pilot with Initech.', ''),
  );

describe('parseCaseStudy', () => {
  it('reads the frontmatter (flow and block lists, quoted and plain scalars) and the body', () => {
    const { meta, body } = parseCaseStudy(
      'global-logistics.md',
      readFileSync(file('global-logistics.md'), 'utf8'),
    );
    expect(meta).toEqual({
      client: 'Globex Corporation',
      display_name: 'A global logistics provider',
      status: 'anonymous',
      url: 'https://www.engaging.io/case-studies/global-logistics',
      industry: ['Transportation and storage'],
      region: ['NAM'],
      hubs: [],
      migration_from: [],
      updated: '2026-11-18',
    });
    expect(body.startsWith('A global logistics provider unified')).toBe(true);
  });

  it('ignores # comments outside quotes', () => {
    const text = [
      '---',
      'client: "Acme #1" # the real name',
      "display_name: 'Acme' # shown",
      'status: published # with a page',
      'url: "https://www.engaging.io/case-studies/acme" # copied from the site',
      'industry: [Retail, "C#"] # sectors',
      'region:',
      '  - AUS # main market',
      'hubs: []',
      'updated: 2026-11-18',
      '---',
      'Body',
    ].join('\n');
    const { meta } = parseCaseStudy('acme.md', text);
    expect(meta.client).toBe('Acme #1');
    expect(meta.display_name).toBe('Acme');
    expect(meta.status).toBe('published');
    expect(meta.industry).toEqual(['Retail', 'C#']);
    expect(meta.region).toEqual(['AUS']);
  });

  it('throws with the file name when the frontmatter is invalid', () => {
    expect(() => parseCaseStudy('bad.md', '---\nclient: X\nstatus: famous\n---\nBody')).toThrow(
      /bad\.md/,
    );
    expect(() => parseCaseStudy('none.md', 'No frontmatter here')).toThrow(/none\.md/);
  });
});

describe('checkKb', () => {
  it('reports a never_disclose client name planted in an uploaded file', () => {
    const { errors } = checkKb(dir);
    expect(errors).toHaveLength(1);
    expect(errors[0]).toMatch(/global-logistics.*Initech/);
  });

  it('has no errors once the plant is removed, and estimates tokens as chars / 3.5', () => {
    removePlant();
    const { errors, warnings, tokens } = checkKb(dir);
    expect(errors).toEqual([]);
    expect(warnings).toEqual([]);
    const manifest = buildKb(dir, out);
    const chars =
      readFileSync(join(out, manifest.version, 'prompt.md'), 'utf8').length +
      readFileSync(join(out, manifest.version, 'instructions.md'), 'utf8').length;
    expect(tokens).toBe(Math.ceil(chars / 3.5));
  });

  it('reports a published entry with a null URL', () => {
    removePlant();
    edit('acme-retail.md', (t) =>
      t.replace('url: "https://www.engaging.io/case-studies/acme-retail"', 'url: null'),
    );
    const { errors } = checkKb(dir);
    expect(errors).toHaveLength(1);
    expect(errors[0]).toMatch(/acme-retail.*url/);
  });

  it('reports a published entry whose URL is not on www.engaging.io', () => {
    removePlant();
    edit('acme-retail.md', (t) => t.replace('https://www.engaging.io/', 'https://example.com/'));
    expect(checkKb(dir).errors[0]).toMatch(/acme-retail.*engaging\.io/);
  });

  it('reports a name from never-disclose.txt, case-insensitively, including in instructions.md', () => {
    removePlant();
    edit('hooli.md', (t) => t.replace('Custom pipelines', 'UMBRELLA CORPORATION pipelines'));
    writeFileSync(join(dir, 'instructions.md'), 'Never mention umbrella corporation.\n');
    const { errors } = checkKb(dir);
    expect(errors).toHaveLength(2);
    expect(errors.join('\n')).toMatch(/hooli.*Umbrella Corporation/);
    expect(errors.join('\n')).toMatch(/instructions\.md.*Umbrella Corporation/);
  });

  it("reports an anonymous client's real name in its own body or in another uploaded file", () => {
    removePlant();
    edit('global-logistics.md', (t) => t + '\nGlobex Corporation signed off the design.\n');
    edit('acme-retail.md', (t) => t + '\nAcme later partnered with globex corporation.\n');
    const { errors } = checkKb(dir);
    expect(errors).toHaveLength(2);
    expect(errors.join('\n')).toMatch(/global-logistics.*Globex Corporation/);
    expect(errors.join('\n')).toMatch(/acme-retail.*Globex Corporation/);
  });

  it('matches names as whole words only', () => {
    removePlant();
    writeFileSync(join(dir, 'never-disclose.txt'), 'Ace\n');
    edit('hooli.md', (t) => t + '\nA space race and a workplace.\n');
    expect(checkKb(dir).errors).toEqual([]);
  });

  it('reports two files sharing a slug', () => {
    removePlant();
    cpSync(file('hooli.md'), file('Hooli.md'));
    expect(checkKb(dir).errors.join('\n')).toMatch(/slug "hooli"/);
  });

  it('reports leftover Google Docs escapes', () => {
    removePlant();
    edit('hooli.md', (t) => t + '\nSee \\*\\*bold\\*\\* at https\\://www\\.example.com\n');
    const { errors } = checkKb(dir);
    expect(errors).toHaveLength(1);
    expect(errors[0]).toMatch(/hooli.*escape/);
  });

  it('warns above 120k tokens and errors above 180k', () => {
    removePlant();
    edit('hooli.md', (t) => t + '\n' + 'x'.repeat(130_000 * 3.5) + '\n');
    let result = checkKb(dir);
    expect(result.errors).toEqual([]);
    expect(result.warnings[0]).toMatch(/120/);
    edit('hooli.md', (t) => t + '\n' + 'x'.repeat(60_000 * 3.5) + '\n');
    result = checkKb(dir);
    expect(result.tokens).toBeGreaterThan(180_000);
    expect(result.errors[0]).toMatch(/180/);
  });

  it('ignores files under case-studies/_unmatched', () => {
    removePlant();
    cpSync(file('initech.md'), join(dir, 'case-studies', '_unmatched-note.md'));
    expect(checkKb(dir).errors).toEqual([]);
  });
});

describe('buildKb', () => {
  beforeEach(removePlant);

  const read = (version: string, name: string) => readFileSync(join(out, version, name), 'utf8');

  it('leaves never_disclose files out, strips draft results, and only allowlists URLs in the bundle', () => {
    const manifest = buildKb(dir, out);
    const prompt = read(manifest.version, 'prompt.md');

    expect(prompt).not.toMatch(/initech/i);
    expect(prompt).toMatch(
      /^<case_study_index>\n[\s\S]*\n<\/case_study_index>\n\n<case_study_documents>\n/,
    );
    expect(prompt.trimEnd().endsWith('</case_study_documents>')).toBe(true);
    for (const slug of ['acme-retail', 'global-logistics', 'hooli'])
      expect(prompt).toContain(`<document name="${slug}">`);

    const hooli = prompt.slice(prompt.indexOf('<document name="hooli">'));
    expect(hooli).toContain('Custom pipelines');
    expect(hooli).toContain('A service rollout is planned.');
    expect(hooli).not.toContain('37%');
    expect(hooli).not.toContain('Two staff days');
    expect(hooli).not.toContain('Best partner');

    // A published (non-draft) file keeps its Results section.
    expect(prompt).toContain('Email creation time fell by half.');

    expect(manifest.allowlist).toEqual([
      'https://www.engaging.io/case-studies/acme-retail',
      'https://www.engaging.io/case-studies/global-logistics',
    ]);
    expect(manifest.files).toBe(3);
    expect(read(manifest.version, 'instructions.md')).toBe(
      readFileSync(join(dir, 'instructions.md'), 'utf8'),
    );
    expect(JSON.parse(read(manifest.version, 'manifest.json'))).toEqual(manifest);
  });

  it('builds the index from the frontmatter and never emits an anonymous client name', () => {
    const manifest = buildKb(dir, out);
    const prompt = read(manifest.version, 'prompt.md');
    const index = prompt.slice(0, prompt.indexOf('</case_study_index>'));

    expect(index).toContain('## Published, client can be named');
    expect(index).toContain('## Published anonymously, do not name the client');
    expect(index).toContain('## Draft, not yet client approved');
    expect(index).toContain(
      [
        '**Acme Retail**',
        'Naming: Nameable',
        'Industry: Retail, Ecommerce',
        'Region: AUS',
        'HubSpot licensing: Marketing Hub Professional',
        'Migrated from: Salesforce',
        'Link: https://www.engaging.io/case-studies/acme-retail',
        'Summary: Acme Retail moved from Salesforce to HubSpot in twelve weeks.',
      ].join('\n'),
    );
    expect(index).toMatch(/\*\*Hooli\*\*[\s\S]*Link: none published/);
    expect(prompt).toContain('**A global logistics provider**');
    expect(prompt).not.toMatch(/globex/i);
  });

  it('gives the same version for the same inputs and a new one when they change', () => {
    const first = buildKb(dir, out);
    expect(first.version).toMatch(/^[0-9a-f]{12}$/);
    expect(buildKb(dir, out).version).toBe(first.version);
    edit('hooli.md', (t) => t + '\nOne more line.\n');
    expect(buildKb(dir, out).version).not.toBe(first.version);
  });

  it('strips bold-line and "Impact and results" / metric sections from drafts too', () => {
    edit(
      'hooli.md',
      (t) =>
        t +
        '\n**Stats / Callouts:**\n\n* 52% faster\n\n**The Team**\n\nFour people.\n\n' +
        '## Impact and results\n\n**Revenue**\n\nUp 12%.\n\n### Metric Block:\n\n9x\n\n## Credits\n\nThanks.\n',
    );
    const prompt = read(buildKb(dir, out).version, 'prompt.md');
    const hooli = prompt.slice(prompt.indexOf('<document name="hooli">'));
    for (const gone of ['52%', 'Up 12%', '9x']) expect(hooli).not.toContain(gone);
    for (const kept of ['Four people.', 'Thanks.']) expect(hooli).toContain(kept);
  });

  it('refuses to build when the check has errors', () => {
    edit('hooli.md', (t) => t + '\nInitech again.\n');
    expect(() => buildKb(dir, out)).toThrow(/Initech/);
  });
});
