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

// Paramètres acceptés par buildNFTMetadata — snake_case pour compatibilité
// avec app/api/nft/mint/route.ts qui lit le body JSON directement
export interface BuildNFTMetadataParams {
  katrya_id: string
  brand: string
  model_name: string
  category: string
  status: string
  description?: string
  image_url?: string
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
  } = params

  return {
    name: `${brand} ${model_name} — ${katrya_id}`,
    description: description ?? `Certificat numérique KATRYA pour ${brand} ${model_name}.`,
    image: image_url ?? '',
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
 * Utilisé comme tokenURI quand on ne veut pas dépendre d'une URL externe
 * Pour KATRYA on préfère utiliser l'URL /api/nft/metadata/[tokenId]
 */
export function metadataToDataURI(metadata: NFTMetadata): string {
  const json = JSON.stringify(metadata)
  const base64 = Buffer.from(json).toString('base64')
  return `data:application/json;base64,${base64}`
}

/**
 * Vérifie que les variables d'environnement blockchain sont présentes
 * Retourne true si tout est configuré, false sinon
 */
export function checkNFTConfig(): boolean {
  return Boolean(
    process.env.ALCHEMY_POLYGON_RPC_URL &&
    process.env.KATRYA_WALLET_PRIVATE_KEY &&
    process.env.NFT_CONTRACT_ADDRESS
  )
}

// ---- Mint ------------------------------------------------------------------

const CONTRACT_ABI = [
  'function mintNFT(address recipient, string memory tokenURI) public returns (uint256)',
  'event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)',
]

export async function mintKatryaNFT(
  recipientAddress: string,
  tokenURI: string
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

    const provider = new ethers.JsonRpcProvider(rpcUrl)
    const wallet = new ethers.Wallet(privateKey, provider)
    const contract = new ethers.Contract(contractAddress, CONTRACT_ABI, wallet)

    const tx = await contract.mintNFT(recipientAddress, tokenURI)
    const receipt = await tx.wait()

    // Récupérer le tokenId depuis les logs Transfer
    let tokenId: string | undefined
    for (const log of receipt.logs) {
      try {
        const parsed = contract.interface.parseLog(log)
        if (parsed && parsed.name === 'Transfer') {
          tokenId = parsed.args.tokenId.toString()
          break
        }
      } catch {
        // log non parseable, on continue
      }
    }

    return {
      success: true,
      tokenId,
      transactionHash: receipt.hash,
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return { success: false, error: message }
  }
}

// ---- Transfer --------------------------------------------------------------

const TRANSFER_ABI = [
  'function safeTransferFrom(address from, address to, uint256 tokenId) public',
]

export async function transferKatryaNFT(
  fromAddress: string,
  toAddress: string,
  tokenId: string
): Promise<MintResult> {
  try {
    const rpcUrl = process.env.ALCHEMY_POLYGON_RPC_URL
    const privateKey = process.env.KATRYA_WALLET_PRIVATE_KEY
    const contractAddress = process.env.NFT_CONTRACT_ADDRESS

    if (!rpcUrl || !privateKey || !contractAddress) {
      return {
        success: false,
        error: 'Missing blockchain env vars',
      }
    }

    const provider = new ethers.JsonRpcProvider(rpcUrl)
    const wallet = new ethers.Wallet(privateKey, provider)
    const contract = new ethers.Contract(contractAddress, TRANSFER_ABI, wallet)

    const tx = await contract.safeTransferFrom(fromAddress, toAddress, BigInt(tokenId))
    const receipt = await tx.wait()

    return {
      success: true,
      transactionHash: receipt.hash,
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return { success: false, error: message }
  }
}
