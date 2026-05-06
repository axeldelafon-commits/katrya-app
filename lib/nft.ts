import { ethers } from 'ethers'
/**
 * lib/nft.ts
 * Couche NFT/Blockchain pour KATRYA
 * Stack : ethers.js v6 + Alchemy RPC (gratuit) + Polygon
 *
 * Aucune dépendance payante. Aucune commission sur les mints.
 * Le contrat ERC-721 est déployé une seule fois (voir scripts/deploy-contract.ts)
 * et appartient à 100% à KATRYA.
 */

// ─── Types ─────────────────────────────────────────────────────────────────────

export interface NFTMetadata {
  name: string
  description: string
  image: string
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

// ─── Config ─────────────────────────────────────────────────────────────────────

/**
 * RPC Polygon. Priorité :
 *  1. Alchemy (gratuit, 300M compute units/mois, très fiable)
 *  2. Fallback : RPC public Polygon (sans compte, toujours disponible)
 */
export function getPolygonRpcUrl(): string {
  const alchemyKey = process.env.ALCHEMY_API_KEY
  if (alchemyKey) {
    return `https://polygon-mainnet.g.alchemy.com/v2/${alchemyKey}`
  }
  // Fallback gratuit, sans compte nécessaire
  return 'https://polygon-rpc.com'
}

export const NFT_CONFIG = {
  chain: 'polygon',
  chainId: 137,
  // Adresse du contrat ERC-721 KATRYA déployé sur Polygon
  // Générée une seule fois via scripts/deploy-contract.ts
  contractAddress: process.env.KATRYA_NFT_CONTRACT_ADDRESS ?? '',
  // Private key du wallet admin KATRYA (sign les transactions)
  // Stocker dans Vercel env vars - JAMAIS dans le code
  adminPrivateKey: process.env.KATRYA_ADMIN_PRIVATE_KEY ?? '',
} as const

// ─── ABI minimal ERC-721 KATRYA ──────────────────────────────────────────────────
//
// Fonctions dont on a besoin :
//   mintTo(address to, string memory uri) -> appelé par l'admin lors de la création produit
//   transferFrom(address from, address to, uint256 tokenId) -> appelé lors de l'ajout au dressing
//   tokenURI(uint256 tokenId) -> lecture de la métadonnée
//   ownerOf(uint256 tokenId) -> vérification du propriétaire actuel

export const KATRYA_NFT_ABI = [
  // Mint
  'function mintTo(address to, string memory uri) external returns (uint256)',
  // Transfert de propriété
  'function transferFrom(address from, address to, uint256 tokenId) external',
  'function safeTransferFrom(address from, address to, uint256 tokenId) external',
  // Lecture
  'function tokenURI(uint256 tokenId) external view returns (string memory)',
  'function ownerOf(uint256 tokenId) external view returns (address)',
  'function balanceOf(address owner) external view returns (uint256)',
  'function totalSupply() external view returns (uint256)',
  // Approbation (nécessaire avant transferFrom)
  'function approve(address to, uint256 tokenId) external',
  'function getApproved(uint256 tokenId) external view returns (address)',
  'function setApprovalForAll(address operator, bool approved) external',
  // Events
  'event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)',
  'event Approval(address indexed owner, address indexed approved, uint256 indexed tokenId)',
] as const

// ─── Helpers métadonnées ──────────────────────────────────────────────────────

/**
 * Construit les métadonnées NFT au standard OpenSea.
 * Les métadonnées sont stockées en base64 inline (pas besoin d'IPFS pour le MVP).
 * Pour une version production, uploader sur IPFS via Pinata (gratuit jusqu'à 1GB).
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
      `Pièce KATRYA authentifiée. Marque : ${product.brand}. ` +
      `Modèle : ${product.model_name}. Catégorie : ${product.category}. ` +
      `ID NFC : ${product.katrya_id}.`,
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

/**
 * Encode les métadonnées en Data URI base64.
 * Permet de stocker le tokenURI directement on-chain sans IPFS.
 * Exemple : data:application/json;base64,eyJuYW1lIjoi...
 */
export function metadataToDataURI(metadata: NFTMetadata): string {
  const json = JSON.stringify(metadata)
  const b64 = Buffer.from(json).toString('base64')
  return `data:application/json;base64,${b64}`
}

// ─── Vérification de config ─────────────────────────────────────────────────────

export function checkNFTConfig(): { ok: boolean; missing: string[] } {
  const missing: string[] = []
  if (!NFT_CONFIG.contractAddress) missing.push('KATRYA_NFT_CONTRACT_ADDRESS')
  if (!NFT_CONFIG.adminPrivateKey)  missing.push('KATRYA_ADMIN_PRIVATE_KEY')
  return { ok: missing.length === 0, missing }
}


// ───── Mint NFT ─────────────────────────────────────────────────────────────

export async function mintKatryaNFT(
  to: string,
  metadata: NFTMetadata
): Promise<MintResult> {
  const { ok, missing } = checkNFTConfig()
  if (!ok) {
    return {
      success: false,
      error: `Missing env vars: ${missing.join(', ')}`
    }
  }

  try {
    const tokenURI = metadataToDataURI(metadata)
    const contractAddress = process.env.KATRYA_NFT_CONTRACT_ADDRESS!
    const rpcUrl = getPolygonRpcUrl()

    const provider = new ethers.JsonRpcProvider(rpcUrl)
    const wallet = new ethers.Wallet(
      process.env.KATRYA_ADMIN_PRIVATE_KEY!,
      provider
    )

    const abi = [
      'function mint(address to, string memory tokenURI) public returns (uint256)',
      'function totalSupply() public view returns (uint256)'
    ]

    const contract = new ethers.Contract(contractAddress, abi, wallet)
    const tx = await contract.mint(to, tokenURI)
    const receipt = await tx.wait()

    const tokenId = await contract.totalSupply()

    return {
      success: true,
      tokenId: (Number(tokenId) - 1).toString(),
      transactionHash: receipt.hash
    }
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error)
    return {
      success: false,
      error: msg
    }
  }
}


export async function transferKatryaNFT({
  tokenId,
  toAddress,
}: {
  tokenId: number
  toAddress: string
}): Promise<TransferResult> {
  const { ok, missing } = checkNFTConfig()
  if (!ok) {
    return {
      success: false,
      error: `Missing env vars: ${missing.join(', ')}`,
    }
  }
  try {
    const contractAddress = process.env.KATRYA_NFT_CONTRACT_ADDRESS!
    const rpcUrl = getPolygonRpcUrl()
    const provider = new ethers.JsonRpcProvider(rpcUrl)
    const wallet = new ethers.Wallet(
      process.env.KATRYA_ADMIN_PRIVATE_KEY!,
      provider
    )
    const abi = [
      'function safeTransferFrom(address from, address to, uint256 tokenId) public',
    ]
    const contract = new ethers.Contract(contractAddress, abi, wallet)
    const tx = await contract.safeTransferFrom(wallet.address, toAddress, tokenId)
    const receipt = await tx.wait()
    return {
      success: true,
      transactionHash: receipt.hash,
    }
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error)
    return {
      success: false,
      error: msg,
    }
  }
}
