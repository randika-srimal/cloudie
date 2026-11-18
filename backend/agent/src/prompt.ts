import type { SystemModelMessage } from 'ai';
import type { Kb } from './kb.ts';

/** Shown when the assistant cannot answer (no KB, missing key, model error). Verbatim from the old server (plain text, no HTML to convert). */
export const FALLBACK_TEXT =
  'Sorry, something went wrong on our side. Please try again in a moment, ' +
  'or contact Sarah Monahan (sarah.m@engaging.io).';

/** Maximum characters of one user message. */
export const MAX_MESSAGE_CHARS = 4000;

export const TOO_LONG_TEXT =
  'That message is too long. Please keep it under 4,000 characters and try again.';

export const RATE_LIMITED_TEXT = "You're sending messages quickly, please wait a minute.";

/**
 * The system prompt as two messages: the instructions, then the knowledge base. Only the knowledge base
 * (large and stable) carries the Anthropic 1-hour cache breakpoint, so the cached prefix covers both.
 */
export function buildSystem(kb: Kb, cacheSystem: boolean): SystemModelMessage[] {
  const kbMessage: SystemModelMessage = { role: 'system', content: kb.prompt };
  if (cacheSystem)
    kbMessage.providerOptions = {
      anthropic: { cacheControl: { type: 'ephemeral', ttl: '1h' } },
    };
  return [{ role: 'system', content: kb.instructions }, kbMessage];
}
