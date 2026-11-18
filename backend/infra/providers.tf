# The provider reads CLOUDFLARE_API_TOKEN from the environment (scripts/tf.sh sets it),
# so no credential is ever written in a .tf file or in the state.
provider "cloudflare" {}
