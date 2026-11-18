import { describe, expect, it } from 'vitest';
import { normaliseUrl, renderReply } from '../src/lib/chat/render.ts';

const ALLOWLIST = ['https://www.engaging.io/case-studies/acme/', 'https://example.com/a?b=1'];

function parse(html: string): HTMLElement {
  const div = document.createElement('div');
  div.innerHTML = html;
  return div;
}

describe('renderReply', () => {
  it('keeps an allowlisted link and opens it in a new tab', () => {
    const html = renderReply('See [Acme](https://www.engaging.io/case-studies/acme).', ALLOWLIST);
    const links = parse(html).querySelectorAll('a');
    expect(links).toHaveLength(1);
    expect(links[0]?.getAttribute('href')).toBe('https://www.engaging.io/case-studies/acme');
    expect(links[0]?.getAttribute('target')).toBe('_blank');
    expect(links[0]?.getAttribute('rel')).toBe('noopener');
    expect(links[0]?.textContent).toBe('Acme');
  });

  it('turns a link that is not on the allowlist into plain text', () => {
    const html = renderReply('[x](https://www.engaging.io/case-studies/made-up)', ALLOWLIST);
    const root = parse(html);
    expect(root.querySelector('a')).toBeNull();
    expect(root.textContent?.trim()).toBe('x');
  });

  it('turns a bare (autolinked) URL that is not on the allowlist into plain text', () => {
    const root = parse(renderReply('Read https://evil.example/page now', ALLOWLIST));
    expect(root.querySelector('a')).toBeNull();
    expect(root.textContent).toContain('https://evil.example/page');
  });

  it('matches the allowlist ignoring host case, a trailing slash and the hash', () => {
    const root = parse(
      renderReply('[a](HTTPS://WWW.Engaging.io/case-studies/acme/#top)', ALLOWLIST),
    );
    expect(root.querySelector('a')).not.toBeNull();
  });

  it('does not ignore the query string', () => {
    expect(
      parse(renderReply('[a](https://example.com/a?b=1)', ALLOWLIST)).querySelector('a'),
    ).not.toBeNull();
    expect(
      parse(renderReply('[a](https://example.com/a?b=2)', ALLOWLIST)).querySelector('a'),
    ).toBeNull();
  });

  it('keeps mailto links (the fallback reply names a contact address)', () => {
    const root = parse(
      renderReply('Contact sarah.m@engaging.io or [me](mailto:sarah.m@engaging.io).', []),
    );
    const links = [...root.querySelectorAll('a')];
    expect(links.length).toBeGreaterThan(0);
    for (const a of links) expect(a.getAttribute('href')).toBe('mailto:sarah.m@engaging.io');
  });

  it('drops javascript: links and raw HTML handlers', () => {
    const root = parse(renderReply('[x](javascript:alert(1))', ['javascript:alert(1)']));
    expect(root.innerHTML).not.toContain('javascript:');
  });

  it('unwraps a raw HTML link that is not on the allowlist', () => {
    const root = parse(renderReply('<a href="https://evil.example/">e</a>', ALLOWLIST));
    expect(root.querySelector('a')).toBeNull();
    expect(root.textContent).toContain('e');
  });

  it('removes onerror from raw HTML', () => {
    const html = renderReply('<img src=x onerror=alert(1)>', ALLOWLIST);
    expect(html).not.toContain('onerror');
  });

  it('renders markdown', () => {
    expect(renderReply('**bold**', [])).toContain('<strong>bold</strong>');
  });
});

describe('normaliseUrl', () => {
  it('lowercases the host, drops the hash and the trailing slash', () => {
    expect(normaliseUrl('HTTPS://Example.COM/Path/?q=1#x')).toBe('https://example.com/Path?q=1');
    expect(normaliseUrl('https://example.com/')).toBe('https://example.com');
  });

  it('returns null for something that is not an absolute URL', () => {
    expect(normaliseUrl('/relative')).toBeNull();
    expect(normaliseUrl('not a url')).toBeNull();
  });
});
