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
