# Which Terraform and which Cloudflare provider this configuration is written for.
# The exact provider build is locked in .terraform.lock.hcl (commit that file).

terraform {
  required_version = "~> 1.17"

  required_providers {
    cloudflare = {
      source  = "cloudflare/cloudflare"
      version = "~> 5.29"
    }
  }
}
