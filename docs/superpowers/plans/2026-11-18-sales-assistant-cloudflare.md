# Sales Assistant on Cloudflare Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild Engaging.io's case-study sales assistant on Cloudflare. A Pages chat page is embedded in HubSpot as an iframe. A Pages Function proxy forwards to a Worker running Agents SDK `AIChatAgent` Durable Objects. The model and its settings come from KV, the knowledge base from R2, and provider keys from AI Gateway, so none of them needs a code redeploy to change.

**Architecture:**
- The existing Pages project serves `/chat` (prerendered SvelteKit) and `functions/agents/[[path]].ts`. That Function checks Origin, Turnstile and a per-IP connect rate, then forwards the WebSocket over a service binding to a new Worker, `backend/agent`.
- The Worker's `SalesAgent` (one SQLite Durable Object per chat) builds the system prompt from the knowledge base bundle in R2. It calls the model chosen by the KV `config` key through AI SDK `streamText` behind AI Gateway, and pushes `{kbVersion, allowlist}` to the client as agent state.
- Terraform creates the KV namespace, the R2 bucket, the AI Gateway and the Turnstile widget.

**Tech Stack:** Cloudflare Pages and Workers, Durable Objects (SQLite), KV, R2, AI Gateway, Turnstile, Workers Rate Limiting. `agents` and `@cloudflare/ai-chat`, `ai` v6, `@ai-sdk/anthropic|openai|google|svelte`, zod/mini, SvelteKit 3 / Svelte 5, `marked` and `dompurify`, Vitest with `@cloudflare/vitest-plugin`, Terraform with Cloudflare provider ~> 5.29.

**Spec:** `docs/superpowers/specs/2026-11-18-sales-assistant-cloudflare-design.md`

## Global Constraints

- Every command runs inside the containers: `docker compose exec -T app pnpm <script>`. Never run pnpm, node, wrangler, terraform or flutter on the host.
- Never run `--remote`, `wrangler deploy`, `pages deploy` or `terraform apply`. CLI actions that use `--remote` are written but not run.
- TypeScript 6 strict. Imports in Functions and Worker code use `.ts` extensions, as `backend/api` does. Schemas use `zod/mini` in functional style.
- Errors returned from Functions use `error()` from `backend/api/functions/_lib/http.ts`.
- Secrets never go in wrangler.toml or the repo. Local values go in `.dev.vars` (copied from `.dev.vars.example`).
- New packages need a version that is at least one day old (pnpm `minimumReleaseAge`). Pick the newest version that passes; do not add to `minimumReleaseAgeExclude`.
- Default config: `provider: 'anthropic'`, `model: 'claude-sonnet-5-5'`, `maxOutputTokens: 16000`, `effort: 'low'`, `webFetch: true`, `maxHistory: 30`.
- Limits:
  - message length: 4000 characters
  - fetchPage: 2 uses per turn, about 20k tokens (80,000 characters) per fetch, never `engaging.io` or private IPs
  - connect rate: 10 per minute per IP
  - message rate: 20 per minute per IP
  - KB size: warn at 120k estimated tokens, fail at 180k
  - conversation retention: 30 days after the last message
- `ALLOWED_ORIGINS` (a comma-separated wrangler var) holds the HubSpot site origin(s) plus the Pages origin. Local dev uses `http://localhost:5173`.
- Local Turnstile uses Cloudflare's published test pair: site key `1x00000000000000000000AA`, secret `1x0000000000000000000000000000000AA`.
- Definition of done for each task: `pnpm typecheck`, `pnpm lint` and `pnpm test` all pass.
- When a task adds a resource, binding, route or outside service, update `docs/architecture/overview.md` in that same task. Task 12 then only finishes the docs.

## Review Focus

1. **Turnstile on reconnects.** A Turnstile token works only once, but the WebSocket reconnects automatically, so a reconnect must not need a new token. After a successful check, the proxy sets an HMAC-signed `chat_pass` cookie (`SameSite=None; Secure; Partitioned`, 12 hours) and accepts it on later connects. Tested in Task 8.
2. **The KV `config` is missing or broken.** A bad edit must never take the bot down. `loadConfig` falls back to defaults and logs. Tested in Task 3.
3. **A provider is configured but its key is missing.** The rep should see a short, friendly error message in the chat, not a hung stream. Tested in Task 7.
4. **A reply links to a URL not on the allowlist, including a model-invented engaging.io slug.** The link must render as plain text. Tested in Task 9.
5. **The `kbVersion` in KV points at a bundle that is missing from R2.** The agent keeps the last loaded bundle if it has one; otherwise it replies with the contact fallback. Tested in Task 5.

---

