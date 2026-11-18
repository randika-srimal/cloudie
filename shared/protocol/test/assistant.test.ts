import { describe, expect, it } from 'vitest';
import { AssistantConfig, CaseStudyFrontmatter, DEFAULT_CONFIG, KbManifest } from '../src/index.ts';

describe('AssistantConfig', () => {
  it('has the documented defaults', () => {
    expect(AssistantConfig.parse(DEFAULT_CONFIG)).toEqual({
      provider: 'anthropic',
      model: 'claude-sonnet-5-5',
      maxOutputTokens: 16000,
      effort: 'low',
      webFetch: true,
      maxHistory: 30,
      kbVersion: '',
    });
  });

  it('rejects an unknown provider', () => {
    expect(AssistantConfig.safeParse({ ...DEFAULT_CONFIG, provider: 'mistral' }).success).toBe(
      false,
    );
  });
});

describe('CaseStudyFrontmatter', () => {
  const base = {
    client: 'Acme Ltd',
    display_name: 'Acme',
    industry: ['retail'],
    region: ['EMEA'],
    hubs: ['marketing'],
    updated: '2026-01-31',
  };

  it('rejects a published case study without a url', () => {
    expect(
      CaseStudyFrontmatter.safeParse({ ...base, status: 'published', url: null }).success,
    ).toBe(false);
  });

  it('rejects a published case study with a non-engaging url', () => {
    expect(
      CaseStudyFrontmatter.safeParse({ ...base, status: 'published', url: 'https://example.com/x' })
        .success,
    ).toBe(false);
  });

  it('accepts a published case study with an engaging.io url', () => {
    expect(
      CaseStudyFrontmatter.safeParse({
        ...base,
        status: 'published',
        url: 'https://www.engaging.io/case-studies/acme',
      }).success,
    ).toBe(true);
  });

  it('accepts an anonymous case study without a url and defaults migration_from', () => {
    const out = CaseStudyFrontmatter.parse({ ...base, status: 'anonymous', url: null });
    expect(out.migration_from).toEqual([]);
  });
});

describe('KbManifest', () => {
  it('round-trips', () => {
    const m = {
      version: 'v1',
      builtAt: '2026-01-01T00:00:00.000Z',
      tokens: 1000,
      files: 3,
      allowlist: ['https://www.engaging.io/'],
    };
    expect(KbManifest.parse(m)).toEqual(m);
  });
});
