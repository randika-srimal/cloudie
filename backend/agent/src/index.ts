import { AIChatAgent } from '@cloudflare/ai-chat';
import { routeAgentRequest } from 'agents';
import type { Env } from './env.ts';

// Stub until Task 7 adds the real chat loop. It exists so the Durable Object binding and routing work.
export class SalesAgent extends AIChatAgent<Env> {
  override async onChatMessage(): Promise<Response> {
    return new Response('not implemented', { status: 501 });
  }
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    return (await routeAgentRequest(request, env)) ?? new Response('Not found', { status: 404 });
  },
} satisfies ExportedHandler<Env>;
