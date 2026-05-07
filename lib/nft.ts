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

// ---- Types ---------------------------------------------------------------

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
  tokenURI?: string
  error?: string
}

export interface TransferResult {
  success: boolean
  transactionHash?: string
  error?: string
}

// ---- ABI minimal du contrat KatryaNFT -----------------------------------

export const KATRYA_NFT_ABI = [
  'function mint(address to, string memory tokenURI) public returns (uint256)',
  'function mintWithId(address to, string memory tokenURI, string memory katryaId) public returns (uint256)',
  'function safeTransferFrom(address from, address to, uint256 tokenId) public',
  'function transferFrom(address from, address to, uint256 tokenId) public',
  'function ownerOf(uint256 tokenId) public view returns (address)',
  'function tokenURI(uint256 tokenId) public view returns (string memory)',
  'function totalSupply() public view returns (uint256)',
  'function exists(uint256 tokenId) public view returns (bool)',
  'function approve(address to, uint256 tokenId) public',
  'function setApprovalForAll(address operator, bool approved) public',
  'event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)',
  'event KatrYaMinted(uint256 indexed tokenId, address indexed to, string katryaId, string tokenURI)',
  'event KatryaTransferred(uint256 indexed tokenId, address indexed from, address indexed to)',
] as const

// ---- Helpers -------------------------------------------------------------

export function getPolygonRpcUrl(): string {
  const apiKey = process.env.ALCHEMY_API_KEY
  if (apiKey) {
    return `https://polygon-mainnet.g.alchemy.com/v2/${apiKey}`
  }
  // Fallback public RPC Polygon
  return 'https://polygon-rpc.com'
}

/**
 * Construit l'URL publique tokenURI vers l'API KATRYA.
 * Cette URL est stockée on-chain et lue par OpenSea / Polygonscan.
 *
 * Avant le mint, on ne connaît pas encore le tokenId.
 * On utilise alors un data URI temporaire, puis on peut appeler
 * updateTokenURI() après avoir obtenu le tokenId réel.
 *
 * NOTE: Pour la v1 on continue à stocker le data URI pendant le mint
 * (car le tokenId est inconnu avant), puis on expose l'API publique
 * pour la lecture (OpenSea récupère via tokenURI on-chain, mais notre
 * API /api/nft/metadata/[tokenId] sert de source de vérité depuis Supabase).
 */
export function buildTokenURI(tokenId: string | number, metadata: NFTMetadata): string {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://katrya-app.vercel.app'
  return `${baseUrl}/api/nft/metadata/${tokenId}`
}

/**
 * Encode les métadonnées en data URI base64 (utilisé au moment du mint
 * quand le tokenId n'est pas encore connu).
 */
export function metadataToDataURI(metadata: NFTMetadata): string {
  const json = JSON.stringify(metadata)
  const base64 = Buffer.from(json).toString('base64')
  return `data:application/json;base64,${base64}`
}

/**
 * Construit les métadonnées NFT standards ERC-721 pour un produit KATRYA.
 */
export function buildNFTMetadata(params: {
  katryaId: string
  brand: string
  modelName: string
  category: string
  status: string
  description?: string
  imageUrl?: string
}): NFTMetadata {
  const { katryaId, brand, modelName, category, status, description, imageUrl } = params
  return {
    name: `KATRYA Passport - ${brand} ${modelName}`,
    description: description || `Passeport numérique certifié blockchain pour ${brand} ${modelName}. Authenticité garantie par KATRYA NFC.`,
    image: imageUrl || 'https://katrya-app.vercel.app/images/katrya-nft-default.png',
    attributes: [
      { trait_type: 'KATRYA ID', value: katryaId },
      { trait_type: 'Marque', value: brand },
      { trait_type: 'Modèle', value: modelName },
      { trait_type: 'Catégorie', value: category },
      { trait_type: 'Statut', value: status },
      { trait_type: 'Blockchain', value: 'Polygon' },
      { trait_type: 'Standard', value: 'ERC-721' },
    ],
  }
}

/**
 * Vérifie que toutes les variables d'environnement nécessaires sont définies.
 */
export function checkNFTConfig(): { ok: boolean; missing: string[] } {
  const required = [
    'KATRYA_NFT_CONTRACT_ADDRESS',
    'KATRYA_ADMIN_PRIVATE_KEY',
  ]
  const missing = required.filter(k => !process.env[k])
  return { ok: missing.length === 0, missing }
}

// ---- Fonctions principales -----------------------------------------------

/**
 * Mint un NFT KATRYA sur Polygon Mainnet.
 *
 * Stratégie tokenURI en 2 étapes :
 * 1. Au mint : on utilise un data URI temporaire (tokenId inconnu)
 * 2. Après le mint : la route /api/nft/mint met à jour token_uri dans Supabase
 *    avec l'URL publique /api/nft/metadata/[tokenId]
 *
 * La route GET /api/nft/metadata/[tokenId] sert les données depuis Supabase,
 * ce qui permet de les mettre à jour sans redéployer le contrat.
 */
