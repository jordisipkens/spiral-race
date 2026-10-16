// Password hashing for team passwords (Node runtime only, not usable in middleware)
import { scrypt, randomBytes, timingSafeEqual, createHash } from 'crypto'
import { promisify } from 'util'

const scryptAsync = promisify(scrypt)
const KEY_LENGTH = 64

// Format: scrypt$<salt hex>$<hash hex>
export async function hashPassword(password) {
  const salt = randomBytes(16).toString('hex')
  const hash = await scryptAsync(password, salt, KEY_LENGTH)
  return `scrypt$${salt}$${hash.toString('hex')}`
}

export async function verifyPassword(password, stored) {
  const [scheme, salt, hashHex] = (stored || '').split('$')
  if (scheme !== 'scrypt' || !salt || !hashHex) return false

  const expected = Buffer.from(hashHex, 'hex')
  const actual = await scryptAsync(password, salt, expected.length)
  return timingSafeEqual(actual, expected)
}

// Constant-time comparison for plain secrets such as ADMIN_PASSWORD
export function safeEqual(a, b) {
  const hashA = createHash('sha256').update(String(a)).digest()
  const hashB = createHash('sha256').update(String(b)).digest()
  return timingSafeEqual(hashA, hashB)
}
