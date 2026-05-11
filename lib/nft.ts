import { ethers } from 'ethers'

/**
 * lib/nft.ts
 * Couche NFT/Blockchain pour KATRYA
 * Stack : ethers.js v6 + Alchemy RPC (gratuit) + Polygon
 *
 * Aucune dépendance payante. Aucune commission sur les mints.
 * Le contrat ERC-721 est déployé une seule fois (voir contracts/KatryaNFT.sol)
 * et appartient à 100% à KATRYA.
 *
 * tokenURI : URL publique vers /api/nft/metadata/[tokenId]
 * Compatible OpenSea, Polygonscan, Rarible, etc.
 */

// ---- Types ----------------------------------------------------------------

export interface NFTMetadata {
  name: string
  description: string
  image: string
  attributes: Array<{ trait_type: string; value: string }>
}

export interface MintResult {
  success: boolean
  tokenId?: string
  transactionHash?: string
  error?: string
}

export interface NFTConfigResult {
  ok: boolean
  missing: string[]
}

// Paramètres de buildNFTMetadata — snake_case aligné sur le body JSON de la route mint
export interface BuildNFTMetadataParams {
  katrya_id: string
  brand: string
  model_name: string
  category: string
  status: string
  description?: string
  image_url?: string
  imageUrl?: string
}

// Paramètres de transferKatryaNFT — objet pour simplifier les appels
export interface TransferParams {
  tokenId: number | string
  toAddress: string
  fromAddress?: string
}

// ---- Helpers ---------------------------------------------------------------

export function buildNFTMetadata(params: BuildNFTMetadataParams): NFTMetadata {
  const {
    katrya_id,
    brand,
    model_name,
    category,
    status,
    description,
    image_url,
    imageUrl,
  } = params

  const image = image_url ?? imageUrl ?? ''

  return {
    name: `${brand} ${model_name} — ${katrya_id}`,
    description: description ?? `Certificat numérique KATRYA pour ${brand} ${model_name}.`,
    image,
    attributes: [
      { trait_type: 'Brand', value: brand },
      { trait_type: 'Model', value: model_name },
      { trait_type: 'Category', value: category },
      { trait_type: 'Status', value: status },
      { trait_type: 'KATRYA ID', value: katrya_id },
    ],
  }
}

/**
 * Encode les métadonnées NFT en Data URI base64
 * Utilisé comme tokenURI on-chain
 */
export function metadataToDataURI(metadata: NFTMetadata): string {
  const json = JSON.stringify(metadata)
  const base64 = Buffer.from(json).toString('base64')
  return `data:application/json;base64,${base64}`
}

/**
 * Vérifie que les variables d'environnement blockchain sont présentes
 * Retourne { ok, missing } pour des messages d'erreur précis
 */
export function checkNFTConfig(): NFTConfigResult {
  const required: Record<string, string | undefined> = {
    ALCHEMY_POLYGON_RPC_URL: process.env.ALCHEMY_POLYGON_RPC_URL,
    KATRYA_WALLET_PRIVATE_KEY: process.env.KATRYA_WALLET_PRIVATE_KEY,
    NFT_CONTRACT_ADDRESS: process.env.NFT_CONTRACT_ADDRESS,
  }
  const missing = Object.entries(required)
    .filter(([, v]) => !v)
    .map(([k]) => k)
  return { ok: missing.length === 0, missing }
}

// ---- Mint ------------------------------------------------------------------

const CONTRACT_ABI = [
  'function mintNFT(address recipient, string memory tokenURI) public returns (uint256)',
  'event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)',
]

/**
 * Minte un NFT sur Polygon.
 * @param recipientAddress — adresse wallet qui recevra le NFT
 * @param metadataOrURI — objet NFTMetadata (encodé en data URI) ou string tokenURI directe
 */
export async function mintKatryaNFT(
  recipientAddress: string,
  metadataOrURI: NFTMetadata | string
): Promise<MintResult> {
  try {
    const rpcUrl = process.env.ALCHEMY_POLYGON_RPC_URL
    const privateKey = process.env.KATRYA_WALLET_PRIVATE_KEY
    const contractAddress = process.env.NFT_CONTRACT_ADDRESS

    if (!rpcUrl || !privateKey || !contractAddress) {
      return {
        success: false,
        error: 'Missing blockchain env vars: ALCHEMY_POLYGON_RPC_URL, KATRYA_WALLET_PRIVATE_KEY, NFT_CONTRACT_ADDRESS',
      }
    }

    const tokenURI = typeof metadataOrURI === 'string'
      ? metadataOrURI
      : metadataToDataURI(metadataOrURI)

    const provider = new ethers.JsonRpcProvider(rpcUrl)
    const wallet = new ethers.Wallet(privateKey, provider)
    const contract = new ethers.Contract(contractAddress, CONTRACT_ABI, wallet)

    const tx = await contract.mintNFT(recipientAddress, tokenURI)
    const receipt = await tx.wait()

    let tokenId: string | undefined
    for (const log of receipt.logs) {
      try {
        const parsed = contract.interface.parseLog(log)
        if (parsed && parsed.name === 'Transfer') {
          tokenId = parsed.args.tokenId.toString()
          break
        }
      } catch {
        // log non parseable
      }
    }

    return { success: true, tokenId, transactionHash: receipt.hash }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return { success: false, error: message }
  }
}

// ---- Transfer --------------------------------------------------------------

const TRANSFER_ABI = [
  'function safeTransferFrom(address from, address to, uint256 tokenId) public',
]

/**
 * Transfère un NFT vers une nouvelle adresse.
 * Accepte un objet { tokenId, toAddress, fromAddress? }
 * Si fromAddress est absent, utilise le wallet KATRYA_WALLET_PRIVATE_KEY comme from.
 */
export async function transferKatryaNFT(params: TransferParams): Promise<MintResult> {
  try {
    const { tokenId, toAddress, fromAddress } = params

    const rpcUrl = process.env.ALCHEMY_POLYGON_RPC_URL
    const privateKey = process.env.KATRYA_WALLET_PRIVATE_KEY
    const contractAddress = process.env.NFT_CONTRACT_ADDRESS

    if (!rpcUrl || !privateKey || !contractAddress) {
      return { success: false, error: 'Missing blockchain env vars' }
    }

    const provider = new ethers.JsonRpcProvider(rpcUrl)
    const wallet = new ethers.Wallet(privateKey, provider)
    const contract = new ethers.Contract(contractAddress, TRANSFER_ABI, wallet)

    const from = fromAddress ?? wallet.address
    const tokenIdBig = BigInt(tokenId.toString())

    const tx = await contract.safeTransferFrom(from, toAddress, tokenIdBig)
    const receipt = await tx.wait()

    return { success: true, transactionHash: receipt.hash }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return { success: false, error: message }
  }
}
