import { routeAgentRequest } from 'agents';
import type { Env } from './env.ts';

export { SalesAgent } from './agent.ts';

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    return (await routeAgentRequest(request, env)) ?? new Response('Not found', { status: 404 });
  },
} satisfies ExportedHandler<Env>;
