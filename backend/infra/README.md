# Infrastructure (Terraform)

Terraform describes the Cloudflare resources this project needs, so a new account (or a second environment) is
one command away and every change shows up as a plan before it happens.

| File           | What                                                                                      |
| -------------- | ----------------------------------------------------------------------------------------- |
| `versions.tf`  | Terraform `~> 1.17`, Cloudflare provider `~> 5.29`                                        |
| `providers.tf` | The provider; it reads `CLOUDFLARE_API_TOKEN` from the environment                        |
| `backend.tf`   | Where the state lives: the private R2 bucket `cloudie-tfstate`                            |
| `variables.tf` | Project name, production branch, optional zone and custom domains                         |
| `main.tf`      | The Pages project, custom domains and their DNS records; commented examples for D1 and R2 |
| `outputs.tf`   | The `pages.dev` address and custom domain status                                          |

## Commands

All through the project CLI (they run `scripts/tf.sh` in the dev container, which fills in the credentials):

| Command                    | Does                                            | Needs an account |
| -------------------------- | ----------------------------------------------- | ---------------- |
| `./cli.sh tokens`          | Make the admin, state and deploy tokens         | yes              |
| `./cli.sh infra-bootstrap` | Create the state bucket (once per account)      | yes              |
| `./cli.sh infra-plan`      | Show what would change                          | yes              |
| `./cli.sh infra-apply`     | Make the changes, after showing the plan        | yes              |
| `./cli.sh infra-output`    | Addresses and status                            | yes              |
| `./cli.sh infra-check`     | `terraform fmt -check` and `terraform validate` | no               |

Anything else: `docker compose exec app pnpm tf <terraform command>`.

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
