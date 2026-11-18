// See https://svelte.dev/docs/kit/types#app.d.ts
declare global {
  namespace App {
    // interface Error {}
    // interface Locals {}
    // interface PageData {}
    // interface PageState {}
    // interface Platform {}
  }

  // Vite exposes PUBLIC_* variables from the build environment (or web/.env) as import.meta.env.
  interface ImportMetaEnv {
    /** Turnstile sitekey for the chat page; set at build time from the Terraform output. */
    readonly PUBLIC_TURNSTILE_SITEKEY?: string;
  }
}

export {};
