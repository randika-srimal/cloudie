# Terraform's memory of what it manages (the "state") lives in a private R2 bucket, not on one
# laptop. R2 speaks the S3 protocol, so the standard s3 backend works. use_lockfile stops two
# people applying at the same time.
#
# The endpoint and credentials depend on the account, so scripts/tf.sh passes them at
# `terraform init` time (partial configuration). The bucket itself is created once by
# `./cli.sh infra-bootstrap`; a configuration cannot safely manage the bucket that holds its own state.
terraform {
  backend "s3" {
    bucket       = "engaging-assistant-tfstate"
    key          = "engaging-assistant/terraform.tfstate"
    region       = "auto"
    use_lockfile = true

    # R2 is S3-compatible but not AWS: skip the AWS-only checks.
    skip_credentials_validation = true
    skip_region_validation      = true
    skip_requesting_account_id  = true
    skip_metadata_api_check     = true
    skip_s3_checksum            = true
    use_path_style              = true
  }
}
