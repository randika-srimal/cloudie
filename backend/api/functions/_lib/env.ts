// Everything the Functions can read from `env`: [vars] and bindings in backend/api/wrangler.toml,
// plus secrets (./cli.sh set-secret, or .dev.vars locally). Keep in step with wrangler.toml.
export interface Env {
  APP_VERSION: string;
}
