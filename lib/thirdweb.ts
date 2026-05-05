/**
 * lib/thirdweb.ts
 * Configuration centrale Thirdweb pour KATRYA
 * Blockchain : Polygon (chain ID 137) — frais quasi nuls, écologique
 * Contrat : ERC-721 (1 NFT = 1 produit physique)
 */

// ─── Types utilitaires ────────────────────────────────────────────────────────

export interface NFTMetadata {
  name: string          // ex: "Nike Air Max 90 — KTR-0042"
  description: string   // description du produit
  image: string         // URL image principale (Supabase Storage)
  attributes: Array<{ trait_type: string; value: string | number }>
}

export interface MintResult {
  success: boolean
  tokenId?: string
  transactionHash?: string
  contractAddress?: string
  chain?: string
  error?: string
}

export interface TransferResult {
  success: boolean
  transactionHash?: string
  error?: string
}

// ─── Config ───────────────────────────────────────────────────────────────────

export const THIRDWEB_CONFIG = {
  // Polygon Mainnet
  chainId: 137,
  chainName: 'polygon',
  rpcUrl: 'https://polygon-rpc.com',

  // Adresse du smart contract ERC-721 KATRYA (à déployer sur Thirdweb Dashboard)
  // https://thirdweb.com/dashboard → Deploy → NFT Collection
  contractAddress: process.env.THIRDWEB_CONTRACT_ADDRESS ?? '',

  // Clé secrète backend pour signer les transactions (ne jamais exposer côté client)
  secretKey: process.env.THIRDWEB_SECRET_KEY ?? '',

  // Wallet backend KATRYA (admin wallet qui minte et transfère les NFTs)
  // Stocker la private key dans les env vars Vercel (jamais dans le code)
  adminPrivateKey: process.env.KATRYA_ADMIN_PRIVATE_KEY ?? '',
} as const

// ─── Helpers métadonnées ──────────────────────────────────────────────────────

/**
 * Construit les métadonnées NFT à partir d'un produit KATRYA.
 * Respecte le standard OpenSea metadata.
 */
export function buildNFTMetadata(product: {
  katrya_id: string
  brand: string
  model_name: string
  category: string
  status: string
  description?: string | null
  imageUrl?: string | null
}): NFTMetadata {
  return {
    name: `${product.brand} ${product.model_name} — ${product.katrya_id}`,
    description:
      product.description ??
      `Produit KATRYA authentifié. Marque : ${product.brand}. Modèle : ${product.model_name}. ` +
      `Catégorie : ${product.category}. ID NFC : ${product.katrya_id}.`,
    image: product.imageUrl ?? '',
    attributes: [
      { trait_type: 'Brand',      value: product.brand },
      { trait_type: 'Model',      value: product.model_name },
      { trait_type: 'Category',   value: product.category },
      { trait_type: 'Status',     value: product.status },
      { trait_type: 'Katrya ID', value: product.katrya_id },
      { trait_type: 'Certified',  value: 'KATRYA Blockchain' },
      { trait_type: 'Chain',      value: 'Polygon' },
      { trait_type: 'Year',       value: new Date().getFullYear() },
    ],
  }
}