export async function mintKatryaNFT(
  to: string,
  metadata: NFTMetadata
): Promise<MintResult> {
  const { ok, missing } = checkNFTConfig()
  if (!ok) {
    return {
      success: false,
      error: `Variables d'environnement manquantes : ${missing.join(', ')}`,
    }
  }

  try {
    // Utilise un data URI temporaire au moment du mint
    // (le tokenId n'est pas encore connu avant que la tx soit minée)
    const tokenURI = metadataToDataURI(metadata)
    const contractAddress = process.env.KATRYA_NFT_CONTRACT_ADDRESS!
    const rpcUrl = getPolygonRpcUrl()

    const provider = new ethers.JsonRpcProvider(rpcUrl)
    const wallet = new ethers.Wallet(process.env.KATRYA_ADMIN_PRIVATE_KEY!, provider)

    // ABI minimal pour le mint
    const abi = [
      'function mint(address to, string memory tokenURI) public returns (uint256)',
      'function totalSupply() public view returns (uint256)',
    ]
    const contract = new ethers.Contract(contractAddress, abi, wallet)

    const tx = await contract.mint(to, tokenURI)
    const receipt = await tx.wait()

    // Le token ID est le totalSupply après le mint (IDs séquentiels depuis 1)
    const supply = await contract.totalSupply()
    const tokenId = supply.toString()

    return {
      success: true,
      tokenId,
      transactionHash: receipt.hash,
      contractAddress,
      tokenURI,
    }
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error)
    return {
      success: false,
      error: msg,
    }
  }
}

/**
 * Transfère un NFT KATRYA d'une adresse à une autre sur Polygon Mainnet.
 * Utilise safeTransferFrom depuis le wallet admin (qui est l'owner initial).
 */
export async function transferKatryaNFT(params: {
  tokenId: number
  toAddress: string
  fromAddress?: string
}): Promise<TransferResult> {
  const { ok, missing } = checkNFTConfig()
  if (!ok) {
    return {
      success: false,
      error: `Variables d'environnement manquantes : ${missing.join(', ')}`,
    }
  }

  try {
    const { tokenId, toAddress, fromAddress } = params
    const contractAddress = process.env.KATRYA_NFT_CONTRACT_ADDRESS!
    const rpcUrl = getPolygonRpcUrl()

    const provider = new ethers.JsonRpcProvider(rpcUrl)
    const wallet = new ethers.Wallet(process.env.KATRYA_ADMIN_PRIVATE_KEY!, provider)

    // L'adresse source est soit spécifiée, soit le wallet admin lui-même
    const from = fromAddress || wallet.address

    const abi = [
      'function safeTransferFrom(address from, address to, uint256 tokenId) public',
      'function ownerOf(uint256 tokenId) public view returns (address)',
    ]
    const contract = new ethers.Contract(contractAddress, abi, wallet)

    // Vérification que le wallet admin est bien propriétaire du token
    const currentOwner: string = await contract.ownerOf(tokenId)
    if (currentOwner.toLowerCase() !== wallet.address.toLowerCase()) {
      return {
        success: false,
        error: `Le wallet admin (${wallet.address}) n'est pas propriétaire du token #${tokenId}. Propriétaire actuel : ${currentOwner}`,
      }
    }

    const tx = await contract.safeTransferFrom(from, toAddress, tokenId)
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

/**
 * Lit le tokenURI on-chain pour un token donné.
 * Utile pour vérifier que le token a bien été minté et que l'URI est correct.
 */
export async function getTokenURI(tokenId: number): Promise<string | null> {
  try {
    const contractAddress = process.env.KATRYA_NFT_CONTRACT_ADDRESS
    if (!contractAddress) return null

    const rpcUrl = getPolygonRpcUrl()
    const provider = new ethers.JsonRpcProvider(rpcUrl)

    const abi = [
      'function tokenURI(uint256 tokenId) public view returns (string memory)',
    ]
    const contract = new ethers.Contract(contractAddress, abi, provider)
    return await contract.tokenURI(tokenId)
  } catch {
    return null
  }
}

/**
 * Vérifie le propriétaire actuel d'un token on-chain.
 */
export async function getTokenOwner(tokenId: number): Promise<string | null> {
  try {
    const contractAddress = process.env.KATRYA_NFT_CONTRACT_ADDRESS
    if (!contractAddress) return null

    const rpcUrl = getPolygonRpcUrl()
    const provider = new ethers.JsonRpcProvider(rpcUrl)

    const abi = [
      'function ownerOf(uint256 tokenId) public view returns (address)',
    ]
    const contract = new ethers.Contract(contractAddress, abi, provider)
    return await contract.ownerOf(tokenId)
  } catch {
    return null
  }
}
