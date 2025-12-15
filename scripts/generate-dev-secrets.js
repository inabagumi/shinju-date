#!/usr/bin/env node

/**
 * Generate Supabase development keys and Upstash token
 * Uses Web Crypto API (Node.js v24+)
 *
 * This script generates:
 * - SUPABASE_JWT_SECRET: Random 32-byte base64url-encoded secret
 * - SUPABASE_ANON_KEY: HS256 JWT with 'anon' role
 * - SUPABASE_SERVICE_ROLE_KEY: HS256 JWT with 'service_role' role
 * - UPSTASH_REDIS_REST_TOKEN: Random token for local development
 *
 * Outputs all keys to stdout which can be used directly in env_file
 *
 * Usage:
 *   node scripts/generate-dev-secrets.js > config/dev-secrets.env
 *   pnpm dev:generate-secrets > config/dev-secrets.env
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
 * Generate a random JWT secret as base64url string
 * @returns {string} 32-byte random secret encoded as base64url
 */
function generateJwtSecret() {
  const bytes = new Uint8Array(32)
  crypto.getRandomValues(bytes)
  return toBase64url(bytes)
}

/**
 * Create a Supabase JWT payload
 * @param {string} role - The role for this JWT ('anon' or 'service_role')
 * @returns {object} JWT payload object
 */
function makeSupabasePayload(role) {
  const iat = Math.floor(Date.now() / 1000)
  const exp = iat + 5 * 365 * 24 * 60 * 60

  return {
    exp,
    iat,
    iss: 'supabase',
    role,
  }
}

/**
 * Base64url encode a string
 * @param {string} str - String to encode
 * @returns {string} Base64url encoded string
 */
function base64urlEncodeString(str) {
  const encoder = new TextEncoder()
  return toBase64url(encoder.encode(str))
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
 * Sign a JWT using HS256 (HMAC-SHA256)
 * @param {object} payload - JWT payload object
 * @param {string} secret - Raw secret string
 * @returns {Promise<string>} Signed JWT token
 */
async function signHs256(payload, secret) {
  // Encode the raw secret string as bytes (no base64 decoding)
  const secretBytes = new TextEncoder().encode(secret)

  // Import the secret as a CryptoKey for HMAC
  const key = await crypto.subtle.importKey(
    'raw',
    secretBytes,
    { hash: 'SHA-256', name: 'HMAC' },
    false,
    ['sign'],
  )

  // Create JWT header
  const header = { alg: 'HS256', typ: 'JWT' }

  // Encode header and payload as base64url
  const encodedHeader = base64urlEncodeString(JSON.stringify(header))
  const encodedPayload = base64urlEncodeString(JSON.stringify(payload))

  // Create the signing input
  const signingInput = `${encodedHeader}.${encodedPayload}`
  const signingInputBytes = new TextEncoder().encode(signingInput)

  // Sign using HMAC-SHA256
  const signatureBytes = await crypto.subtle.sign(
    'HMAC',
    key,
    signingInputBytes,
  )

  // Encode signature as base64url
  const encodedSignature = toBase64url(new Uint8Array(signatureBytes))

  // Return complete JWT
  return `${signingInput}.${encodedSignature}`
}

/**
 * Main function to generate and output all keys
 */
async function main() {
  const jwtSecret = generateJwtSecret()

  const anonPayload = makeSupabasePayload('anon')
  const serviceRolePayload = makeSupabasePayload('service_role')

  const anonKey = await signHs256(anonPayload, jwtSecret)
  const serviceRoleKey = await signHs256(serviceRolePayload, jwtSecret)
  const upstashToken = generateUpstashToken()

  console.log('# Supabase dev keys')
  console.log(`SUPABASE_JWT_SECRET=${jwtSecret}`)
  console.log(`SUPABASE_ANON_KEY=${anonKey}`)
  console.log(`SUPABASE_SERVICE_ROLE_KEY=${serviceRoleKey}`)
  console.log()
  console.log(
    '# Supabase dev keys - alternative names (used by docker-compose services)',
  )
  console.log(`NEXT_PUBLIC_SUPABASE_ANON_KEY=${anonKey}`)
  console.log(`SUPABASE_SERVICE_KEY=${serviceRoleKey}`)
  console.log(`SUPABASE_ANON_JWT=${anonKey}`)
  console.log(`SUPABASE_SERVICE_ROLE_JWT=${serviceRoleKey}`)
  console.log(`JWT_SECRET=${jwtSecret}`)
  console.log(`GOTRUE_JWT_SECRET=${jwtSecret}`)
  console.log(`PGRST_JWT_SECRET=${jwtSecret}`)
  console.log(`PGRST_APP_SETTINGS_JWT_SECRET=${jwtSecret}`)
  console.log(`API_JWT_SECRET=${jwtSecret}`)
  console.log(`AUTH_JWT_SECRET=${jwtSecret}`)
  console.log(`ANON_KEY=${anonKey}`)
  console.log(`SERVICE_KEY=${serviceRoleKey}`)
  console.log()
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