### Task 1: Remove the Flutter app

**Files:**
- Delete: `mobile/`, `docker/flutter.Dockerfile`, `docker/app.sh`, `docker/share-httpd.conf`, `docs/guide/mobile.md`
- Modify:
  - root `cli.sh`: the `app)` case, `in_flutter`, `lan_ip` and the header comment
  - `scripts/cli.sh`: `act_mobile_help`, `MENU_MOBILE`, its `MENUS` entry and its `menu()` choice
  - `docker-compose.yml`: the `flutter` and `share` services, and the `android-sdk`, `pub-cache` and `gradle-cache` volumes
  - `.github/workflows/ci.yml`: the `mobile` job
  - `scripts/rename.sh`: the mobile prompts and steps
  - `eslint.config.js`, `.prettierignore`, `.dockerignore`: the mobile lines
  - `CLAUDE.md`: the title, mobile stack line, Mobile command, Dart rule and mobile line in the definition of done
  - `README.md`
  - `docs/_sidebar.md`, `docs/index.html` (the `/reference/mobile` route and prism-dart)
  - `docs/README.md`, `docs/guide/{cli,local-development,new-project}.md`, `docs/operations/{deploy,troubleshooting}.md`, `docs/architecture/{overview,adding-features}.md`
  - the comments in `shared/protocol/src/index.ts:1-2` and `backend/api/functions/api/health.ts:1`

- [ ] **Step 1:** Make the edits above. Use `docs/guide/new-project.md:53` as the checklist, then rewrite that paragraph, because the steps are now done.
- [ ] **Step 2:** `grep -rniE 'flutter|mobile|dart' --exclude-dir=node_modules --exclude-dir=.git .` should return no hits, except in `docs/superpowers/`.
- [ ] **Step 3:** `docker compose config -q` should exit 0. Then `docker compose exec -T app pnpm typecheck && pnpm lint && pnpm test` should pass.
- [ ] **Step 4:** Commit with the message `chore: remove Flutter app`.

### Task 2: Protocol schemas

**Files:** Modify `shared/protocol/src/index.ts`. Test in `shared/protocol/test/assistant.test.ts`.

**Interfaces (Produces):**
- `AssistantConfig` (zod object), `type AssistantConfig`, and `DEFAULT_CONFIG: AssistantConfig`. Fields:
  - `provider: 'anthropic'|'openai'|'google'`
  - `model: string` (min 1)
  - `temperature?: number` (0 to 2)
  - `maxOutputTokens: int` (1 to 64000)
  - `effort?: 'low'|'medium'|'high'`
  - `webFetch: boolean`
  - `maxHistory: int` (2 to 100)
  - `kbVersion: string` (`''` means none published)
- `CaseStudyStatus`, an enum: `published|anonymous|reference|draft|excluded|never_disclose`.
- `CaseStudyFrontmatter`, an object:
  - `client: string` and `display_name: string`
  - `status: CaseStudyStatus`
  - `url: string | null`, which must be `https://www.engaging.io/...` when `status === 'published'`
  - `industry: string[]`, `region: string[]`, `hubs: string[]`
  - `migration_from: string[]`, defaulting to `[]`
  - `updated: iso date`
- `KbManifest`, an object: `version: string`, `builtAt: iso datetime`, `tokens: int`, `files: int`, `allowlist: string[]`.
- `AgentState`, an object: `kbVersion: string`, `allowlist: string[]`.

- [ ] **Step 1: Write the failing tests.**
  - `DEFAULT_CONFIG` passes `AssistantConfig.parse` and equals the defaults from Global Constraints with `kbVersion: ''`.
  - `AssistantConfig.safeParse({...DEFAULT_CONFIG, provider:'mistral'}).success === false`.
  - `CaseStudyFrontmatter` rejects `status:'published', url:null` and accepts `status:'anonymous', url:null`.
  - `KbManifest` round-trips a sample value.
- [ ] **Step 2:** Run `pnpm test shared/protocol`. It should fail with an import error.
- [ ] **Step 3:** Implement the schemas. Put the published-needs-url rule in `.check(z.refine(...))`.
- [ ] **Step 4:** Run the tests again; they should pass.
- [ ] **Step 5:** Commit with the message `feat(protocol): assistant config, KB and agent state schemas`.

### Task 3: Agent Worker package and config loader

**Files:**
- Create: `backend/agent/{package.json,wrangler.toml,tsconfig.json,vitest.config.ts,.dev.vars.example}`, `backend/agent/src/{index.ts,env.ts,config.ts}`
- Test: `backend/agent/test/config.test.ts`
- Modify: root `vitest.config.ts`, adding `'backend/agent'` to projects

