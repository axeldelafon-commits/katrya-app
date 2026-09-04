/**
 * app/api/nft/metadata/by-katrya-id/[katryaId]/route.ts
 * GET /api/nft/metadata/by-katrya-id/:katryaId
 *
 * Metadonnees ERC-721 servies en direct depuis Supabase.
 *
 * C'est cette URL qui est gravee on-chain comme tokenURI au moment du mint :
 * le katrya_id est connu avant le mint (contrairement au tokenId, attribue par
 * le contrat), et les metadonnees restent modifiables a vie — une photo ajoutee
 * ou un changement de statut se refletent immediatement sur OpenSea.
 */
import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function GET(
  _request: NextRequest,
  { params }: { params: { katryaId: string } }
) {
  const { katryaId } = params

  if (!katryaId) {
    return NextResponse.json({ error: 'katryaId manquant' }, { status: 400 })
  }

  const supabase = createServiceClient()

  const { data: product, error } = await supabase
    .from('products')
    .select('katrya_id, brand, model_name, category, status, product_images(url, position)')
    .eq('katrya_id', katryaId)
    .maybeSingle()

  if (error) {
    console.error('[metadata/by-katrya-id] Supabase error:', error.message)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }

  if (!product) {
    return NextResponse.json({ error: 'Produit non trouve' }, { status: 404 })
  }

  const { data: cert } = await supabase
    .from('nft_certificates')
    .select('token_id, chain, contract_address')
    .eq('katrya_id', katryaId)
    .maybeSingle()

  const baseUrl =
    process.env.APP_BASE_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    'https://katrya-app.vercel.app'

  const images = ((product as any).product_images || [])
    .slice()
    .sort((a: any, b: any) => (a.position ?? 0) - (b.position ?? 0))

  const attributes: Array<{ trait_type: string; value: string | number }> = [
    { trait_type: 'KATRYA ID', value: product.katrya_id },
    { trait_type: 'Marque', value: product.brand ?? '' },
    { trait_type: 'Modele', value: product.model_name ?? '' },
    { trait_type: 'Categorie', value: product.category ?? '' },
    { trait_type: 'Statut produit', value: product.status ?? '' },
    { trait_type: 'Blockchain', value: cert?.chain ?? 'polygon' },
  ]

  if (cert?.token_id !== undefined && cert?.token_id !== null) {
    attributes.push({ trait_type: 'Token ID', value: Number(cert.token_id) })
  }

  return NextResponse.json(
    {
      name: `${product.brand} ${product.model_name} — ${product.katrya_id}`,
      description: `Passeport numerique KATRYA certifie sur Polygon pour ${product.brand} ${product.model_name}. Authenticite garantie par puce NFC.`,
      image: images[0]?.url ?? '',
      external_url: `${baseUrl}/p/${product.katrya_id}`,
      background_color: '000000',
      attributes,
    },
    { headers: { 'Cache-Control': 'public, max-age=60, s-maxage=60' } }
  )
}
