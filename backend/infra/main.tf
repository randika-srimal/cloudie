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