**Interfaces (Produces):**
- `interface Env`:
  - `CONFIG: KVNamespace`
  - `KB: R2Bucket`
  - `SalesAgent: DurableObjectNamespace`
  - `RATE_LIMIT: RateLimit`
  - `AI_GATEWAY_URL: string`, the base `https://gateway.ai.cloudflare.com/v1/<acct>/<gw>` as a var
  - `CF_AIG_TOKEN?: string`
  - `ANTHROPIC_API_KEY?`, `OPENAI_API_KEY?`, `GOOGLE_API_KEY?` (the fallback secrets)
  - `MOCK_MODEL?: string`, test and e2e only
- `loadConfig(env: Env, now = Date.now()): Promise<AssistantConfig>` reads KV key `config` as JSON and merges it over `DEFAULT_CONFIG`.
  - It validates the result. If it is invalid, it logs `config invalid` and returns `DEFAULT_CONFIG`.
  - It caches the result per isolate for 60 s.
  - `resetConfigCache()` is exported for tests.

**Setup:**
- `package.json` name `agent`. Dependencies: `agents`, `@cloudflare/ai-chat`, `ai`, `@ai-sdk/anthropic`, `@ai-sdk/openai`, `@ai-sdk/google`, `@cloudie/protocol`, `zod`. Dev dependencies match `backend/api`.
- Scripts:
  - `dev`: `wrangler dev --port 8787 --persist-to ../../.wrangler/state`
  - `test`: `vitest run`
  - `typecheck`: `tsc -p .`
- `wrangler.toml`:
  - `name="cloudie-agent"`, `main="src/index.ts"`, `compatibility_date="2026-11-01"`, `compatibility_flags=["nodejs_compat"]`
  - a Durable Object binding `SalesAgent` with `class_name="SalesAgent"`, and `[[migrations]] tag="v1" new_sqlite_classes=["SalesAgent"]`
  - `[[kv_namespaces]] CONFIG` and `[[r2_buckets]] KB`, with ids from Terraform outputs and placeholders until Task 11
  - `[[ratelimits]] RATE_LIMIT` with `limit=20`, `period=60`
  - `[vars] AI_GATEWAY_URL`
  - `[observability] enabled=true`
- `vitest.config.ts`: `cloudflareTest` with `main: './src/index.ts'` and miniflare `kvNamespaces:['CONFIG']`, `r2Buckets:['KB']`, `durableObjects:{SalesAgent:'SalesAgent'}`, `bindings:{MOCK_MODEL:'echo', AI_GATEWAY_URL:'http://gw.test'}`.
- `src/index.ts`: export `SalesAgent` (stub for now) and `default { fetch: (req, env) => routeAgentRequest(req, env) ?? 404 }`.

- [ ] **Step 1: Write the failing tests.**
  - With no KV key, `loadConfig` returns `DEFAULT_CONFIG`.
  - With `{"model":"claude-haiku-5-5"}`, the merged result has that model.
  - With `"not json"`, it returns `DEFAULT_CONFIG`.
  - With `{"provider":"mistral"}`, it returns `DEFAULT_CONFIG`.
  - Writing a new value within 60 s still returns the cached one; calling with `now + 61_000` returns the new one.
- [ ] **Step 2:** Run `pnpm test backend/agent`. It should fail.
- [ ] **Step 3:** Implement the package, `env.ts` and `config.ts`.
- [ ] **Step 4:** Run the tests again; they should pass. `pnpm typecheck` should also pass.
- [ ] **Step 5:** Commit with the message `feat(agent): worker package and KV-backed config`.

### Task 4: Model registry behind AI Gateway

**Files:** Create `backend/agent/src/models.ts`. Test in `backend/agent/test/models.test.ts`.

**Interfaces:**
- Consumes `AssistantConfig` and `Env`.
- Produces `resolveModel(config: AssistantConfig, env: Env): { model: LanguageModel; providerOptions: SharedV3ProviderOptions; cacheSystem: boolean }`. It throws `MissingKeyError` when the provider has neither `CF_AIG_TOKEN` nor its own key.

**Behaviour:**
- If `env.MOCK_MODEL` is set, return a `MockLanguageModelV3` (from `ai/test`) that streams back the text `"echo: <last user text>"`, or for `'fail'` throws.
- Otherwise build the provider with `baseURL = ${AI_GATEWAY_URL}/<anthropic|openai|google-ai-studio>` and `headers: {'cf-aig-authorization': 'Bearer ' + CF_AIG_TOKEN}` when the token is set.
  - The provider `apiKey` is the provider's secret if present; otherwise a placeholder, so the gateway supplies the stored BYOK key.
