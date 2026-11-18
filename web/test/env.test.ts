import { describe, expect, it } from 'vitest';
import { variables } from '../src/env.ts';

const sitekey = variables.PUBLIC_TURNSTILE_SITEKEY;

async function validate(value: string | undefined) {
  return sitekey.schema['~standard'].validate(value);
}

describe('PUBLIC_TURNSTILE_SITEKEY', () => {
  it('is public and inlined at build time', () => {
    expect(sitekey.public).toBe(true);
    expect(sitekey.static).toBe(true);
  });

  it('uses the value that is set', async () => {
    expect(await validate('0x4AAAAAAAreal')).toEqual({ value: '0x4AAAAAAAreal' });
  });

  it("falls back to Turnstile's always-pass test key outside production", async () => {
    // Vitest runs with MODE=test; a production build without the value fails (checked in CI by the build).
    expect(await validate(undefined)).toEqual({ value: '1x00000000000000000000AA' });
  });
});
