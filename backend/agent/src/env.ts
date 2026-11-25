// Bindings and secrets of the agent Worker. Mirrors backend/agent/wrangler.toml.
export interface Env {
  /** Runtime assistant config (key `config`) and nothing else. */
  CONFIG: KVNamespace;
  /** Published knowledge base (manifest and case-study files). */
  KB: R2Bucket;
  SalesAgent: DurableObjectNamespace;
  RATE_LIMIT: RateLimit;
  /** 10 chat connections per minute per client IP; checked by the Pages proxy over RPC (allowConnect). */
  CONNECT_LIMIT: RateLimit;
  /** 5 chat-password attempts per minute per client IP; checked by the Pages project over RPC (allowUnlock). */
  UNLOCK_LIMIT: RateLimit;
  /** Base URL of the AI Gateway: https://gateway.ai.cloudflare.com/v1/<account>/<gateway>. */
  AI_GATEWAY_URL: string;
  CF_AIG_TOKEN?: string;
  /** Fallback provider keys, used only when the gateway does not hold them. */
  ANTHROPIC_API_KEY?: string;
  OPENAI_API_KEY?: string;
  GOOGLE_API_KEY?: string;
  /** Test and e2e only: swaps the real model for a scripted one. */
  MOCK_MODEL?: string;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Cloudflare {
    // eslint-disable-next-line @typescript-eslint/no-empty-object-type
    interface Env extends AgentEnv {}
  }
}
type AgentEnv = Env;
