// When the chat's WebSocket reconnects. PartySocket retries with backoff on its own; this caps the attempts,
// stops retrying while the tab is hidden (a backgrounded HubSpot tab should not keep spending Turnstile tokens
// and connect-limit slots), resumes when it is shown again, and tells the page when to offer a Reconnect button.

/** Reconnect attempts after a drop before the page gives up and shows a Reconnect button. */
export const MAX_RETRIES = 8;

export interface ReconnectPolicy {
  /** PartySocket's `shouldReconnectOnClose`: false (and paused) while the page is hidden. */
  shouldReconnectOnClose: () => boolean;
  /** AgentClient's `onConnectionError`: the socket stopped for good. Gives up unless only paused. */
  onConnectionError: () => void;
  /** The socket opened: nothing is paused or given up any more. */
  onOpen: () => void;
  /** The page became visible: true when reconnecting was paused and the caller should reconnect now. */
  onVisible: () => boolean;
  /** The user pressed Reconnect: clears the given-up state; the caller reconnects. */
  retry: () => void;
  /** True once retries are spent (or the close was terminal) while visible: show the Reconnect button. */
  readonly gaveUp: boolean;
}

export function createReconnectPolicy(isHidden: () => boolean): ReconnectPolicy {
  let paused = false;
  let gaveUp = false;
  return {
    shouldReconnectOnClose() {
      if (isHidden()) {
        paused = true;
        return false;
      }
      return true;
    },
    onConnectionError() {
      if (!paused) gaveUp = true;
    },
    onOpen() {
      paused = false;
      gaveUp = false;
    },
    onVisible() {
      if (!paused) return false;
      paused = false;
      return true;
    },
    retry() {
      paused = false;
      gaveUp = false;
    },
    get gaveUp() {
      return gaveUp;
    },
  };
}
