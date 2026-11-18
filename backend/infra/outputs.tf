output "pages_url" {
  description = "The free Cloudflare address of the site."
  value       = "https://${cloudflare_pages_project.web.subdomain}"
}

output "site_urls" {
  description = "Custom domains and their status (active once DNS and the certificate are ready)."
  value       = { for d, r in cloudflare_pages_domain.web : "https://${d}" => r.status }
}
