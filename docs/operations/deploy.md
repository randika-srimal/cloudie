# Deploy to Cloudflare

## First time, on a new account

```bash
./cli.sh first-setup
```

The wizard runs these steps, each one skippable:

| Step                      | Action            | Creates                                                                             |
| ------------------------- | ----------------- | ----------------------------------------------------------------------------------- |
| 1. API tokens             | `tokens`          | Three tokens, saved to `.env.cloudflare` ([Credentials](#credentials))              |
| 2. Terraform state bucket | `infra-bootstrap` | Private R2 bucket `cloudie-tfstate`                                                 |
| 3. Infrastructure         | `infra-apply`     | Pages project `cloudie` (and custom domains, if set), KV, R2, AI Gateway, Turnstile |
| 4. Build and deploy       | `deploy-pages`    | The first production deployment at `https://cloudie.pages.dev`                      |
| 5. Health check           | `health`          | Nothing; checks `GET /api/health` answers                                           |

Prefer not to use Terraform? Skip steps 1–3, run `./cli.sh deploy-pages` with any token that has
**Pages Write**: Wrangler creates the project on the first deploy.

## Assistant secrets and variables (once)

After the first `infra-apply`, and before the first deploy (full commands in
[Infrastructure → Assistant resources](../../backend/infra/README.md#assistant-resources)):

| What                                             | Where                                      | How                                                           |
| ------------------------------------------------ | ------------------------------------------ | ------------------------------------------------------------- |
| `TURNSTILE_SECRET`                               | Pages secret                               | `./cli.sh set-secret TURNSTILE_SECRET`                        |
| `PASS_SECRET`                                    | Pages secret                               | `./cli.sh set-secret PASS_SECRET` (`openssl rand -base64 32`) |
| `CF_AIG_TOKEN` (AI Gateway token), provider keys | Secret on the agent Worker `cloudie-agent` | `./cli.sh set-agent-secret CF_AIG_TOKEN`                      |
| `PUBLIC_TURNSTILE_SITEKEY`                       | GitHub repository **variable** (CI only)   | The value of `pnpm tf output -raw turnstile_sitekey`          |

`./cli.sh deploy` reads the sitekey from Terraform itself. Production `ALLOWED_ORIGINS` (the chat page's own
addresses, never HubSpot's) is written into `backend/api/wrangler.toml` from the `chat_origins` output; commit it.
Secrets set on the agent Worker need the Worker to exist, so run `./cli.sh deploy-agent` once first. Then publish
the knowledge base (`./cli.sh kb-publish`): until a `kbVersion` is set the chat answers only with its fallback
message. Day-to-day operation (model, keys, HubSpot embed, costs) is in [The sales assistant](../guide/assistant.md).

## Every deploy

```bash
./cli.sh deploy
```

```mermaid
sequenceDiagram
  participant You
  participant CLI as ./cli.sh deploy
  participant TF as Terraform
  participant W as Wrangler
  participant CF as Cloudflare
  You->>CLI: deploy
  CLI->>TF: plan (backend/infra)
  TF-->>CLI: changes?
  CLI->>You: apply them? (only if any)
  CLI->>CLI: write Terraform IDs into the wrangler.toml files
  CLI->>W: wrangler deploy (backend/agent)
  W->>CF: upload the agent Worker
  CLI->>W: pnpm build, pages deploy web/build
  W->>CF: upload static files + Functions
  CLI->>CF: GET /api/health
```

Infrastructure goes first, so code never goes out before what it depends on, and the agent Worker goes before
Pages because the Pages project's `AGENT` service binding needs that Worker to exist. A preview, at its own address with
production untouched: `./cli.sh deploy-preview`.

## From GitHub Actions

`.github/workflows/ci.yml` has a `deploy` job that runs after the checks on every push to `main`. It deploys
code only (no Terraform, which needs the admin token): the agent Worker, then Pages. It uses the IDs committed in
the `wrangler.toml` files, so run `./cli.sh deploy` locally (and commit) after infrastructure changes. To turn it on:

1. `./cli.sh deploy-token` and save it as the repository **secret** `CLOUDFLARE_API_TOKEN`.
2. Repository **variables**: `CLOUDFLARE_ACCOUNT_ID`, `PUBLIC_TURNSTILE_SITEKEY` (from the `turnstile_sitekey`
   output) and `DEPLOY_ENABLED` = `true`.

## Credentials

`./cli.sh tokens` makes three API tokens from one temporary token, so nobody clicks through permission lists:

| Token                     | Can                                                                                                                                         | Used by                  |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------ |
| `cloudie-terraform-admin` | Everything on the account except managing tokens                                                                                            | Terraform                |
| `cloudie-terraform-state` | Read and write the state bucket only (as an S3 key pair)                                                                                    | Terraform's backend      |
| `cloudie-deploy`          | `Account Settings Read`, `Pages Write`, `Workers Scripts Write`, `Workers KV Storage Write`, `Workers R2 Storage Write`, `AI Gateway Write` | Wrangler, GitHub Actions |

1. In the dashboard: **My Profile → API Tokens → Create Token**, template **Create Additional Tokens**,
   create it and copy it.
2. `./cli.sh tokens`, paste it. The tokens expire in a year; run it again to rotate (it offers to delete the old
   ones and the temporary token).

All of them land in `.env.cloudflare`, which Git and Docker builds ignore. Never commit it.

## Custom domain

The domain must be a zone in the same Cloudflare account. In `backend/infra/variables.tf` (or a
`terraform.auto.tfvars`):

```hcl
zone_name      = "example.com"
custom_domains = ["app.example.com"]
```

`./cli.sh infra-apply` adds the domain to the Pages project and its DNS record. `./cli.sh infra-output` shows
when it is active (usually a few minutes, for the certificate).

## Rolling back

Pages keeps every deployment. In the dashboard: **Workers & Pages → cloudie → Deployments**, pick an earlier one,
**Rollback to this deployment**. `./cli.sh deployments` lists them. The agent Worker keeps its versions too
(**Workers & Pages → cloudie-agent → Deployments**), and a knowledge base is rolled back by its `kbVersion`
([The sales assistant → Roll back](../guide/assistant.md#roll-back)).
