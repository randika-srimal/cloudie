// GET /api/health: answers when the Functions are up. `./cli.sh health` calls it.
// Also reports the agent Worker's KB version and model (its GET /status through the AGENT binding). An
// unreachable agent only drops those two fields: health is about the Functions, and the chat page shows
// its own error when the agent is down.
// When you add a database, check it here too (e.g. SELECT 1), so a broken binding shows up.
import { AgentStatus, type Health } from '@cloudie/protocol';
import type { Env } from '../_lib/env.ts';

async function agentStatus(env: Env): Promise<AgentStatus | undefined> {
  try {
    const res = await env.AGENT.fetch('https://agent/status');
    if (!res.ok) return undefined;
    const parsed = AgentStatus.safeParse(await res.json());
    return parsed.success ? parsed.data : undefined;
  } catch (e) {
    console.warn('agent status unavailable', String(e));
    return undefined;
  }
}

export const onRequestGet: PagesFunction<Env> = async ({ env }) => {
  const body: Health = { ok: true, version: env.APP_VERSION, ...(await agentStatus(env)) };
  return Response.json(body, { headers: { 'Cache-Control': 'no-store' } });
};
