/**
 * app/api/nft/transfer/route.ts
 * POST /api/nft/transfer
 *
 * Transfère le NFT d'un produit KATRYA vers le wallet d'un client.
 * Appelé automatiquement quand un utilisateur ajoute un produit à son dressing.
 *
 * Body JSON attendu :
 * {
 *   productId: string       // UUID Supabase du produit
 *   toAddress: string       // adresse wallet du client (ou email pour embedded wallet)
 * }
 *
 * Réponse JSON :
 * { success, transactionHash, error? }
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { THIRDWEB_CONFIG, type TransferResult } from '@/lib/thirdweb'

export async function POST(req: NextRequest): Promise<NextResponse<TransferResult>> {
  // 1. Auth
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

  const { productId, toAddress } = body
  if (!productId || !toAddress) {
    return NextResponse.json({ success: false, error: 'productId et toAddress sont requis' }, { status: 400 })
  }

  // 3. Récupérer le token ID du produit
  const { data: product } = await supabase
    .from('products')
    .select('nft_token_id, nft_contract_address, nft_chain')
    .eq('id', productId)
    .single()

  if (!product?.nft_token_id) {
    return NextResponse.json({
      success: false,
      error: 'Ce produit n\'a pas encore de NFT. Mintez-le d\'abord via /api/nft/mint.'
    }, { status: 404 })
  }

  // 4. Vérifier config Thirdweb
  if (!THIRDWEB_CONFIG.secretKey || !THIRDWEB_CONFIG.contractAddress || !THIRDWEB_CONFIG.adminPrivateKey) {
    return NextResponse.json({
      success: false,
      error: 'Configuration Thirdweb manquante'
    }, { status: 503 })
  }

  // 5. Transfert via Thirdweb SDK
  try {
    const { ThirdwebSDK } = await import('@thirdweb-dev/sdk')

    const sdk = ThirdwebSDK.fromPrivateKey(
      THIRDWEB_CONFIG.adminPrivateKey,
      'polygon',
      { secretKey: THIRDWEB_CONFIG.secretKey }
    )

    const contract = await sdk.getContract(
      product.nft_contract_address || THIRDWEB_CONFIG.contractAddress,
      'nft-collection'
    )

    const tx = await contract.transfer(toAddress, product.nft_token_id)
    const transactionHash = tx.receipt.transactionHash

    // 6. Enregistrer le transfert en base (historique de propriété)
    await supabase.from('nft_transfers').insert({
      product_id: productId,
      token_id: product.nft_token_id,
      from_address: await sdk.wallet.getAddress(),
      to_address: toAddress,
      transaction_hash: transactionHash,
      chain: 'polygon',
      transferred_by: user.id,
    })

    return NextResponse.json({ success: true, transactionHash })

  } catch (err: any) {
    console.error('[nft/transfer] Transfer error:', err)
    return NextResponse.json({
      success: false,
      error: err?.message ?? 'Erreur lors du transfert NFT',
    }, { status: 500 })
  }
}
