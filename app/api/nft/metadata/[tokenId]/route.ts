/**
 * app/api/nft/metadata/[tokenId]/route.ts
 * GET /api/nft/metadata/:tokenId
 *
 * Retourne les métadonnées JSON ERC-721 pour un token KATRYA.
 * Compatible OpenSea / Polygonscan / tout marketplace NFT.
 *
 * Format de réponse :
 * {
 *   name: string,
 *   description: string,
 *   image: string,
 *   external_url: string,
 *   attributes: Array<{ trait_type: string; value: string | number }>
 * }
 */
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function GET(
  _request: NextRequest,
  { params }: { params: { tokenId: string } }
) {
  const { tokenId } = params

  if (!tokenId || isNaN(Number(tokenId))) {
    return NextResponse.json(
      { error: 'tokenId invalide' },
      { status: 400 }
    )
  }

  const supabase = createClient()

  // Récupère le certificat NFT et le produit associé
  const { data: cert, error } = await supabase
    .from('nft_certificates')
    .select(`
      token_id,
      katrya_id,
      contract_address,
      chain,
      owner_address,
      minted_at,
      status,
      products(
        katrya_id,
        brand,
        model_name,
        category,
        status,
        product_images(url, position)
      )
    `)
    .eq('token_id', tokenId)
    .maybeSingle()

  if (error) {
    console.error('[metadata] Supabase error:', error.message)
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    )
  }

  if (!cert) {
    return NextResponse.json(
      { error: 'Token non trouvé' },
      { status: 404 }
    )
  }

  const product = (cert as any).products
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://katrya-app.vercel.app'

  // Image principale du produit (position la plus basse)
  const sortedImages = (product?.product_images || [])
    .slice()
    .sort((a: any, b: any) => a.position - b.position)
  const imageUrl = sortedImages[0]?.url || `${baseUrl}/images/katrya-nft-default.png`

  // Construction des métadonnées ERC-721 standard
  const metadata = {
    name: `KATRYA Passport #${cert.token_id}`,
    description: product
      ? `Passeport numérique certifié blockchain pour ${product.brand} ${product.model_name}. Authenticité garantie par KATRYA NFC.`
      : `Passeport numérique KATRYA #${cert.token_id} certifié sur Polygon.`,
    image: imageUrl,
    external_url: `${baseUrl}/p/${cert.katrya_id}`,
    background_color: '000000',
    attributes: [
      {
        trait_type: 'KATRYA ID',
        value: cert.katrya_id || '',
      },
      {
        trait_type: 'Marque',
        value: product?.brand || 'KATRYA',
      },
      {
        trait_type: 'Modèle',
        value: product?.model_name || '',
      },
      {
        trait_type: 'Catégorie',
        value: product?.category || '',
      },
      {
        trait_type: 'Statut produit',
        value: product?.status || '',
      },
      {
        trait_type: 'Blockchain',
        value: cert.chain || 'polygon',
      },
      {
        trait_type: 'Token ID',
        value: Number(cert.token_id),
      },
      {
        trait_type: 'Contrat',
        value: cert.contract_address || '',
      },
      {
        display_type: 'date',
        trait_type: 'Date de certification',
        value: Math.floor(new Date(cert.minted_at).getTime() / 1000),
      },
    ].filter(attr => attr.value !== '' && attr.value !== undefined),
  }

  return NextResponse.json(metadata, {
    headers: {
      'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400',
      'Access-Control-Allow-Origin': '*',
    },
  })
}
