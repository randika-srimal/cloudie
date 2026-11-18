// Turns an assistant reply (markdown) into safe HTML for the chat page.
//
// Link safety: the model may invent URLs (a made-up case-study slug looks real). Only URLs on the knowledge
// base allowlist (pushed by the agent as state) stay clickable; every other link becomes its plain text.
// mailto: links always stay, because the canned fallback reply names a contact address.
import DOMPurify from 'dompurify';
import { Marked, type Token } from 'marked';

/**
 * The form URLs are compared in: lowercase scheme and host (URL does that), no hash, no trailing slash on
 * the path; the query is kept. Returns null for anything that is not an absolute http(s) URL.
 */
export function normaliseUrl(href: string): string | null {
  let url: URL;
  try {
    url = new URL(href);
  } catch {
    return null;
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;
  const path = url.pathname.replace(/\/+$/, '');
  return `${url.protocol}//${url.host}${path}${url.search}`;
}

function isAllowed(href: string, allowed: Set<string>): boolean {
  if (/^mailto:/i.test(href.trim())) return true;
  const normal = normaliseUrl(href.trim());
  return normal !== null && allowed.has(normal);
}

function allowSet(allowlist: string[]): Set<string> {
  const set = new Set<string>();
  for (const entry of allowlist) {
    const normal = normaliseUrl(entry);
    if (normal) set.add(normal);
  }
  return set;
}

// What markdown produces, and nothing else. No <img> (a remote image URL can leak data and skips the link
// allowlist), no forms or inputs, no style attributes (a fetched page could inject a fake login overlay).
const ALLOWED_TAGS = [
  'p',
  'br',
  'strong',
  'em',
  'del',
  'code',
  'pre',
  'blockquote',
  'ul',
  'ol',
  'li',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'a',
  'table',
  'thead',
  'tbody',
  'tr',
  'th',
  'td',
  'hr',
];
// target and rel are added after sanitising, to the links that survive.
const ALLOWED_ATTR = ['href'];

/** Renders `markdown` to sanitised HTML; links not on `allowlist` become text, the rest open in a new tab. */
export function renderReply(markdown: string, allowlist: string[]): string {
  const allowed = allowSet(allowlist);
  const marked = new Marked({
    gfm: true,
    breaks: true,
    walkTokens(token: Token) {
      if (token.type === 'link' && !isAllowed(token.href, allowed)) {
        // A text token with child tokens renders its children, so the link text keeps its formatting.
        (token as { type: string }).type = 'text';
      }
    },
  });
  const html = marked.parse(markdown, { async: false });

  const fragment = DOMPurify.sanitize(html, {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
    RETURN_DOM_FRAGMENT: true,
  });
  // Raw HTML in the reply (<a href> written as HTML, not markdown) skips walkTokens, so check again here.
  for (const a of fragment.querySelectorAll('a')) {
    const href = a.getAttribute('href');
    if (!href || !isAllowed(href, allowed)) {
      a.replaceWith(...a.childNodes);
      continue;
    }
    a.setAttribute('target', '_blank');
    a.setAttribute('rel', 'noopener');
  }
  const out = document.createElement('div');
  out.append(fragment);
  return out.innerHTML;
}