- Provider options:
  - Anthropic: `cacheSystem = true` and `providerOptions.anthropic = { effort }` when effort is set.
  - OpenAI: `providerOptions.openai = { reasoningEffort: effort }`.
  - Google: none.

- [ ] **Step 1: Write the failing tests.**
  - The anthropic config with a token gives `model.provider` starting `anthropic` and `cacheSystem === true`.
  - The openai config gives `cacheSystem === false`.
  - With no token and no key, it throws `MissingKeyError`.
  - With `MOCK_MODEL='echo'`, it returns the mock.
- [ ] **Step 2:** Run the tests; they should fail. **Step 3:** Implement. **Step 4:** Run the tests; they should pass.
- [ ] **Step 5:** Commit with the message `feat(agent): provider registry via AI Gateway`.

### Task 5: Knowledge base loader

**Files:** Create `backend/agent/src/kb.ts`. Test in `backend/agent/test/kb.test.ts`.

**Interfaces (Produces):**
- `loadKb(env: Env, version: string): Promise<Kb | null>`, with `type Kb = { version: string; prompt: string; instructions: string; manifest: KbManifest }`.
- The R2 layout, written by Task 10:
  - `kb/<version>/instructions.md`
  - `kb/<version>/prompt.md`, the generated index plus the documents
  - `kb/<version>/manifest.json`
- It caches the last good `Kb` per isolate.
  - If the version is not found or the manifest is invalid, it logs and returns the cached `Kb`, whatever its version, or `null` if none has loaded.
- `resetKbCache()` is exported for tests.

- [ ] **Step 1: Write the failing tests.**
  - Put the three objects for `v1`; `loadKb(env,'v1')` returns them with `manifest.allowlist` parsed.
  - A second call does not hit R2 (spy on `env.KB.get`).
  - `loadKb(env,'v2')` with v2 missing returns the v1 bundle.
  - With a fresh cache and a missing version, it returns `null`.
- [ ] **Step 2:** Run the tests; they should fail. **Step 3:** Implement. **Step 4:** Run the tests; they should pass.
- [ ] **Step 5:** Commit with the message `feat(agent): R2 knowledge base loader with last-good fallback`.

### Task 6: `fetchPage` tool

**Files:** Create `backend/agent/src/tools/fetchPage.ts`. Test in `backend/agent/test/fetchPage.test.ts`.

**Interfaces (Produces):** `fetchPageTool(opts: { fetch?: typeof fetch; maxUses?: number }): Tool`. It is an AI SDK `tool()` with input `{ url: string }` and output `{ url, title, text } | { error: string }`. It keeps a per-instance use counter, so build a new tool every turn.

**Rules:**
- Allow only `http` or `https`.
- Refuse these hosts:
  - `engaging.io` and its subdomains
  - `localhost`
  - IP literals in `10/8`, `172.16/12`, `192.168/16`, `127/8`, `169.254/16` and `::1`
- Use an 8 s timeout and follow at most 3 redirects, re-checking each hop.
- Accept only `text/html` and `text/plain`.
- Strip `script`, `style` and `nav` and their tags, collapse whitespace, and cut to 80,000 characters.
- The third and later calls return `{error:'fetch limit reached'}`.

- [ ] **Step 1: Write the failing tests** (using an injected fake fetch).
  - Returns stripped text and title.
  - Rejects `https://www.engaging.io/x`, `http://127.0.0.1`, `file:///etc/passwd` and a redirect to `http://10.0.0.1`.
  - Cuts a 200k-character page to 80,000 characters.
  - The third call is refused.
  - A PDF content type returns an error.
- [ ] **Step 2:** Run the tests; they should fail. **Step 3:** Implement with `HTMLRewriter` or a regex strip. **Step 4:** Run the tests; they should pass.
- [ ] **Step 5:** Commit with the message `feat(agent): provider-neutral fetchPage tool with SSRF guards`.

### Task 7: `SalesAgent`

**Files:** Create `backend/agent/src/agent.ts` and `backend/agent/src/prompt.ts`; modify `src/index.ts`. Test in `backend/agent/test/agent.test.ts`.

**Interfaces:**
- Consumes `loadConfig`, `resolveModel`, `loadKb` and `fetchPageTool`.
- Produces `class SalesAgent extends AIChatAgent<Env, AgentState>`.
- Produces `buildSystem(kb: Kb, cacheSystem: boolean): SystemModelMessage[]`, which returns `[instructions, kb.prompt]`. The second message carries `providerOptions.anthropic.cacheControl = {type:'ephemeral', ttl:'1h'}` when `cacheSystem` is true.
- `FALLBACK_TEXT` is the exact contact message from the old `index.js`, converted to markdown.

