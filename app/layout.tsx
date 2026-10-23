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
      <head>
        {/*
          Polices des chartes de marque (Archivo Narrow, Montserrat).
          Chargees en "display=swap" : si la feuille de style n'arrive pas, la
          page s'affiche immediatement dans la police de repli plutot que de
          rester blanche. Le passeport doit s'ouvrir vite apres un scan, parfois
          en reseau mobile degrade -- il ne doit jamais dependre d'une police.
        */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Archivo+Narrow:wght@500;600;700&family=Montserrat:wght@400;500;600&display=swap"
        />
      </head>
      <body>{children}</body>
    </html>
  )
}
