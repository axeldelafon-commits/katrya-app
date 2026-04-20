import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'KATRYA — Authentification NFC',
  description: 'Passeport numérique pour produits authentifiés KATRYA',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  )
}