**Behaviour:**
- `onConnect(conn, ctx)`:
  - store `ctx.request.headers.get('cf-connecting-ip')` on the connection state
  - load the config and the KB
  - call `setState({kbVersion, allowlist})`
- `onChatMessage(onFinish, options)`:
  1. If the latest user text is over 4000 characters, reply with an error message.
  2. Check `env.RATE_LIMIT.limit({key: ip})`; if it fails, reply "You're sending messages quickly, please wait a minute."
  3. Load the config and the KB. If the KB is `null`, reply with `FALLBACK_TEXT`.
  4. Call `streamText` with the model, `system: buildSystem(...)`, `messages: convertToModelMessages(this.messages.slice(-config.maxHistory))`, `tools` (`fetchPage` only when `config.webFetch`), `stopWhen: stepCountIs(4)`, `maxOutputTokens`, `temperature` and `providerOptions`.
  5. Return `result.toUIMessageStreamResponse({ onFinish, onError: () => FALLBACK_TEXT })`.
  6. Log one line of usage: `in`, `cacheRead`, `cacheWrite`, `out` and `model`.
  7. Call `this.schedule(30*24*3600, 'expire')`, replacing any earlier schedule. `expire()` runs `this.destroy()`.
- `MissingKeyError` and model errors stream `FALLBACK_TEXT` and are logged; the stream never hangs.
- The exact `AIChatAgent` method signatures come from the installed `@cloudflare/ai-chat` `.d.ts`. Read it first; if they differ, adjust the names and keep the behaviour.

- [ ] **Step 1: Write the failing tests** (using `MOCK_MODEL`, KV and R2 seeded in `beforeEach`, and `runInDurableObject` or a WebSocket `fetch` to `/agents/sales-agent/t1`).
  - A user message gets the reply `echo: hi`, and `this.messages` has 2 entries after reconnecting.
  - Connecting sets the state `{kbVersion:'v1', allowlist:[...]}`.
  - A 4001-character message gets the length error, and the model is not called.
  - With `MOCK_MODEL='fail'`, the reply is `FALLBACK_TEXT`.
  - With no KB, the reply is `FALLBACK_TEXT`.
  - With the anthropic provider, `buildSystem` puts cacheControl on the second message and leaves the first without it.
  - After 31 messages with `maxHistory: 30`, the model receives 30 messages (the mock records its input).
- [ ] **Step 2:** Run the tests; they should fail. **Step 3:** Implement. **Step 4:** Run the tests; they should pass.
- [ ] **Step 5:** Commit with the message `feat(agent): SalesAgent with KB prompt, caching, limits and fallback`.

### Task 8: Pages proxy with guards

**Files:**
- Create: `backend/api/functions/agents/[[path]].ts`, `backend/api/functions/_lib/guards.ts`
- Modify:
  - `backend/api/functions/_lib/env.ts`: add `AGENT: Fetcher`, `CONNECT_LIMIT: RateLimit`, `TURNSTILE_SECRET: string`, `PASS_SECRET: string`, `ALLOWED_ORIGINS: string`
  - `backend/api/wrangler.toml`: add `[[services]] binding="AGENT" service="cloudie-agent"`, `[[ratelimits]] CONNECT_LIMIT limit=10 period=60` and the `ALLOWED_ORIGINS` var
  - `backend/api/vitest.config.ts`: add bindings and a fake `AGENT` service
  - `.dev.vars.example`: the Turnstile test secret and a dev `PASS_SECRET`
- Test: `backend/api/functions-test/agents.test.ts`

**Interfaces (Produces):**
- `checkOrigin(req, allowed: string[]): boolean`
- `verifyTurnstile(token, secret, ip, fetchFn = fetch): Promise<boolean>`, which calls `https://challenges.cloudflare.com/turnstile/v0/siteverify`
- `signPass(secret, now): Promise<string>` and `verifyPass(cookie, secret, now): Promise<boolean>`, using HMAC-SHA256 over the expiry, valid for 12 hours

**Order of checks** in `onRequest`:
1. Only path prefix `/agents/sales-agent/` is accepted; anything else gets `error(404)`.
2. A bad Origin gets `error(403,'Forbidden')`.
3. A failed `CONNECT_LIMIT` check gets `error(429,'Too many connections')`.
4. A valid `chat_pass` cookie, or `?cf_turnstile=` passing siteverify, is required; otherwise `error(401,'Verification required')`.
5. Then `env.AGENT.fetch(request)`. When Turnstile was used, append `Set-Cookie: chat_pass=...; Path=/agents; Secure; HttpOnly; SameSite=None; Partitioned; Max-Age=43200` to the response.
   - The 101 upgrade response's headers are copied into a new `Response(null,{status:101, webSocket, headers})`.
