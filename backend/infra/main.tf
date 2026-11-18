# The Cloudflare pieces the project runs on. backend/infra/README.md explains each one.
# Terraform owns the *containers* (the Pages project, domains, DNS; later databases and buckets);
# Wrangler ships the *contents* (code, secrets, migrations). See "Who does what" in the README.

# ── Website and API ───────────────────────────────────────────────────────

resource "cloudflare_pages_project" "web" {
  account_id        = var.account_id
  name              = var.pages_project_name
  production_branch = var.production_branch

  lifecycle {
    # Bindings, compatibility date and secrets come from backend/api/wrangler.toml and
    # `wrangler pages secret put` on every deploy. Terraform leaving them alone keeps one
    # source of truth and keeps secret values out of the state file.
    ignore_changes = [deployment_configs, build_config]
  }
}

# ── Custom domains (only when zone_name and custom_domains are set) ───────

data "cloudflare_zone" "main" {
  count = var.zone_name == "" ? 0 : 1
  filter = {
    name = var.zone_name
  }
}

resource "cloudflare_pages_domain" "web" {
  for_each = var.custom_domains

  account_id   = var.account_id
  project_name = cloudflare_pages_project.web.name
  name         = each.value
}

# Each custom domain points at the project's pages.dev address, proxied (orange cloud).
resource "cloudflare_dns_record" "web" {
  for_each = var.custom_domains

  zone_id = data.cloudflare_zone.main[0].zone_id
  name    = each.value
  type    = "CNAME"
  content = cloudflare_pages_project.web.subdomain
  proxied = true
  ttl     = 1
  comment = "Pages project ${cloudflare_pages_project.web.name} (Terraform)"
}

# ── Sales assistant (agent Worker in backend/agent) ───────────────────────
# Terraform creates the containers; `wrangler deploy` in backend/agent ships the code and binds them.
# `./cli.sh infra-sync` copies the IDs below into backend/agent/wrangler.toml.

# The assistant's runtime config (key `config`: model, kbVersion, ...). Contents are written by
# `./cli.sh ai-config` and `./cli.sh kb-publish`, never by Terraform.
resource "cloudflare_workers_kv_namespace" "config" {
  account_id = var.account_id
  title      = "cloudie-config"
}

# The published knowledge base (kb/<version>/...). Private; prevent_destroy protects the uploaded content.
resource "cloudflare_r2_bucket" "kb" {
  account_id = var.account_id
  name       = "cloudie-kb"

  lifecycle {
    prevent_destroy = true
  }
}

# Proxy, cache and log for the model calls. The agent Worker authenticates with the Worker secret CF_AIG_TOKEN
# (`./cli.sh set-agent-secret`); `authentication = true` rejects calls without it. Gateway limit: 300 requests
# per 60 s (sliding window) across all chats.
resource "cloudflare_ai_gateway" "assistant" {
  account_id = var.account_id
  id         = "cloudie-assistant"

  collect_logs               = true
  cache_ttl                  = 0
  cache_invalidate_on_update = false
  rate_limiting_limit        = 300
  rate_limiting_interval     = 60
  rate_limiting_technique    = "sliding"
  authentication             = true
}

# The invisible bot check on the chat page. It runs where the chat page is served; hubspot_domains covers any
# HubSpot page address that needs it too.
resource "cloudflare_turnstile_widget" "chat" {
  account_id = var.account_id
  name       = "cloudie-chat"
  mode       = "invisible"
  domains    = concat([cloudflare_pages_project.web.subdomain], sort(tolist(var.custom_domains)), var.hubspot_domains)
}

# ── Add more here as the project grows, e.g. ──────────────────────────────
#
# resource "cloudflare_d1_database" "main" {
#   account_id = var.account_id
#   name       = "cloudie-db"
#   read_replication = { mode = "disabled" }
#   lifecycle { prevent_destroy = true }
# }
#
# resource "cloudflare_r2_bucket" "files" {
#   account_id = var.account_id
#   name       = "cloudie-files"
#   lifecycle { prevent_destroy = true }
# }
#
# Then add the binding to backend/api/wrangler.toml and its permission to scripts/tokens.sh.
