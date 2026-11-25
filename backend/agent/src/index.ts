import { AgentStatus } from '@engaging-assistant/protocol';
import { routeAgentRequest } from 'agents';
import { WorkerEntrypoint } from 'cloudflare:workers';
import { loadConfig } from './config.ts';
import type { Env } from './env.ts';

export { SalesAgent } from './agent.ts';

/**
 * The agent Worker, reached only through the Pages project's AGENT service binding (workers.dev is off).
 * `fetch` routes /agents/* to the SalesAgent Durable Objects and answers GET /status; `allowConnect` and
 * `allowUnlock` are called over RPC by the Pages project, because Pages Functions cannot have a rate-limit binding of their own.
 */
export default class AgentEntrypoint extends WorkerEntrypoint<Env> {
  override async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    if (request.method === 'GET' && url.pathname === '/status') {
      const config = await loadConfig(this.env);
      const body: AgentStatus = { kbVersion: config.kbVersion, model: config.model };
      return Response.json(body, { headers: { 'Cache-Control': 'no-store' } });
    }
    return (
      (await routeAgentRequest(request, this.env)) ?? new Response('Not found', { status: 404 })
    );
  }

  /** CONNECT_LIMIT: true while `ip` has opened fewer than 10 chat connections in the last minute. */
  async allowConnect(ip: string): Promise<boolean> {
    const { success } = await this.env.CONNECT_LIMIT.limit({ key: ip });
    return success;
  }

  /** UNLOCK_LIMIT: true while `ip` has made fewer than 5 chat-password attempts in the last minute. */
  async allowUnlock(ip: string): Promise<boolean> {
    const { success } = await this.env.UNLOCK_LIMIT.limit({ key: ip });
    return success;
  }
}
export type { AgentEntrypoint };
