/**
 * app/api/nft/status/route.ts
 * GET /api/nft/status
 *
 * Diagnostic blockchain KATRYA — aucune transaction, aucun gas depense.
 * ACCES : admin connecte uniquement.
 *
 * Retourne : config presente ou non, adresse du wallet admin (derivee de la
 * cle privee), solde POL, adresse du contrat, reseau. Permet de verifier que
 * le wallet est finance avant de lancer un mint.
 */
import { NextResponse } from 'next/server'
import { ethers } from 'ethers'
import { requireAdminApi } from '@/lib/api-auth'
import { checkNFTConfig } from '@/lib/nft'

export const dynamic = 'force-dynamic'

export async function GET() {
  const auth = await requireAdminApi()
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  const config = checkNFTConfig()
  if (!config.ok) {
    return NextResponse.json({
      configOk: false,
      missing: config.missing,
    })
  }

  try {
    const provider = new ethers.JsonRpcProvider(process.env.ALCHEMY_POLYGON_RPC_URL)
    const wallet = new ethers.Wallet(process.env.KATRYA_WALLET_PRIVATE_KEY!, provider)

    const [balance, network] = await Promise.all([
      provider.getBalance(wallet.address),
      provider.getNetwork(),
    ])

    const pol = Number(ethers.formatEther(balance))

    return NextResponse.json({
      configOk: true,
      adminWalletAddress: wallet.address,
      adminWalletUrl: `https://polygonscan.com/address/${wallet.address}`,
      balancePOL: pol.toFixed(6),
      funded: pol > 0.05,
      envWalletAddress: process.env.KATRYA_ADMIN_WALLET_ADDRESS ?? null,
      envWalletMatchesKey:
        (process.env.KATRYA_ADMIN_WALLET_ADDRESS ?? '').toLowerCase() ===
        wallet.address.toLowerCase(),
      contractAddress: process.env.NFT_CONTRACT_ADDRESS,
      contractUrl: `https://polygonscan.com/address/${process.env.NFT_CONTRACT_ADDRESS}`,
      chainId: network.chainId.toString(),
      chainName: network.name,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[NFT Status] error:', message)
    return NextResponse.json({ configOk: true, error: message }, { status: 500 })
  }
}
