/**
 * scripts/deploy-contract.ts
 *
 * Déploie le smart contract ERC-721 KatryaNFT sur Polygon Mumbai (testnet)
 * ou Polygon Mainnet selon la variable d'environnement POLYGON_NETWORK.
 *
 * Usage :
 *   npx ts-node scripts/deploy-contract.ts
 *
 * Prérequis :
 *   - KATRYA_ADMIN_PRIVATE_KEY dans .env
 *   - ALCHEMY_API_KEY dans .env
 *   - POLYGON_NETWORK=mainnet ou mumbai (défaut: mumbai)
 *
 * Après exécution :
 *   Copier l'adresse affichée dans KATRYA_NFT_CONTRACT_ADDRESS (.env)
 */

import { ethers } from 'ethers'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

// ABI minimal ERC-721 pour le déploiement
const CONTRACT_ABI = [
  'constructor(string memory name, string memory symbol)',
  'function mint(address to, string memory tokenURI) public returns (uint256)',
  'function safeTransferFrom(address from, address to, uint256 tokenId) public',
  'function ownerOf(uint256 tokenId) public view returns (address)',
  'function tokenURI(uint256 tokenId) public view returns (string memory)',
  'function totalSupply() public view returns (uint256)',
  'event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)',
]

// Bytecode simplifié - contrat OpenZeppelin ERC721URIStorage compilé
// En production, utiliser Hardhat/Foundry pour compiler le vrai contrat
const CONTRACT_BYTECODE = '0x' // à remplacer par le bytecode compilé

async function main() {
  const privateKey = process.env.KATRYA_ADMIN_PRIVATE_KEY
  const alchemyApiKey = process.env.ALCHEMY_API_KEY
  const network = process.env.POLYGON_NETWORK || 'mumbai'

  if (!privateKey || !alchemyApiKey) {
    console.error('KATRYA_ADMIN_PRIVATE_KEY et ALCHEMY_API_KEY requis dans .env.local')
    process.exit(1)
  }

  // Choix du réseau
  const rpcUrl = network === 'mainnet'
    ? `https://polygon-mainnet.g.alchemy.com/v2/${alchemyApiKey}`
    : `https://polygon-mumbai.g.alchemy.com/v2/${alchemyApiKey}`

  console.log(`\n🚀 Déploiement sur Polygon ${network}...`)
  console.log(`RPC: ${rpcUrl.replace(alchemyApiKey, '***')}\n`)

  const provider = new ethers.JsonRpcProvider(rpcUrl)
  const wallet = new ethers.Wallet(privateKey, provider)

  console.log(`Wallet: ${wallet.address}`)

  const balance = await provider.getBalance(wallet.address)
  console.log(`Balance: ${ethers.formatEther(balance)} MATIC`)

  if (balance === 0n) {
    console.error('\n⚠️  Solde insuffisant. Obtenez des MATIC de test sur https://faucet.polygon.technology/')
    process.exit(1)
  }

  // NOTE: Pour déployer le vrai contrat, utiliser Hardhat :
  // 1. npm install --save-dev hardhat @nomicfoundation/hardhat-toolbox
  // 2. npx hardhat init
  // 3. Copier le contrat OpenZeppelin dans contracts/KatryaNFT.sol
  // 4. npx hardhat compile
  // 5. npx hardhat run scripts/deploy.js --network polygon

  console.log('\nℹ️  Pour déployer le contrat complet:')
  console.log('   1. Installez Hardhat: npm install --save-dev hardhat')
  console.log('   2. Créez contracts/KatryaNFT.sol (ERC721URIStorage + Ownable)')
  console.log('   3. Compilez: npx hardhat compile')
  console.log('   4. Déployez: npx hardhat run scripts/deploy-contract.ts --network polygon')
  console.log('\nContrat recommandé (OpenZeppelin):')
  console.log('   https://wizard.openzeppelin.com/#erc721')
  console.log('   - ERC721 + URIStorage + Ownable + Mintable')
  console.log('\nAprès déploiement:')
  console.log('   KATRYA_NFT_CONTRACT_ADDRESS=0x... (.env.local)')
}

main().catch(console.error)
