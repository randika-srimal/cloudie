# Infrastructure (Terraform)

Terraform describes the Cloudflare resources this project needs, so a new account (or a second environment) is
one command away and every change shows up as a plan before it happens.

| File           | What                                                                                                    |
| -------------- | ------------------------------------------------------------------------------------------------------- |
| `versions.tf`  | Terraform `~> 1.17`, Cloudflare provider `~> 5.29`                                                      |
| `providers.tf` | The provider; it reads `CLOUDFLARE_API_TOKEN` from the environment                                      |
| `backend.tf`   | Where the state lives: the private R2 bucket `cloudie-tfstate`                                          |
| `variables.tf` | Project name, production branch, optional zone, custom domains and HubSpot domains                      |
| `main.tf`      | The Pages project, custom domains and DNS records, and the assistant's KV, R2, AI Gateway and Turnstile |
| `outputs.tf`   | Addresses, and the IDs the assistant's code needs (see [Assistant resources](#assistant-resources))     |

## Commands

All through the project CLI (they run `scripts/tf.sh` in the dev container, which fills in the credentials):

| Command                       | Does                                             | Needs an account |
| ----------------------------- | ------------------------------------------------ | ---------------- |
| `./cli.sh tokens`             | Make the admin, state and deploy tokens          | yes              |
| `./cli.sh infra-bootstrap`    | Create the state bucket (once per account)       | yes              |
| `./cli.sh infra-plan`         | Show what would change                           | yes              |
| `./cli.sh infra-apply`        | Make the changes, after showing the plan         | yes              |
| `./cli.sh infra-output`       | Addresses and status                             | yes              |
| `./cli.sh infra-write-config` | Write the outputs into the `wrangler.toml` files | yes              |
| `./cli.sh infra-check`        | `terraform fmt -check` and `terraform validate`  | no               |

Anything else: `docker compose exec app pnpm tf <terraform command>`.

## Assistant resources

| Resource                                 | Name or ID          | Notes                                                                                                               |
| ---------------------------------------- | ------------------- | ------------------------------------------------------------------------------------------------------------------- |
| `cloudflare_workers_kv_namespace.config` | `cloudie-config`    | The agent's `CONFIG` binding; the contents are written by `./cli.sh ai-config` and `kb-publish`                     |
| `cloudflare_r2_bucket.kb`                | `cloudie-kb`        | The agent's `KB` binding; `prevent_destroy`                                                                         |
| `cloudflare_ai_gateway.assistant`        | `cloudie-assistant` | Logs on, no cache, 300 requests per 60 s (sliding), authenticated: the agent sends the Worker secret `CF_AIG_TOKEN` |
| `cloudflare_turnstile_widget.chat`       | `cloudie-chat`      | Invisible. Allowed domains: the `pages.dev` address, `custom_domains` and `hubspot_domains`                         |

`hubspot_domains` (a list, default empty) only widens the Turnstile widget; it never becomes a chat origin.

| Output              | Used for                                                                                                    |
| ------------------- | ----------------------------------------------------------------------------------------------------------- |
| `kv_config_id`      | `id` of the `CONFIG` namespace in `backend/agent/wrangler.toml`                                             |
| `ai_gateway_url`    | `AI_GATEWAY_URL` in `backend/agent/wrangler.toml`                                                           |
| `chat_origins`      | `ALLOWED_ORIGINS` for production in `backend/api/wrangler.toml` (`https://` + pages.dev and custom domains) |
| `kb_bucket`         | The bucket name (fixed to `cloudie-kb` in `wrangler.toml` and `scripts/kb/publish.sh`)                      |
| `turnstile_sitekey` | `PUBLIC_TURNSTILE_SITEKEY` for the web build (the deploy commands read it; CI needs a repository variable)  |
| `turnstile_secret`  | Sensitive. Becomes the Pages secret `TURNSTILE_SECRET` (below)                                              |

Lines tagged `# tf-sync` in the two `wrangler.toml` files are rewritten from these outputs by
`./cli.sh infra-write-config`, which `./cli.sh deploy` runs after its Terraform step. Commit the result; none of it
is secret.

`./cli.sh first-setup` sets all three once. Secrets never go through Terraform files or the state-reading
commands' output on screen; to set or rotate one by hand:

```bash
# Turnstile secret (Pages project). The value is read from the Terraform output, never written to a file:
docker compose exec -T app pnpm tf output -raw turnstile_secret   # copy it, then:
./cli.sh set-secret TURNSTILE_SECRET

# Chat cookie signing key (Pages project), any long random string:
openssl rand -base64 32   # copy it, then:
./cli.sh set-secret PASS_SECRET

# AI Gateway token: create it in the dashboard (AI → AI Gateway → cloudie-assistant → Settings → Authentication),
# then set it on the agent Worker, not on Pages:
./cli.sh set-agent-secret CF_AIG_TOKEN
```

The Turnstile widget's secret is also held in the Terraform state (the state bucket is private). The AI Gateway
token and provider keys are not in Terraform at all.

## Who does what

Terraform owns the **containers** (the project, domains, DNS, and later databases and buckets). Wrangler owns the
**contents** (code, secrets, migrations), and `backend/api/wrangler.toml` declares bindings. That is why
`cloudflare_pages_project` ignores `deployment_configs`: two tools never fight over the same setting, and secret
values never reach the state file.

## State

The state is Terraform's record of what exists. It lives in R2 (S3-compatible) so it is not tied to one laptop,
with a lock file so two applies can't overlap. The bucket is created by a plain API call in `infra-bootstrap`
because a configuration cannot safely manage the bucket holding its own state. Its S3 key pair comes from the
`cloudie-terraform-state` token, which can touch only that bucket.

## Credentials

See [Deploy → Credentials](../../docs/operations/deploy.md#credentials). Everything is read from
`.env.cloudflare`; nothing secret is written into a `.tf` file.

## Lock file

`.terraform.lock.hcl` pins the exact provider build. Commit it. After changing the provider version in
`versions.tf`, run `docker compose exec app pnpm tf init -upgrade` and commit the updated lock file.
