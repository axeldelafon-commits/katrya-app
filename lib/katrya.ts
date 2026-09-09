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

/**
 * Domaine de résolution des puces NFC.
 *
 * ATTENTION : cette URL est gravée physiquement et DÉFINITIVEMENT dans la puce
 * au moment de l'enrôlement. Une puce doit continuer à résoudre pendant des
 * décennies, bien après que le site marketing ait été refait ou que l'hébergeur
 * ait changé. Elle doit donc pointer vers un domaine stable dédié au passeport
 * (ex: id.katrya.fr), jamais vers l'URL de déploiement de l'app.
 *
 * PASSPORT_BASE_URL est volontairement séparée de APP_BASE_URL pour cette raison :
 * l'app peut déménager, le domaine des puces non.
 */
export function getPassportBaseUrl(): string {
  const base =
    process.env.PASSPORT_BASE_URL ||
    process.env.APP_BASE_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    'https://katrya-app.vercel.app'
  return base.trim().replace(/\/+$/, '')
}

// Construit l'URL du résolveur NFC à partir d'un token
export function buildResolverUrl(token: string): string {
  return `${getPassportBaseUrl()}/r/${token}`
}
