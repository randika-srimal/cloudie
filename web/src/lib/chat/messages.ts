// What the chat page shows for the message list. The agent's reply stream starts with a `start` chunk, which
// makes the AI SDK add an assistant message with no parts seconds before the first word arrives (the model
// reads the whole knowledge base first). Rendering that message would put an empty bubble next to the
// "thinking" bubble, so an empty assistant message is hidden and the thinking bubble stands in for it.
import type { ChatStatus, UIMessage } from 'ai';

/** The text of a message's text parts, joined. */
export function textOf(message: UIMessage): string {
  return message.parts.map((p) => (p.type === 'text' ? p.text : '')).join('');
}

/** True while the assistant is running a tool (reading a web page) and has not finished it. */
export function usingTool(message: UIMessage): boolean {
  return message.parts.some(
    (p) =>
      (p.type.startsWith('tool-') || p.type === 'dynamic-tool') &&
      'state' in p &&
      p.state !== 'output-available' &&
      p.state !== 'output-error',
  );
}

/** An assistant message with nothing to show yet: no text and no tool in progress. */
export function isEmptyAssistant(message: UIMessage): boolean {
  return message.role === 'assistant' && textOf(message).trim() === '' && !usingTool(message);
}

/** The messages to render as bubbles. */
export function visibleMessages(messages: UIMessage[]): UIMessage[] {
  return messages.filter((m) => !isEmptyAssistant(m));
}

/** Whether to show the "thinking" bubble: a reply is on its way and nothing of it is visible yet. */
export function showThinking(messages: UIMessage[], status: ChatStatus): boolean {
  if (status !== 'submitted' && status !== 'streaming') return false;
  const last = messages.at(-1);
  return !last || last.role !== 'assistant' || isEmptyAssistant(last);
}
