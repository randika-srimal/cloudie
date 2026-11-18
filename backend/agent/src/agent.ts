import { AIChatAgent, type OnChatMessageOptions } from '@cloudflare/ai-chat';
import type { AgentState } from '@cloudie/protocol';
import { type Connection, type ConnectionContext, getCurrentAgent } from 'agents';
import {
  convertToModelMessages,
  createUIMessageStream,
  createUIMessageStreamResponse,
  type GenerateTextOnFinishCallback,
  stepCountIs,
  streamText,
  type ToolSet,
  type UIMessage,
  type UIMessageStreamWriter,
} from 'ai';
import { loadConfig } from './config.ts';
import type { Env } from './env.ts';
import { type Kb, loadKb } from './kb.ts';
import { resolveModel } from './models.ts';
import {
  buildSystem,
  FALLBACK_TEXT,
  MAX_MESSAGE_CHARS,
  RATE_LIMITED_TEXT,
  TOO_LONG_TEXT,
} from './prompt.ts';
import { fetchPageTool } from './tools/fetchPage.ts';

/** Chats are deleted this long after their last message. */
const RETENTION_SECONDS = 30 * 24 * 3600;
const MAX_STEPS = 4;

type ConnState = { ip?: string };

function textOf(m: UIMessage): string {
  return m.parts.map((p) => (p.type === 'text' ? p.text : '')).join('');
}

function lastUserText(messages: readonly UIMessage[]): string {
  const m = messages.findLast((x) => x.role === 'user');
  return m ? textOf(m) : '';
}

/** A rejected over-long message stays in the stored chat; it must never reach the model on a later turn. */
function tooLong(m: UIMessage): boolean {
  return m.role === 'user' && textOf(m).length > MAX_MESSAGE_CHARS;
}

function writeText(writer: UIMessageStreamWriter, text: string): void {
  const id = crypto.randomUUID();
  writer.write({ type: 'text-start', id });
  writer.write({ type: 'text-delta', id, delta: text });
  writer.write({ type: 'text-end', id });
}

/** A complete assistant reply holding only `text`, streamed like a model answer. */
function textReply(text: string): Response {
  const stream = createUIMessageStream({
    execute: ({ writer }) => {
      writer.write({ type: 'start' });
      writeText(writer, text);
      writer.write({ type: 'finish' });
    },
  });
  return createUIMessageStreamResponse({ stream });
}

/**
 * One chat thread per Durable Object. Answers HubSpot sales reps' case-study questions from the published
 * knowledge base. Each connection's client IP is kept in its connection state for rate limiting.
 */
export class SalesAgent extends AIChatAgent<Env, AgentState> {
  override initialState: AgentState = { kbVersion: '', allowlist: [] };

  /** The knowledge base, or null when none is published or R2 is unreachable. */
  private async kb(version: string): Promise<Kb | null> {
    try {
      return await loadKb(this.env, version);
    } catch (e) {
      console.error('kb load failed', String(e));
      return null;
    }
  }

  override async onConnect(conn: Connection, ctx: ConnectionContext): Promise<void> {
    const ip = ctx.request.headers.get('cf-connecting-ip') ?? 'unknown';
    conn.setState((prev: unknown) => ({ ...(prev as ConnState | null), ip }));
    const kb = await this.kb((await loadConfig(this.env)).kbVersion);
    this.setState({ kbVersion: kb?.version ?? '', allowlist: kb?.manifest.allowlist ?? [] });
  }

  /** Scheduled RETENTION_SECONDS after the last message: deletes the whole chat. */
  async expire(): Promise<void> {
    await this.destroy();
  }

  /** Moves the single 'expire' schedule to RETENTION_SECONDS from now. */
  private async renewExpiry(): Promise<void> {
    for (const s of await this.listSchedules())
      if (s.callback === 'expire') await this.cancelSchedule(s.id);
    await this.schedule(RETENTION_SECONDS, 'expire');
  }

  override async onChatMessage(
    onFinish: GenerateTextOnFinishCallback<ToolSet>,
    options?: OnChatMessageOptions,
  ): Promise<Response> {
    await this.renewExpiry();

    if (lastUserText(this.messages).length > MAX_MESSAGE_CHARS) return textReply(TOO_LONG_TEXT);

    const conn = getCurrentAgent().connection as Connection<ConnState> | undefined;
    const ip = conn?.state?.ip ?? 'unknown';
    const { success } = await this.env.RATE_LIMIT.limit({ key: ip });
    if (!success) return textReply(RATE_LIMITED_TEXT);

    const config = await loadConfig(this.env);
    const kb = await this.kb(config.kbVersion);
    if (!kb) return textReply(FALLBACK_TEXT);

    let resolved;
    try {
      resolved = resolveModel(config, this.env);
    } catch (e) {
      console.error('model unavailable', String(e));
      return textReply(FALLBACK_TEXT);
    }

    const tools: ToolSet = config.webFetch ? { fetchPage: fetchPageTool() } : {};
    const result = streamText({
      model: resolved.model,
      system: buildSystem(kb, resolved.cacheSystem),
      messages: await convertToModelMessages(
        this.messages.filter((m) => !tooLong(m)).slice(-config.maxHistory),
      ),
      tools,
      stopWhen: stepCountIs(MAX_STEPS),
      maxOutputTokens: config.maxOutputTokens,
      temperature: config.temperature,
      providerOptions: resolved.providerOptions,
      abortSignal: options?.abortSignal,
      onError: ({ error }) => console.error('model error', String(error)),
      onFinish: async (event) => {
        const u = event.totalUsage;
        console.log(
          JSON.stringify({
            usage: {
              in: u.inputTokens,
              cacheRead: u.inputTokenDetails.cacheReadTokens,
              cacheWrite: u.inputTokenDetails.cacheWriteTokens,
              out: u.outputTokens,
              model: config.model,
            },
          }),
        );
        await onFinish(event);
      },
    });

    // Model errors become a normal assistant message with FALLBACK_TEXT instead of an error chunk.
    const stream = createUIMessageStream({
      execute: async ({ writer }) => {
        for await (const chunk of result.toUIMessageStream({ onError: () => FALLBACK_TEXT })) {
          if (chunk.type === 'error') writeText(writer, FALLBACK_TEXT);
          else writer.write(chunk);
        }
      },
    });
    return createUIMessageStreamResponse({ stream });
  }
}
