variable "account_id" {
  description = "Cloudflare account ID. scripts/tf.sh sets it from CLOUDFLARE_ACCOUNT_ID."
  type        = string

  validation {
    condition     = can(regex("^[0-9a-f]{32}$", var.account_id))
    error_message = "account_id must be the 32-character hex account ID from the Cloudflare dashboard."
  }
}

variable "pages_project_name" {
  description = "Pages project name. Also the free address: <name>.pages.dev. Must match `name` in backend/api/wrangler.toml."
  type        = string
  default     = "cloudie"
}

variable "production_branch" {
  description = "Deployments to this branch go to production; any other branch becomes a preview."
  type        = string
  default     = "main"
}

variable "zone_name" {
  description = "The DNS zone (domain) in this account that custom_domains belong to, e.g. example.com. Empty: no custom domain, the site is only on <name>.pages.dev."
  type        = string
  default     = ""
}

variable "custom_domains" {
  description = "Domains that serve the site, e.g. [\"app.example.com\"]. Each must be zone_name or a subdomain of it."
  type        = set(string)
  default     = []

  validation {
    condition     = alltrue([for d in var.custom_domains : var.zone_name != "" && (d == var.zone_name || endswith(d, ".${var.zone_name}"))])
    error_message = "Set zone_name, and make every custom domain zone_name itself or a subdomain of it."
  }
}

variable "hubspot_domains" {
  description = "HubSpot page hostnames that may show the chat, e.g. [\"www.example.com\"]. Added to the Turnstile widget's allowed domains only; they are not chat origins."
  type        = list(string)
  default     = []
}