- Non-WebSocket GET and POST to the agent path (the Agents SDK uses HTTP for message fetches) pass through the same guards.

- [ ] **Step 1: Write the failing tests.**
  - The wrong Origin gets 403.
  - No token gets 401.
  - A valid token (fake siteverify) gets 200 from the fake agent plus a `chat_pass` cookie.
  - A valid cookie with no token passes.
  - An expired or tampered cookie gets 401.
  - The 11th connect in a minute gets 429.
  - `/agents/other/x` gets 404.
- [ ] **Step 2:** Run the tests; they should fail. **Step 3:** Implement. **Step 4:** Run the tests; they should pass.
- [ ] **Step 5:** Update the root `dev` script so `pnpm --filter agent dev` runs alongside api and vite, and `wrangler pages dev` finds `cloudie-agent` through the local dev registry. Proxy `/agents` with `ws:true` in `web/vite.config.ts`. Set `/api/health` to also return `kbVersion` and `model` through `env.AGENT.fetch('/status')` (add `GET /status` to the agent index, plus `Health` schema fields `kbVersion?` and `model?`) and update its test.
- [ ] **Step 6:** Commit with the message `feat(api): guarded WebSocket proxy to the agent worker`.

### Task 9: Chat page

**Files:**
- Create: `web/src/lib/chat/{render.ts,session.ts,chat.svelte.ts}`, `web/src/lib/chat/Turnstile.svelte`, `web/src/routes/chat/+page.svelte`, `web/vitest.config.ts`
- Test: `web/test/render.test.ts`
- Modify: `web/package.json`, root `vitest.config.ts` (add `'web'`), `web/static/_headers`

**Interfaces (Produces):**
- `renderReply(markdown: string, allowlist: string[]): string`. It renders with `marked`. Through `walkTokens`, a `link` token whose `href` (normalised, without the trailing slash) is not in the allowlist becomes a text token. The result is sanitised with `DOMPurify` (installed with `isomorphic-dompurify` or a jsdom test environment). Every remaining `<a>` gets `target="_blank" rel="noopener"`.
- `sessionId(): string` keeps a `crypto.randomUUID()` in `sessionStorage` key `chat-session`.
- `createChat(opts: { turnstileToken: string }): { chat: Chat; state: { current: AgentState | null } }`.
  - It builds `new AgentClient({ agent:'SalesAgent', name: sessionId(), host: location.host, query: { cf_turnstile: token } })` and `new WebSocketChatTransport({ agent })`.
  - It builds `new Chat({ transport })` from `@ai-sdk/svelte`.
  - It subscribes to the client's state updates.

**Page:**
- The message list, `{@html renderReply(...)}` for assistant parts, a textarea that sends on Enter and is capped at 4000 characters, and an invisible Turnstile widget.
- The site key comes from `PUBLIC_TURNSTILE_SITEKEY` (a Vite env var, set at build time from the Terraform output).
- A "New chat" button clears `sessionStorage` and reloads.
- "Thinking…" shows while the status is `submitted`.
- The footer reads "powered by AI".

**`_headers` for `/chat`:**
- `Content-Security-Policy: frame-ancestors 'self' https://*.hubspot.com <HUBSPOT_ORIGIN>; script-src 'self' https://challenges.cloudflare.com; frame-src https://challenges.cloudflare.com`
- Take the HubSpot origin from the old repo's `README.md` or `MIGRATION.md`. If you can't find it, leave a `TODO(user)` marker in `_headers` and list it in the hand-off.

- [ ] **Step 1: Write the failing tests.**
  - An allowlisted link stays an `<a target="_blank" rel="noopener">`.
  - `[x](https://www.engaging.io/case-studies/made-up)` renders as the plain text `x`.
  - `<img src=x onerror=alert(1)>` has no `onerror` in the output.
  - `**bold**` becomes `<strong>`.
- [ ] **Step 2:** Run the tests; they should fail. **Step 3:** Implement `render.ts`, then the session, the chat wrapper and the page. **Step 4:** Run the tests; they should pass. `pnpm typecheck` should pass, including svelte-check.
- [ ] **Step 5:** Commit with the message `feat(web): embeddable chat page with safe markdown and Turnstile`.

### Task 10: Knowledge base files and tooling

