import { randomBytes } from 'crypto'

// Génère un identifiant KATRYA unique
// Format: KTRY-XXXXXXXXXXXX
const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'

export function generateKatryaId(): string {
  let result = ''
  const bytes = randomBytes(12)
  for (let i = 0; i < 12; i++) {
    result += ALPHABET[bytes[i] % ALPHABET.length]
  }
  return `KTRY-${result}`
}

// Génère un token unique pour le résolveur NFC
export function generateResolverToken(): string {
  return randomBytes(32).toString('hex')
}

// Construit l'URL du résolveur NFC à partir d'un token
export function buildResolverUrl(token: string): string {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://katrya-app.vercel.app'
  return `${baseUrl}/r/${token}`
}
