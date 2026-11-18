output "pages_url" {
  description = "The free Cloudflare address of the site."
  value       = "https://${cloudflare_pages_project.web.subdomain}"
}

output "site_urls" {
  description = "Custom domains and their status (active once DNS and the certificate are ready)."
  value       = { for d, r in cloudflare_pages_domain.web : "https://${d}" => r.status }
}

output "kv_config_id" {
  description = "ID of the CONFIG KV namespace; `./cli.sh infra-sync` writes it into backend/agent/wrangler.toml."
  value       = cloudflare_workers_kv_namespace.config.id
}

output "kb_bucket" {
  description = "Name of the knowledge-base R2 bucket (KB binding)."
  value       = cloudflare_r2_bucket.kb.name
}

output "ai_gateway_url" {
  description = "Base URL of the AI Gateway; written into backend/agent/wrangler.toml as AI_GATEWAY_URL."
  value       = "https://gateway.ai.cloudflare.com/v1/${var.account_id}/${cloudflare_ai_gateway.assistant.id}"
}

output "turnstile_sitekey" {
  description = "Public Turnstile sitekey: PUBLIC_TURNSTILE_SITEKEY at web build time (and the GitHub repository variable)."
  value       = cloudflare_turnstile_widget.chat.sitekey
}

output "turnstile_secret" {
  description = "Turnstile secret key. Never saved to a file: `terraform output -raw turnstile_secret`, then `./cli.sh set-secret TURNSTILE_SECRET`."
  value       = cloudflare_turnstile_widget.chat.secret
  sensitive   = true
}

output "chat_origins" {
  description = "Origins the chat page is served from (pages.dev and custom domains), comma-separated: ALLOWED_ORIGINS for the Pages project. HubSpot's address is not here."
  value       = join(",", [for d in concat([cloudflare_pages_project.web.subdomain], sort(tolist(var.custom_domains))) : "https://${d}"])
}
