/**
 * app/api/nft/transfer/route.ts
 * POST /api/nft/transfer
 *
 * Transfère le NFT d'un produit KATRYA vers le wallet d'un client.
 * Utilise ethers.js + Alchemy (stack 100% gratuit).
 *
 * Body JSON attendu :
 * {
 *   productId: string      // UUID Supabase du produit
 *   toAddress: string      // adresse wallet du client
 * }
 *
 * Réponse JSON :
 * { success, transactionHash, error? }
 */

import { NextRequest, NextResponse } from 'next/server'
import { transferKatryaNFT, checkNFTConfig } from '@/lib/nft'
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
    const { productId, toAddress } = body

    if (!productId || !toAddress) {
      return NextResponse.json(
        { success: false, error: 'Champs obligatoires manquants: productId, toAddress' },
        { status: 400 }
      )
    }

    // --- Récupération du NFT en base ---
    const { data: nft, error: fetchError } = await supabase
      .from('nft_certificates')
      .select('token_id, owner_address, status')
      .eq('product_id', productId)
      .single()

    if (fetchError || !nft) {
      return NextResponse.json(
        { success: false, error: 'NFT introuvable pour ce produit. Mintez-le d\'abord.' },
        { status: 404 }
      )
    }

    if (nft.owner_address?.toLowerCase() === toAddress.toLowerCase()) {
      return NextResponse.json({
        success: true,
        message: 'Le wallet est déjà propriétaire de ce NFT',
      })
    }

    // --- Transfert NFT ---
    const result = await transferKatryaNFT({
      tokenId: parseInt(nft.token_id),
      toAddress,
    })

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 500 }
      )
    }

    // --- Mise à jour en base ---
    const { error: updateError } = await supabase
      .from('nft_certificates')
      .update({
        owner_address: toAddress,
        status: 'transferred',
        updated_at: new Date().toISOString(),
      })
      .eq('product_id', productId)

    if (updateError) {
      console.error('[NFT Transfer] DB update error:', updateError)
    }

    return NextResponse.json({
      success: true,
      transactionHash: result.transactionHash,
      toAddress,
    })

  } catch (error) {
    console.error('[NFT Transfer] Unexpected error:', error)
    return NextResponse.json(
      { success: false, error: 'Erreur serveur inattendue' },
      { status: 500 }
    )
  }
}