**Files:**
- Create: `knowledge/instructions.md`, `knowledge/case-studies/*.md`, `knowledge/README.md`
- Create: `scripts/kb/{lib.ts,split.ts,check.ts,build.ts,publish.sh}`, `scripts/kb/vitest.config.ts`, `scripts/kb/test/kb.test.ts`, `scripts/kb/test/fixtures/`
- Modify: root `package.json` (scripts `kb:check` and `kb:build`), root `vitest.config.ts` (add `'scripts/kb'`), `scripts/cli.sh`, `.github/workflows/kb.yml`, `.gitignore` (`dist/`)

**Interfaces (Produces):**
- `parseCaseStudy(path, text): { meta: CaseStudyFrontmatter; body: string }`
- `checkKb(dir): { errors: string[]; warnings: string[]; tokens: number }`. Tokens are estimated as `Math.ceil(chars / 3.5)`.
- `buildKb(dir, outDir): KbManifest`. It writes `outDir/<version>/{instructions.md,prompt.md,manifest.json}`, where `version` is the first 12 hex characters of the SHA-256 of the inputs.

**Checks (errors):**
- the frontmatter is invalid
- a `published` entry has no engaging.io URL
- two files share a slug
- any `never_disclose` client name, or a name in `knowledge/never-disclose.txt`, appears in any uploaded file (case-insensitive)
- the token estimate is over 180k
- a file still has `\*` or `https\:` escapes

**Checks (warnings):** the token estimate is over 120k.

**Build:**
- Drop `excluded` and `never_disclose` files.
- For `draft` files, remove the `### Results` and `### Impact` sections and any quote blocks.
- The index is generated as one block per file: display_name, Naming (from status), Industry, Region, HubSpot licensing, Link (url or "none published"), Summary (the first paragraph of the body).
  - It is grouped under the same section headings as the old `case_study_index.md`.
- `prompt.md` is `<case_study_index>…</case_study_index>` followed by `<case_study_documents>` with one `<document name="slug">` per file.
- `manifest.allowlist` is every `url` that is not null and goes into the bundle.

**`split.ts`** (a one-off migration, run once and committed with its output):
- Reads `../engaging-assistant/knowledge/`.
- Parses `case_study_index.md` records (`**Name**` followed by `Field: value` lines) under their `##` sections, and maps each section to a status.
- Splits `case_studies_*.md` at `^# ` headings and drops the "Quick prompt example" heading.
- Matches each document to a record by a case-insensitive name contains test.
- Unescapes the Google Docs markdown.
- Writes `knowledge/case-studies/<slug>.md` with frontmatter and the body.
  - The index summary becomes the first paragraph when there is no document.
  - Documents with no matching record go to `knowledge/case-studies/_unmatched/`, which is excluded from the build. List them in the hand-off.
- `instructions.md` is copied, with its HTML output section rewritten to ask for markdown (headings, bold, bullet lists, links only from the index). The index and URL-list sections are removed, because the build now generates them. The closing contact lines stay.

**`publish.sh`:**
- Runs `pnpm kb:build`.
- Puts each file with `wrangler r2 object put cloudie-kb/kb/<v>/<file> --remote`.
- Reads the KV `config`, sets `kbVersion`, and puts it back with `wrangler kv key put config --binding CONFIG --remote`, run from `backend/agent`.

**CLI actions** (in `scripts/cli.sh` under a new `MENU_ASSISTANT` group, which also goes in `MENUS` and in the `menu()` case):
- `act_kb_check`
- `act_kb_publish`, which confirms with gum before running
- `act_ai_config`, which shows the KV `config`, opens `$EDITOR` on a temp copy, validates it with a small `node -e` script using `AssistantConfig`, then puts it

**CI** (`.github/workflows/kb.yml`):
- On pull requests touching `knowledge/**`: `pnpm kb:check`.
- On push to `main` touching `knowledge/**`, when `vars.DEPLOY_ENABLED == 'true'`: `bash scripts/kb/publish.sh` with `CLOUDFLARE_API_TOKEN`.

- [ ] **Step 1: Write the failing tests** (against fixtures: one published, one anonymous, one draft with Results, one never_disclose whose name is also planted in the anonymous body).
  - `checkKb` reports the planted name as an error.
  - With the plant removed, there are no errors.
  - `buildKb` leaves the never_disclose file out of `prompt.md`, strips Results from the draft, puts only the published URL in the allowlist, and gives the same version for the same inputs.
  - A published entry with a null URL is an error.
- [ ] **Step 2:** Run the tests; they should fail. **Step 3:** Implement `lib.ts`, `check.ts` and `build.ts`, run with `node --experimental-strip-types`. **Step 4:** Run the tests; they should pass.
- [ ] **Step 5:** Write `split.ts` and run it in the container: `node --experimental-strip-types scripts/kb/split.ts ../engaging-assistant/knowledge knowledge`. The old repo must be mounted or copied into the container first; if it isn't, copy `knowledge/` into `.tmp/old-kb/` on the host with `cp` and point the script there.
  - Then `pnpm kb:check` should report 0 errors and print the token count. Fix the frontmatter by hand where it fails.
