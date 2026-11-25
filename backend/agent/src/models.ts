import { createAnthropic } from '@ai-sdk/anthropic';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { createOpenAI } from '@ai-sdk/openai';
import type { AssistantConfig } from '@engaging-assistant/protocol';
import type { LanguageModel } from 'ai';
import { MockLanguageModelV4 } from 'ai/test';
import type { Env } from './env.ts';

/** Per-provider options passed to streamText, keyed by provider name. */
export type ProviderOptions = Record<string, Record<string, string>>;

export interface ResolvedModel {
  model: LanguageModel;
  providerOptions: ProviderOptions;
  /** Whether to mark the system prompt for provider-side prompt caching (Anthropic only). */
  cacheSystem: boolean;
}

/** Neither a gateway token nor the provider's own key is configured. */
export class MissingKeyError extends Error {
  constructor(provider: string) {
    super(`No CF_AIG_TOKEN or ${provider} API key configured`);
    this.name = 'MissingKeyError';
  }
}

let lastMock: MockLanguageModelV4 | undefined;

/** The most recent mock model built by resolveModel, so tests can inspect `doStreamCalls`. */
export function getLastMockModel(): MockLanguageModelV4 | undefined {
  return lastMock;
}

function lastUserText(prompt: readonly { role: string; content: unknown }[]): string {
  for (let i = prompt.length - 1; i >= 0; i--) {
    const m = prompt[i];
    if (m?.role !== 'user' || !Array.isArray(m.content)) continue;
    return (m.content as { type: string; text?: string }[])
      .filter((p) => p.type === 'text')
      .map((p) => p.text ?? '')
      .join('');
  }
  return '';
}

function buildMock(kind: string): MockLanguageModelV4 {
  const usage = {
    inputTokens: { total: 1, noCache: 1, cacheRead: 0, cacheWrite: 0 },
    outputTokens: { total: 1, text: 1, reasoning: 0 },
  };
  const finishReason = { unified: 'stop', raw: 'stop' } as const;
  const mock = new MockLanguageModelV4({
    provider: 'mock',
    modelId: kind,
    doStream: (options) => {
      if (kind === 'fail') return Promise.reject(new Error('mock model failure'));
      const text = `echo: ${lastUserText(options.prompt)}`;
      return Promise.resolve({
        stream: new ReadableStream({
          start(controller) {
            controller.enqueue({ type: 'stream-start', warnings: [] });
            controller.enqueue({ type: 'text-start', id: '1' });
            controller.enqueue({ type: 'text-delta', id: '1', delta: text });
            controller.enqueue({ type: 'text-end', id: '1' });
            controller.enqueue({ type: 'finish', usage, finishReason });
            controller.close();
          },
        }),
      });
    },
    doGenerate: (options) => {
      if (kind === 'fail') return Promise.reject(new Error('mock model failure'));
      return Promise.resolve({
        content: [{ type: 'text', text: `echo: ${lastUserText(options.prompt)}` }],
        finishReason,
        usage,
        warnings: [],
      });
    },
  });
  return mock;
}

/** A fetch that drops one request header, then calls the global fetch. */
function withoutHeader(name: string): typeof fetch {
  return (input, init) => {
    const headers = new Headers(init?.headers);
    headers.delete(name);
    return fetch(input, { ...init, headers });
  };
}

/**
 * Turns the runtime config into an AI SDK model routed through the AI Gateway. With a gateway token
 * the gateway may hold the provider key (BYOK); otherwise the provider's own secret is required.
 * An empty AI_GATEWAY_URL (local dev, set in .dev.vars) skips the gateway: the SDK calls the
 * provider directly with its own key. Production never has it empty: .dev.vars is never deployed,
 * and scripts/check-synced.sh refuses to deploy unless wrangler.toml holds a full gateway URL.
 */
export function resolveModel(config: AssistantConfig, env: Env): ResolvedModel {
  if (env.MOCK_MODEL) {
    lastMock = buildMock(env.MOCK_MODEL);
    return { model: lastMock, providerOptions: {}, cacheSystem: false };
  }

  const viaGateway = env.AI_GATEWAY_URL !== '';
  const headers =
    viaGateway && env.CF_AIG_TOKEN
      ? { 'cf-aig-authorization': `Bearer ${env.CF_AIG_TOKEN}` }
      : undefined;
  // Gateway paths: anthropic needs /v1 and google /v1beta (the SDK defaults carry them); openai has none.
  // Without the gateway, undefined keeps each SDK's own default base URL.
  const gateway = (slug: string, version = '') =>
    viaGateway ? `${env.AI_GATEWAY_URL}/${slug}${version}` : undefined;
  // With no key of our own, the gateway's stored (BYOK) key is used. AI Gateway adds it only when the request
  // has no provider auth header: any value there, a placeholder included, is forwarded to the provider, which
  // rejects it ("invalid x-api-key"). The SDKs insist on an apiKey, so give them a placeholder and strip the
  // header they build from it before the request leaves.
  const keyFor = (
    own: string | undefined,
    name: string,
    authHeader: string,
  ): { apiKey: string; fetch?: typeof fetch } => {
    if (own) return { apiKey: own };
    if (!viaGateway || !env.CF_AIG_TOKEN) throw new MissingKeyError(name);
    return { apiKey: 'gateway-byok', fetch: withoutHeader(authHeader) };
  };

  switch (config.provider) {
    case 'anthropic': {
      const key = keyFor(env.ANTHROPIC_API_KEY, 'Anthropic', 'x-api-key');
      const p = createAnthropic({ baseURL: gateway('anthropic', '/v1'), headers, ...key });
      return {
        model: p(config.model),
        providerOptions: config.effort ? { anthropic: { effort: config.effort } } : {},
        cacheSystem: true,
      };
    }
    case 'openai': {
      const key = keyFor(env.OPENAI_API_KEY, 'OpenAI', 'authorization');
      const p = createOpenAI({ baseURL: gateway('openai'), headers, ...key });
      return {
        model: p(config.model),
        providerOptions: config.effort ? { openai: { reasoningEffort: config.effort } } : {},
        cacheSystem: false,
      };
    }
    case 'google': {
      const key = keyFor(env.GOOGLE_API_KEY, 'Google', 'x-goog-api-key');
      const p = createGoogleGenerativeAI({
        baseURL: gateway('google-ai-studio', '/v1beta'),
        headers,
        ...key,
      });
      return { model: p(config.model), providerOptions: {}, cacheSystem: false };
    }
  }
}
