// The shapes the API sends and the web app (and tests) read, defined once with Zod.
// Add a schema here for every new route.
// zod/mini: the same schemas, tree-shakable, so the web bundle only carries what it uses.
import { z } from 'zod/mini';

/** GET /api/hello */
export const Hello = z.object({
  message: z.string(),
  /** Where the request was served from: a Cloudflare data center code (e.g. "SIN"), or "local". */
  colo: z.string(),
  /** ISO 8601 time the server answered. */
  at: z.iso.datetime(),
});
export type Hello = z.infer<typeof Hello>;

/** GET /api/health */
export const Health = z.object({
  ok: z.literal(true),
  version: z.string(),
  /** From the agent Worker's /status; left out when the agent is unreachable. */
  kbVersion: z.optional(z.string()),
  model: z.optional(z.string()),
});
export type Health = z.infer<typeof Health>;

/** Every error response: `{ "error": "..." }` with a 4xx or 5xx status. */
export const ApiError = z.object({ error: z.string() });
export type ApiError = z.infer<typeof ApiError>;

/** Which model vendor the sales assistant talks to. */
export const Provider = z.enum(['anthropic', 'openai', 'google']);
export type Provider = z.infer<typeof Provider>;

/** Runtime settings of the sales assistant agent. `kbVersion` is '' until a knowledge base is published. */
export const AssistantConfig = z.object({
  provider: Provider,
  model: z.string().check(z.minLength(1)),
  temperature: z.optional(z.number().check(z.gte(0), z.lte(2))),
  maxOutputTokens: z.int().check(z.gte(1), z.lte(64000)),
  effort: z.optional(z.enum(['low', 'medium', 'high'])),
  /** Whether the agent may fetch pages from the allowlist. */
  webFetch: z.boolean(),
  /** Most recent messages sent to the model. */
  maxHistory: z.int().check(z.gte(2), z.lte(100)),
  kbVersion: z.string(),
});
export type AssistantConfig = z.infer<typeof AssistantConfig>;

/** The config used until one is saved. */
export const DEFAULT_CONFIG: AssistantConfig = {
  provider: 'anthropic',
  model: 'claude-sonnet-5-5',
  maxOutputTokens: 16000,
  effort: 'low',
  webFetch: true,
  maxHistory: 30,
  kbVersion: '',
};

/** How much a case study may be disclosed. */
export const CaseStudyStatus = z.enum([
  'published',
  'anonymous',
  'reference',
  'draft',
  'excluded',
  'never_disclose',
]);
export type CaseStudyStatus = z.infer<typeof CaseStudyStatus>;

/** YAML frontmatter of a case study file in the knowledge base. */
export const CaseStudyFrontmatter = z
  .object({
    client: z.string(),
    display_name: z.string(),
    status: CaseStudyStatus,
    /** Required (and must be on www.engaging.io) when status is 'published'. */
    url: z.nullable(z.string()),
    industry: z.array(z.string()),
    region: z.array(z.string()),
    hubs: z.array(z.string()),
    migration_from: z._default(z.array(z.string()), []),
    /** Last review date, YYYY-MM-DD. */
    updated: z.iso.date(),
  })
  .check(
    z.refine(
      (v) =>
        v.status !== 'published' ||
        (v.url !== null && v.url.startsWith('https://www.engaging.io/')),
      { message: "a 'published' case study needs a https://www.engaging.io/ url", path: ['url'] },
    ),
  );
export type CaseStudyFrontmatter = z.infer<typeof CaseStudyFrontmatter>;

/** Describes one published knowledge-base build. */
export const KbManifest = z.object({
  version: z.string(),
  builtAt: z.iso.datetime(),
  tokens: z.int(),
  files: z.int(),
  allowlist: z.array(z.string()),
});
export type KbManifest = z.infer<typeof KbManifest>;

/** GET /status on the agent Worker (through the service binding only): the config in use, no secrets. */
export const AgentStatus = z.object({
  kbVersion: z.string(),
  model: z.string(),
});
export type AgentStatus = z.infer<typeof AgentStatus>;

/** What the agent Worker reports about its loaded state. */
export const AgentState = z.object({
  kbVersion: z.string(),
  allowlist: z.array(z.string()),
});
export type AgentState = z.infer<typeof AgentState>;