- [ ] **Step 6:** Write `knowledge/README.md`: how to add or edit a case study, the meaning of each status, how to publish and how to roll back.
- [ ] **Step 7:** Commit with the message `feat(kb): per-case-study knowledge base with generated index, checks and publishing`.

### Task 11: Terraform and tokens

**Files:** Modify `backend/infra/{main.tf,variables.tf,outputs.tf}`, `scripts/tokens.sh`, `backend/agent/wrangler.toml`, `backend/api/wrangler.toml` and `scripts/cli.sh` (`act_infra_sync`, if it writes IDs into wrangler.toml; extend it to write the agent IDs too).

**Resources:**
- `cloudflare_workers_kv_namespace.config`, titled `cloudie-config`
- `cloudflare_r2_bucket.kb`, named `cloudie-kb`, with `prevent_destroy`
- `cloudflare_ai_gateway.assistant`:
  - `id = "cloudie-assistant"`
  - `collect_logs = true`
  - `cache_ttl = 0`
  - `rate_limiting_limit = 300`, `rate_limiting_interval = 60`, `rate_limiting_technique = "sliding"`
  - `authentication = true`
- `cloudflare_turnstile_widget.chat`:
  - `name = "cloudie-chat"`
  - `mode = "invisible"`
  - `domains = concat([cloudflare_pages_project.web.subdomain], var.custom_domains, var.hubspot_domains)`
- New variable `hubspot_domains` (`list(string)`, default `[]`).
- Outputs: `kv_config_id`, `kb_bucket`, `ai_gateway_url` (`https://gateway.ai.cloudflare.com/v1/${var.account_id}/cloudie-assistant`), `turnstile_sitekey`. The Turnstile secret is marked sensitive; it goes in with `./cli.sh set-secret`, never into a file.
- Check every attribute name against the provider schema with `terraform providers schema -json` in the container before writing it.
- Add to `DEPLOY_PERMISSIONS` in `scripts/tokens.sh`: `"Workers Scripts Write" "Workers KV Storage Write" "Workers R2 Storage Write" "AI Gateway Write"`. Use the exact group names returned by the permission-groups lookup already in the script.

- [ ] **Step 1:** Run `docker compose exec -T app pnpm tf fmt` and `pnpm tf validate`; both should exit 0.
- [ ] **Step 2:** Make `./cli.sh deploy` also deploy the agent Worker (`wrangler deploy` from `backend/agent`) **before** Pages, because the service binding needs it. Write the code only; do not run it.
- [ ] **Step 3:** Commit with the message `feat(infra): KV, R2, AI Gateway and Turnstile for the assistant`.

### Task 12: Docs, end-to-end test, final check

**Files:**
- Modify: `docs/architecture/overview.md` (the spec's mermaid diagram, resource table rows, glossary entries for Durable Object, AI Gateway, BYOK, Turnstile and KV), `docs/_sidebar.md`, `docs/guide/cli.md`, `docs/operations/deploy.md`, `CLAUDE.md` (stack line for `backend/agent`, a rule that the knowledge base changes through `knowledge/` and `kb:check`)
- Create: `docs/guide/assistant.md`, covering:
  - changing the model (`./cli.sh ai-config`, with a table of fields)
  - rotating provider keys (AI Gateway dashboard → Provider keys, or `wrangler secret put` on `cloudie-agent`)
  - editing and publishing the knowledge base
  - rolling back (setting an old `kbVersion`)
  - embedding in HubSpot (an `<iframe src="https://<domain>/chat" style="width:100%;height:700px;border:0" allow="clipboard-write">` snippet)
  - costs (prompt caching, and how to read AI Gateway analytics)
- Create: `e2e/tests/chat.spec.ts`

- [ ] **Step 1:** Write the e2e test, run against a dev stack with `MOCK_MODEL=echo` and the Turnstile test keys. It opens `/chat`, types `hi`, presses Enter and expects the text `echo: hi` within 10 s. It then reloads and expects `echo: hi` to still be visible, because history is persisted.
- [ ] **Step 2:** Run `./cli.sh e2e chat`; it should pass.
- [ ] **Step 3:** Write the docs.
- [ ] **Step 4:** Run `docker compose exec -T app pnpm typecheck && pnpm lint && pnpm test && pnpm tf validate`; all should pass. Also run `pnpm kb:check` and report the token count.
- [ ] **Step 5:** Commit with the message `docs: assistant guide, architecture and e2e chat test`.
