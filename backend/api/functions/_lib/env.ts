// Everything the Functions can read from `env`: [vars] and bindings in backend/api/wrangler.toml,
// plus secrets (./cli.sh set-secret, or .dev.vars locally). Keep in step with wrangler.toml.

/** The agent Worker (cloudie-agent) through its service binding: HTTP `fetch` plus RPC methods. */
export interface AgentService extends Fetcher {
  /** CONNECT_LIMIT on the agent Worker: false after 10 connects in a minute from `ip`. */
  allowConnect(ip: string): Promise<boolean>;
}

export interface Env {
  APP_VERSION: string;
  AGENT: AgentService;
  /** Comma-separated origins allowed to open the chat, e.g. "https://cloudie.pages.dev". */
  ALLOWED_ORIGINS: string;
  /** Secret: Turnstile secret key, for siteverify. */
  TURNSTILE_SECRET: string;
  /** Secret: HMAC key that signs chat_pass cookies. */
  PASS_SECRET: string;
}
