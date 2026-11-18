// Serves the docsify site in docs/ at http://localhost:3000. Reference pages are
// the repo's own READMEs, so Markdown files anywhere in the repo are served too;
// nothing else outside docs/ is (no .env files, secrets, state or node_modules).
import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { createServer } from 'node:http';
import { extname, join, normalize, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const PORT = Number(process.env.DOCS_PORT ?? 3000);
const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.md': 'text/markdown; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.ico': 'image/x-icon',
};
const BLOCKED = ['node_modules', '.git', '.wrangler', 'backups', '.terraform'];

function allowed(rel) {
  const parts = rel.split(sep);
  if (parts.some((p) => BLOCKED.includes(p) || p === '..')) return false;
  if (parts[0] === 'docs') return extname(rel) in TYPES;
  return extname(rel) === '.md';
}

createServer(async (req, res) => {
  const path = decodeURIComponent(new URL(req.url ?? '/', 'http://x').pathname);
  if (path === '/' || path === '/docs') {
    res.writeHead(302, { Location: '/docs/' }).end();
    return;
  }
  let file = normalize(join(ROOT, path));
  if (path.endsWith('/')) file = join(file, 'index.html');
  const rel = relative(ROOT, file);
  try {
    if (!allowed(rel) || !(await stat(file)).isFile()) throw new Error('not found');
    res.writeHead(200, { 'Content-Type': TYPES[extname(file)], 'Cache-Control': 'no-cache' });
    createReadStream(file).pipe(res);
  } catch {
    res.writeHead(404, { 'Content-Type': 'text/plain' }).end('Not found');
  }
}).listen(PORT, '0.0.0.0', () => {
  console.log(`Docs: http://localhost:${PORT}/docs/`);
});
