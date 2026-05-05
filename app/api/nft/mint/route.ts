/**
 * app/api/nft/mint/route.ts
 * POST /api/nft/mint
 *
 * Minte un NFT ERC-721 sur Polygon pour un produit KATRYA.
 * Appelé depuis l'admin lors de la création / validation d'un produit.
 *
 * Body JSON attendu :
 * {
 *   productId: string     // UUID Supabase du produit
 *   katryaId: string      // katrya_id (ex: KTR-0042)
 *   brand: string
 *   modelName: string
 *   category: string
 *   status: string
 *   description?: string
 *   imageUrl?: string     // URL image principale
 *   recipientAddress?: string  // wallet admin par défaut si absent
 * }
 *
 * Réponse JSON :
 * { success, tokenId, transactionHash, contractAddress, chain, error? }
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { buildNFTMetadata, THIRDWEB_CONFIG, type MintResult } from '@/lib/thirdweb'

export async function POST(req: NextRequest): Promise<NextResponse<MintResult>> {
  // 1. Vérification admin
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ success: false, error: 'Non autorisé' }, { status: 401 })
  }

  // 2. Parse body
  let body: any
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ success: false, error: 'Body JSON invalide' }, { status: 400 })
  }

  const { productId, katryaId, brand, modelName, category, status, description, imageUrl, recipientAddress } = body

  if (!productId || !katryaId || !brand || !modelName) {
    return NextResponse.json({ success: false, error: 'Champs requis manquants' }, { status: 400 })
  }

  // 3. Vérifier que le produit n'a pas déjà un NFT
  const { data: existing } = await supabase
    .from('products')
    .select('nft_token_id')
    .eq('id', productId)
    .single()

  if (existing?.nft_token_id) {
    return NextResponse.json({
      success: false,
      error: 'Ce produit possède déjà un NFT (token #' + existing.nft_token_id + ')'
    }, { status: 409 })
  }

  // 4. Vérifier la configuration Thirdweb
  if (!THIRDWEB_CONFIG.secretKey || !THIRDWEB_CONFIG.contractAddress || !THIRDWEB_CONFIG.adminPrivateKey) {
    return NextResponse.json({
      success: false,
      error: 'Configuration Thirdweb manquante. Vérifiez les variables d\'environnement : THIRDWEB_SECRET_KEY, THIRDWEB_CONTRACT_ADDRESS, KATRYA_ADMIN_PRIVATE_KEY'
    }, { status: 503 })
  }

  // 5. Construire les métadonnées NFT
  const metadata = buildNFTMetadata({
    katrya_id: katryaId,
    brand,
    model_name: modelName,
    category: category ?? 'unknown',
    status: status ?? 'available',
    description: description ?? null,
    imageUrl: imageUrl ?? null,
  })

  // 6. Mint via Thirdweb SDK (import dynamique pour éviter le bundle côté client)
  try {
    // Import dynamique du SDK Thirdweb (server-side uniquement)
    const { ThirdwebSDK } = await import('@thirdweb-dev/sdk')

    const sdk = ThirdwebSDK.fromPrivateKey(
      THIRDWEB_CONFIG.adminPrivateKey,
      'polygon',
      { secretKey: THIRDWEB_CONFIG.secretKey }
    )

    const contract = await sdk.getContract(THIRDWEB_CONFIG.contractAddress, 'nft-collection')

    // Mint vers l'adresse spécifiée (client) ou le wallet admin KATRYA par défaut
    const mintTo = recipientAddress || await sdk.wallet.getAddress()

    const tx = await contract.mintTo(mintTo, {
      name: metadata.name,
      description: metadata.description,
      image: metadata.image,
      attributes: metadata.attributes,
    })

    const tokenId = tx.id.toString()
    const transactionHash = tx.receipt.transactionHash

    // 7. Sauvegarder le token ID en base Supabase
    const { error: updateError } = await supabase
      .from('products')
      .update({
        nft_token_id: tokenId,
        nft_contract_address: THIRDWEB_CONFIG.contractAddress,
        nft_chain: 'polygon',
      })
      .eq('id', productId)

    if (updateError) {
      console.error('[nft/mint] Supabase update error:', updateError)
      // Le NFT est minté mais l'update a échoué : on retourne quand même le succès
      // avec un warning pour que l'admin puisse corriger manuellement
      return NextResponse.json({
        success: true,
        tokenId,
        transactionHash,
        contractAddress: THIRDWEB_CONFIG.contractAddress,
        chain: 'polygon',
        error: 'NFT minté avec succès mais la mise à jour Supabase a échoué. TokenID: ' + tokenId,
      })
    }

    return NextResponse.json({
      success: true,
      tokenId,
      transactionHash,
      contractAddress: THIRDWEB_CONFIG.contractAddress,
      chain: 'polygon',
    })

  } catch (err: any) {
    console.error('[nft/mint] Mint error:', err)
    return NextResponse.json({
      success: false,
      error: err?.message ?? 'Erreur lors du mint NFT',
    }, { status: 500 })
  }
}
