/**
 * app/api/nft/mint/route.ts
 * POST /api/nft/mint
 *
 * Minte un NFT ERC-721 sur Polygon pour un produit KATRYA.
 * Utilise ethers.js + Alchemy (stack 100% gratuit).
 *
 * Body JSON attendu :
 * {
 *   productId: string      // UUID Supabase du produit
 *   katryaId: string       // katrya_id (ex: KTR-0042)
 *   brand: string
 *   modelName: string
 *   category: string
 *   status: string
 *   description?: string
 *   imageUrl?: string      // URL image principale
 *   recipientAddress?: string  // wallet admin par défaut si absent
 * }
 *
 * Réponse JSON :
 * { success, tokenId, transactionHash, contractAddress, chain, error? }
 */

import { NextRequest, NextResponse } from 'next/server'
import { mintKatryaNFT, buildNFTMetadata, metadataToDataURI, checkNFTConfig } from '@/lib/nft'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
  try {
    // --- Vérification config ---
    const config = checkNFTConfig()
    if (!config.ok) {
      return NextResponse.json(
        { success: false, error: `Configuration manquante: ${config.missing.join(', ')}` },
        { status: 500 }
      )
    }

    // --- Lecture du body ---
    const body = await request.json()
    const {
      productId,
      katryaId,
      brand,
      modelName,
      category,
      status,
      description,
      imageUrl,
      recipientAddress,
    } = body

    if (!productId || !katryaId || !brand || !modelName || !category) {
      return NextResponse.json(
        { success: false, error: 'Champs obligatoires manquants: productId, katryaId, brand, modelName, category' },
        { status: 400 }
      )
    }

    // --- Vérification doublons ---
    const { data: existing } = await supabase
      .from('nft_certificates')
      .select('token_id, transaction_hash')
      .eq('product_id', productId)
      .single()

    if (existing) {
      return NextResponse.json({
        success: true,
        tokenId: existing.token_id,
        transactionHash: existing.transaction_hash,
        message: 'NFT déjà minté pour ce produit',
      })
    }

    // --- Construction métadonnées ---
    const metadata = buildNFTMetadata({
      katrya_id: katryaId,
      brand,
      model_name: modelName,
      category,
      status: status || 'authentic',
      description,
      imageUrl,
    })

    const tokenURI = metadataToDataURI(metadata)

    // --- Mint NFT ---
    const recipient = recipientAddress || process.env.KATRYA_ADMIN_WALLET_ADDRESS!

    const result = await mintKatryaNFT({
      recipientAddress: recipient,
      tokenURI,
      metadata,
    })

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 500 }
      )
    }

    // --- Sauvegarde en base ---
    const { error: dbError } = await supabase
      .from('nft_certificates')
      .insert({
        product_id: productId,
        katrya_id: katryaId,
        token_id: result.tokenId?.toString(),
        transaction_hash: result.transactionHash,
        contract_address: process.env.KATRYA_NFT_CONTRACT_ADDRESS,
        chain: 'polygon',
        token_uri: tokenURI,
        owner_address: recipient,
        metadata: metadata,
        status: 'minted',
      })

    if (dbError) {
      console.error('[NFT Mint] DB error:', dbError)
      // NFT minté mais non sauvegardé — on retourne quand même le succès
    }

    return NextResponse.json({
      success: true,
      tokenId: result.tokenId?.toString(),
      transactionHash: result.transactionHash,
      contractAddress: process.env.KATRYA_NFT_CONTRACT_ADDRESS,
      chain: 'polygon',
    })

  } catch (error) {
    console.error('[NFT Mint] Unexpected error:', error)
    return NextResponse.json(
      { success: false, error: 'Erreur serveur inattendue' },
      { status: 500 }
    )
  }
}
