// The chat page's password gate (GET and POST /api/access). The password is checked on the server, which sets
// an HttpOnly chat_access cookie; the /agents proxy refuses chat requests without it, so this file only decides
// which view to show.
import { AccessStatus, ApiError } from '@engaging-assistant/protocol';

/** True when this browser has entered the password (its chat_access cookie is valid). */
export async function checkAccess(): Promise<boolean> {
  try {
    const res = await fetch('/api/access', { credentials: 'same-origin' });
    if (!res.ok) return false;
    const parsed = AccessStatus.safeParse(await res.json());
    return parsed.success && parsed.data.unlocked;
  } catch {
    return false;
  }
}

/** Sends the typed password. Resolves to null when it was right, or to the message to show. */
export async function unlock(password: string): Promise<string | null> {
  let res: Response;
  try {
    res = await fetch('/api/access', {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    });
  } catch {
    return 'Could not reach the server. Check your connection and try again.';
  }
  if (res.ok) return null;
  if (res.status === 401) return 'That password is not right. Try again.';
  const parsed = ApiError.safeParse(await res.json().catch(() => null));
  return parsed.success ? parsed.data.error : 'Something went wrong. Try again.';
}
