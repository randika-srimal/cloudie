# The sales assistant

A chat page (`/chat`) that HubSpot embeds for Engaging's sales reps. It answers questions about Engaging's
services and case studies from a knowledge base in `knowledge/`, through a model behind Cloudflare AI Gateway.
How the pieces connect is in [Architecture and resources](../architecture/overview.md); this page is how to run
it day to day.

| Task                         | How                                                                                   |
| ---------------------------- | ------------------------------------------------------------------------------------- |
| Change the model             | `./cli.sh ai-config` ([below](#change-the-model))                                     |
| Rotate a provider key        | AI Gateway dashboard, or `./cli.sh set-agent-secret` ([below](#rotate-provider-keys)) |
| Edit the knowledge base      | A pull request to `knowledge/`, checked by `pnpm kb:check`                            |
| Publish the knowledge base   | Merge to `main`, or `./cli.sh kb-publish`                                             |
| Roll the knowledge base back | `./cli.sh ai-config`, set an earlier `kbVersion`                                      |
| See what is live             | `GET /api/health` shows `kbVersion` and `model`                                       |

Notion is not part of this setup: the knowledge base is the markdown in `knowledge/` and nothing else.

## Change the model

The agent Worker reads its runtime config from the KV key `config` (namespace `cloudie-config`) at most 60
seconds after it changes, so a model change needs no deploy. `./cli.sh ai-config` shows the saved config (or the
defaults when none is saved), opens it in `$EDITOR`, checks it against the `AssistantConfig` schema in
`shared/protocol` and saves it after asking.

| Field             | Default             | Meaning                                                                                               |
| ----------------- | ------------------- | ----------------------------------------------------------------------------------------------------- |
| `provider`        | `anthropic`         | `anthropic`, `openai` or `google`                                                                     |
| `model`           | `claude-sonnet-5-5` | The provider's model ID, as its API names it                                                          |
| `maxOutputTokens` | `16000`             | Longest reply, 1 to 64,000 tokens                                                                     |
| `effort`          | `low`               | Optional. `low`, `medium` or `high`: Anthropic `effort`, OpenAI `reasoningEffort`; ignored for Google |
| `temperature`     | not set             | Optional, 0 to 2. Leave it out unless the model needs it                                              |
| `webFetch`        | `true`              | Whether the model may use `fetchPage` (2 pages per turn, never engaging.io or private addresses)      |
| `maxHistory`      | `30`                | How many of the latest messages are sent with each turn, 2 to 100                                     |
| `kbVersion`       | `""`                | The published knowledge base to answer from. Set by `kb-publish`; change it by hand only to roll back |

An invalid saved config is ignored (the Worker logs `config invalid` and uses the defaults), and the CLI refuses
to save one. A switch to another provider needs that provider's key in the gateway or on the Worker first.

## Rotate provider keys

The agent calls every provider through AI Gateway (`cloudie-assistant`) and authenticates to the gateway with the
Worker secret `CF_AIG_TOKEN`. The provider keys themselves live in one of two places:

| Where                                                                                                | Rotate by                                                                           |
| ---------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| AI Gateway stored keys (BYOK, "bring your own key"): the preferred place                             | Dashboard: **AI → AI Gateway → cloudie-assistant → Provider keys**, replace the key |
| Secrets on the agent Worker `cloudie-agent`: `ANTHROPIC_API_KEY`, `OPENAI_API_KEY`, `GOOGLE_API_KEY` | `./cli.sh set-agent-secret ANTHROPIC_API_KEY` (runs `wrangler secret put`)          |

A Worker secret wins over the gateway's stored key when both exist. Both take effect on the next request, with no
deploy. To rotate `CF_AIG_TOKEN` itself, create a new token in the gateway's **Settings → Authentication**, run
`./cli.sh set-agent-secret CF_AIG_TOKEN`, then delete the old token. With neither a gateway token nor the
provider's own key, the assistant answers with its fallback message ("Sorry, something went wrong on our side…").

## Edit and publish the knowledge base

The full guide is [`knowledge/README.md`](../../knowledge/README.md): file format, statuses (`published`,
`anonymous`, `reference`, `draft`, `excluded`, `never_disclose`), what `pnpm kb:check` enforces, and publishing.
In short:

1. Edit or add a file in `knowledge/case-studies/`, or `knowledge/instructions.md` (the system prompt).
2. `./cli.sh kb-check` until it passes, then open a pull request; CI runs the same check.
3. Merging to `main` publishes it (`.github/workflows/kb.yml`). `./cli.sh kb-publish` does the same by hand.
4. Within a minute, `/api/health` shows the new `kbVersion`.

## Roll back

Every published version stays in the R2 bucket `cloudie-kb` under `kb/<version>/`. Run `./cli.sh ai-config`,
set `kbVersion` to the earlier version (printed by that publish, or in its CI log) and save. Revert the change in
Git too, or the next merge publishes it again. A code rollback is separate: see
[Deploy → Rolling back](../operations/deploy.md#rolling-back).

## Embed in HubSpot

Add an HTML or embed module to the gated HubSpot page with:

```html
<iframe
  src="https://<domain>/chat"
  style="width:100%;height:700px;border:0"
  allow="clipboard-write"
></iframe>
```

`<domain>` is the Pages address (`cloudie.pages.dev`) or a custom domain. Two settings must name the HubSpot page:

| Setting                                | Why                                                                | Where                        |
| -------------------------------------- | ------------------------------------------------------------------ | ---------------------------- |
| `frame-ancestors` in the `/chat` CSP   | The browser refuses to show the page in a frame from anywhere else | `web/static/_headers`        |
| `hubspot_domains` (Terraform variable) | The Turnstile widget runs only on hostnames it lists               | `backend/infra/variables.tf` |

`ALLOWED_ORIGINS` stays the chat page's own address, never HubSpot's: inside the iframe the WebSocket's `Origin`
is the chat page's.

**TODO(user):** `frame-ancestors` currently allows `https://www.engaging.io`, `https://*.engaging.io`,
`https://*.hubspot.com` and `https://*.hs-sites.com`. Confirm the HubSpot page's real origin and narrow the list
to it.

## Costs

| Item            | Cost                                                                                                                                                       |
| --------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Cloudflare      | The Workers Paid plan, about $5 a month; at a sales team's volume Pages, Durable Objects, KV and R2 stay within its included usage, and AI Gateway is free |
| Model (default) | Per question, below. Almost all of it is the knowledge base sent as the system prompt                                                                      |

The knowledge base goes with every question, so the agent marks it for Anthropic prompt caching with a 1-hour TTL
(time to live): the first question writes it to the cache, and every question in the next hour, from any chat,
reads it from there for a fraction of the price. Each cache read resets the hour. OpenAI and Google cache
automatically.

For Claude Sonnet 5.5 with the knowledge base at about 154,000 tokens, at $2 / $10 per million input / output
tokens, $4 per million for a 1-hour cache write and $0.10 per million for a cache read (check Anthropic's pricing
page for current prices):

| Question                                   | Approximate cost |
| ------------------------------------------ | ---------------- |
| Cold: first in an hour (cache write)       | $0.61            |
| Warm: any other (cache read, short answer) | $0.03            |

A larger knowledge base costs proportionally more; `pnpm kb:check` prints its size.

### Reading AI Gateway analytics

Dashboard: **AI → AI Gateway → cloudie-assistant**.

| Tab       | Shows                                                                                             |
| --------- | ------------------------------------------------------------------------------------------------- |
| Analytics | Requests, tokens, estimated cost and errors over time, per provider and model                     |
| Logs      | Each model call: status, duration, tokens in and out, cost. Open one to see the request and reply |

A warm question shows most of its input tokens as cached; when nearly every call shows a cache write instead,
questions are more than an hour apart or the knowledge base changed. The agent Worker also logs one line per
answer, a JSON `usage` object with `in`, `cacheRead`, `cacheWrite`, `out` and `model`, visible in **Workers & Pages → cloudie-agent
→ Logs**. The gateway's rate limit (300 requests per 60 s) is a ceiling on spend; errors with status 429 there
mean it was reached.

## Content review needed

`pnpm kb:check` guarantees that never-disclose names and anonymous clients' real names are not uploaded. It cannot
judge whether other details give a client away, or whether a draft says too much. A content owner should review:

| File in `knowledge/case-studies/`                                                                          | What to check                                                                                            |
| ---------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| `a-nsw-government-entity-managing-cemetery-and-memorial.md`                                                | The entity's history (when and why it was set up, what it manages, place names) identifies it            |
| `a-luxury-hospitality-group-operating-a-hotel-restaurant-and.md`                                           | Its awards and farm details identify it                                                                  |
| `a-miami-based-stadium-and-its-major-sports-and.md`, `a-miami-based-stadium-its-motorsport-event-brand.md` | The mix of events (football team, motorsport event, tennis tournament, concerts) identifies the stadium  |
| `akolade.md`, `great-place-to-work.md` (`draft`)                                                           | The build strips results sections and quotes from drafts, but the summary paragraph still quotes metrics |

## Locally

The dev stack (`./cli.sh up`) runs the agent Worker with `MOCK_MODEL=echo` from `backend/agent/.dev.vars`
(copied from `.dev.vars.example` on first start): every answer is `echo: <your message>`, costs nothing and
needs no key. To try a real model, remove that line, add `CF_AIG_TOKEN` (or a provider key) and restart the
stack.

The local agent reads the local KV and R2 in `.wrangler/state`, which start empty: until a knowledge base is
published there it answers with the fallback message. `./cli.sh kb-publish-local` builds `knowledge/` and
writes it there (`scripts/kb/publish.sh --local`; no account, never `--remote`). `./cli.sh e2e` runs it before
every run, so the chat test (`e2e/tests/chat.spec.ts`: send `hi`, expect `echo: hi`, reload, expect it again
from the stored history) always has one. Turnstile uses its always-pass test keys, so the browser and the API
need internet access.
