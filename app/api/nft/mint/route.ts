/**
 * app/api/nft/mint/route.ts
 * POST /api/nft/mint
 *
 * Minte un NFT ERC-721 sur Polygon pour un produit KATRYA.
 * Utilise ethers.js + Alchemy (stack 100% gratuit).
 *
 * ACCES : admin connecte uniquement (chaque appel depense du gas reel).
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
 *   recipientAddress?: string  // wallet admin par defaut si absent
 * }
 *
 * Reponse JSON :
 * { success, dbSaved, tokenId, transactionHash, contractAddress, chain, error? }
 */

import { NextRequest, NextResponse } from 'next/server'
import { ethers } from 'ethers'
import { mintKatryaNFT, buildNFTMetadata, metadataToDataURI, checkNFTConfig } from '@/lib/nft'
import { requireAdminApi } from '@/lib/api-auth'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
  try {
    // --- Auth : admin connecte uniquement ---
    const auth = await requireAdminApi()
    if (!auth.ok) {
      return NextResponse.json(
        { success: false, error: auth.error },
        { status: auth.status }
      )
    }

    // --- Verification config ---
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

    // --- Destinataire : valide avant toute depense de gas ---
    const recipient = recipientAddress || process.env.KATRYA_ADMIN_WALLET_ADDRESS
    if (!recipient || !ethers.isAddress(recipient)) {
      return NextResponse.json(
        { success: false, error: 'Adresse destinataire absente ou invalide' },
        { status: 400 }
      )
    }

    // --- Le produit doit exister (evite un mint sur un UUID arbitraire) ---
    const { data: product } = await supabase
      .from('products')
      .select('id, katrya_id')
      .eq('id', productId)
      .maybeSingle()

    if (!product || product.katrya_id !== katryaId) {
      return NextResponse.json(
        { success: false, error: 'Produit introuvable ou katryaId incoherent' },
        { status: 404 }
      )
    }

    // --- Verification doublons ---
    const { data: existing } = await supabase
      .from('nft_certificates')
      .select('token_id, transaction_hash')
      .eq('product_id', productId)
      .maybeSingle()

    if (existing) {
      return NextResponse.json({
        success: true,
        dbSaved: true,
        tokenId: existing.token_id,
        transactionHash: existing.transaction_hash,
        message: 'NFT deja minte pour ce produit',
      })
    }

    // --- Construction metadonnees ---
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
    const result = await mintKatryaNFT(recipient, metadata)

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
        contract_address: process.env.NFT_CONTRACT_ADDRESS,
        chain: 'polygon',
        token_uri: tokenURI,
        owner_address: recipient,
        metadata: metadata,
        status: 'minted',
      })

    if (dbError) {
      // NFT minte on-chain mais non sauvegarde : on remonte l'alerte a l'admin
      // au lieu de l'avaler, avec le hash pour pouvoir rattraper manuellement.
      console.error('[NFT Mint] DB error:', dbError)
      return NextResponse.json({
        success: true,
        dbSaved: false,
        tokenId: result.tokenId?.toString(),
        transactionHash: result.transactionHash,
        contractAddress: process.env.NFT_CONTRACT_ADDRESS,
        chain: 'polygon',
        message: `ALERTE : NFT minte on-chain mais NON enregistre en base (${dbError.message}). Notez le tx hash.`,
      })
    }

    return NextResponse.json({
      success: true,
      dbSaved: true,
      tokenId: result.tokenId?.toString(),
      transactionHash: result.transactionHash,
      contractAddress: process.env.NFT_CONTRACT_ADDRESS,
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
