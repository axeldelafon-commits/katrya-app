/**
 * app/api/nft/status/route.ts
 * GET /api/nft/status
 *
 * Diagnostic blockchain KATRYA — aucune transaction, aucun gas depense.
 * ACCES : admin connecte uniquement.
 *
 * Retourne : variables d'env manquantes, adresse du wallet admin (derivee de
 * la cle privee), solde POL, adresse du contrat, reseau. Le wallet et son
 * solde sont calcules meme si d'autres variables manquent, pour pouvoir
 * retrouver l'adresse et la financer.
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
  const rpcUrl = process.env.ALCHEMY_POLYGON_RPC_URL
  const privateKey = process.env.KATRYA_WALLET_PRIVATE_KEY

  if (!rpcUrl || !privateKey) {
    return NextResponse.json({
      configOk: false,
      missing: config.missing,
      hint: 'Impossible de determiner le wallet sans ALCHEMY_POLYGON_RPC_URL et KATRYA_WALLET_PRIVATE_KEY.',
    })
  }

  try {
    const provider = new ethers.JsonRpcProvider(rpcUrl)
    const wallet = new ethers.Wallet(privateKey, provider)

    const [balance, network] = await Promise.all([
      provider.getBalance(wallet.address),
      provider.getNetwork(),
    ])

    const pol = Number(ethers.formatEther(balance))
    const contract = process.env.NFT_CONTRACT_ADDRESS ?? null

    return NextResponse.json({
      configOk: config.ok,
      missing: config.missing,
      adminWalletAddress: wallet.address,
      adminWalletUrl: `https://polygonscan.com/address/${wallet.address}`,
      balancePOL: pol.toFixed(6),
      funded: pol > 0.05,
      envWalletAddress: process.env.KATRYA_ADMIN_WALLET_ADDRESS ?? null,
      envWalletMatchesKey:
        (process.env.KATRYA_ADMIN_WALLET_ADDRESS ?? '').toLowerCase() ===
        wallet.address.toLowerCase(),
      contractAddress: contract,
      contractUrl: contract ? `https://polygonscan.com/address/${contract}` : null,
      chainId: network.chainId.toString(),
      chainName: network.name,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[NFT Status] error:', message.replace(/(0x)?[0-9a-fA-F]{56,}/g, '[REDACTED]'))
    return NextResponse.json({ configOk: false, missing: config.missing, error: message.replace(/(0x)?[0-9a-fA-F]{56,}/g, '[REDACTED]') }, { status: 500 })
  }
}
