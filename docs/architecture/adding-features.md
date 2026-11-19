# Adding features

Recipes for the usual first steps. Each ends with `./cli.sh check-all`.

## A page

Add `web/src/routes/<path>/+page.svelte`. It is prerendered like the home page (`web/src/routes/+layout.ts`).

For a page that only works in the browser (it reads the URL at runtime, e.g. `/item/[id]`):

1. In that route's `+page.ts`: `export const prerender = false;`
2. In `web/vite.config.ts`: `adapter: adapter({ fallback: '404.html' })`. Unknown paths then load the
   SvelteKit app, which renders the route in the browser.

## An API route

1. Add the reply's schema to `shared/protocol/src/index.ts`:

   ```ts
   export const Note = z.object({ id: z.string(), text: z.string() });
   export type Note = z.infer<typeof Note>;
   ```

2. Add the Function. The file path is the route; `[id]` is a parameter:

   ```ts
   // backend/api/functions/api/notes/[id].ts → GET /api/notes/:id
   import type { Note } from '@engaging-assistant/protocol';
   import type { Env } from '../../_lib/env.ts';
   import { error } from '../../_lib/http.ts';

   export const onRequestGet: PagesFunction<Env, 'id'> = ({ params }) => {
     if (params.id !== '1') return error(404, 'No such note');
     return Response.json({ id: '1', text: 'First note' } satisfies Note);
   };
   ```

3. Test it in `backend/api/functions-test/` (copy `api.test.ts`; set `params` in `context()`).
4. Call it from the website with `Note.parse(await res.json())`.

## A secret

1. `./cli.sh set-secret` (production) and a line in `backend/api/.dev.vars` (local).
2. Add it to `Env` in `backend/api/functions/_lib/env.ts`, then read `env.NAME`.
3. For tests, add it to `bindings` in `backend/api/vitest.config.ts`.

Plain settings that are not secret go in `[vars]` in `backend/api/wrangler.toml` instead.

## A D1 database

D1 is Cloudflare's SQLite database.

1. Uncomment `cloudflare_d1_database` in `backend/infra/main.tf`; add an output for its id:

   ```hcl
   output "d1_database_id" { value = cloudflare_d1_database.main.id }
   ```

2. Add `"D1 Write"` to `DEPLOY_PERMISSIONS` in `scripts/tokens.sh` and run `./cli.sh tokens` again.
3. `./cli.sh infra-apply`, then put the id in `backend/api/wrangler.toml`:

   ```toml
   [[d1_databases]]
   binding = "DB"
   database_name = "engaging-assistant-db"
   database_id = "<from ./cli.sh infra-output>"
   migrations_dir = "../migrations"
   ```

4. Write migrations in `backend/migrations/0001_init.sql`. Apply locally with
   `docker compose exec app pnpm --filter api exec wrangler d1 migrations apply engaging-assistant-db --local --persist-to ../../.wrangler/state`,
   and remotely with `--remote` before deploying code that needs them (add that step to `act_deploy` in
   `scripts/cli.sh` and to the CI `deploy` job). Never edit a migration that has been applied; add a new one.
5. Add `DB: D1Database` to `Env`, and `d1Databases: ['DB']` to `backend/api/vitest.config.ts`
   (`readD1Migrations` from `@cloudflare/vitest-plugin` applies the migrations in tests).
6. Check the database in `functions/api/health.ts` (`SELECT 1`).

R2 buckets (files) and KV namespaces follow the same pattern: Terraform resource, token permission,
`wrangler.toml` binding, `Env`, test config.

## A Worker beside Pages

For things Pages Functions can't do (Durable Objects, cron triggers, queue consumers), add a Worker package,
e.g. `backend/worker/` with its own `package.json` and `wrangler.toml`, then:

- add it to `vitest.config.ts` `projects` and give it a `dev` script on another port,
- add `"Workers Scripts Write"` to the deploy token,
- deploy it before Pages in `act_deploy` and in CI, since Pages bindings point at it.

Morse's `backend/realtime` is a working example.
