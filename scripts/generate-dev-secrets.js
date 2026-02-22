#!/usr/bin/env node

/**
 * Generate local development secrets for SHINJU DATE
 *
 * Since Supabase is now managed by the Supabase CLI (`pnpm exec supabase start`),
 * the JWT secret and API keys are fixed defaults provided by the CLI and do NOT
 * need to be generated here.  This script only generates the random token used
 * by the local Upstash-compatible Redis HTTP proxy (serverless-redis-http).
 *
 * Outputs the generated values to stdout so they can be appended / merged into
 * config/dev-secrets.env as needed.
 *
 * Usage:
 *   node scripts/generate-dev-secrets.js
 *   pnpm dev:generate-secrets
 */

/**
 * Convert Uint8Array to base64url string using Web APIs
 * @param {Uint8Array} bytes - Bytes to encode
 * @returns {string} Base64url encoded string
 */
function toBase64url(bytes) {
  const binString = String.fromCharCode(...bytes)
  const base64 = btoa(binString)
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
}

/**
 * Generate a random token for Upstash Redis REST API
 * @returns {string} Random token as base64url string
 */
function generateUpstashToken() {
  const bytes = new Uint8Array(32)
  crypto.getRandomValues(bytes)
  return toBase64url(bytes)
}

/**
 * Main function to generate and output all keys
 */
async function main() {
  const upstashToken = generateUpstashToken()

  console.log('# Upstash Redis REST API token')
  console.log(`UPSTASH_REDIS_REST_TOKEN=${upstashToken}`)
  console.log(`SRH_TOKEN=${upstashToken}`)
}

// Only run main if this file is being executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error('Error generating keys:', error)
    process.exit(1)
  })
}
