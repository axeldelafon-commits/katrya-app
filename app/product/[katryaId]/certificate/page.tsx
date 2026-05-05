/**
 * app/product/[katryaId]/certificate/page.tsx
 *
 * Page publique de certificat d'authenticité blockchain KATRYA.
 * Accessible par n'importe qui via l'URL :
 *   https://katrya-app.vercel.app/product/KTR-0042/certificate
 *
 * Affiche :
 * - Les informations du produit (marque, modèle, catégorie)
 * - Le token NFT ERC-721 sur Polygon
 * - Le lien Polygonscan pour vérification publique
 * - Le statut d'authenticité (certifié / non certifié)
 * - L'historique des propriétaires (si disponible)
 */

import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { notFound } from 'next/navigation'

interface Props {
  params: { katryaId: string }
}

function Badge({ certified }: { certified: boolean }) {
  return certified ? (
    <div className="inline-flex items-center gap-2 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-full px-4 py-2 text-sm font-semibold">
      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
      Authenticité certifiée sur Polygon
    </div>
  ) : (
    <div className="inline-flex items-center gap-2 bg-amber-50 border border-amber-200 text-amber-700 rounded-full px-4 py-2 text-sm font-semibold">
      <span className="w-2 h-2 rounded-full bg-amber-500" />
      Certification blockchain en attente
    </div>
  )
}

export default async function CertificatePage({ params }: Props) {
  const { katryaId } = params
  const supabase = createClient()

  // Récupérer le produit
  const { data: product } = await supabase
    .from('products')
    .select(`
      id, katrya_id, brand, model_name, category, status,
      nft_token_id, nft_contract_address, nft_chain,
      product_images(url, position)
    `)
    .eq('katrya_id', katryaId)
    .single()

  if (!product) notFound()

  // Image principale
  const sortedImages = (product.product_images ?? [])
    .slice()
    .sort((a: any, b: any) => a.position - b.position)
  const cover = sortedImages[0]?.url

  const isCertified = !!product.nft_token_id
  const polygonscanUrl = isCertified
    ? `https://polygonscan.com/token/${product.nft_contract_address}?a=${product.nft_token_id}`
    : null
  const openSeaUrl = isCertified
    ? `https://opensea.io/assets/matic/${product.nft_contract_address}/${product.nft_token_id}`
    : null

  // Historique des transferts
  const { data: transfers } = await supabase
    .from('nft_transfers')
    .select('from_address, to_address, transaction_hash, chain, created_at')
    .eq('product_id', product.id)
    .order('created_at', { ascending: false })

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      {/* Header */}
      <div className="bg-black text-white">
        <div className="max-w-3xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="text-white font-semibold tracking-widest text-sm uppercase hover:opacity-70 transition">
            KATRYA
          </Link>
          <p className="text-gray-400 text-xs">Certificat d'authenticité</p>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-6 py-12">

        {/* Carte principale */}
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden mb-8">
          <div className="flex flex-col md:flex-row">
            {/* Image produit */}
            <div className="w-full md:w-64 bg-gray-50 flex-shrink-0 flex items-center justify-center p-8">
              {cover ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={cover} alt={product.model_name} className="max-h-52 object-contain" />
              ) : (
                <div className="text-6xl">👗</div>
              )}
            </div>

            {/* Infos produit */}
            <div className="flex-1 p-8">
              <div className="mb-4">
                <Badge certified={isCertified} />
              </div>
              <h1 className="text-2xl font-bold text-gray-900 mb-1">{product.brand}</h1>
              <p className="text-gray-500 text-lg mb-4">{product.model_name}</p>

              <div className="grid grid-cols-2 gap-3 mb-6">
                <div>
                  <p className="text-xs uppercase tracking-widest text-gray-400">Catégorie</p>
                  <p className="text-sm font-medium text-gray-800 capitalize mt-0.5">{product.category}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-widest text-gray-400">Statut</p>
                  <p className="text-sm font-medium text-gray-800 capitalize mt-0.5">{product.status}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-widest text-gray-400">ID NFC</p>
                  <p className="text-sm font-mono font-bold text-gray-800 mt-0.5">{product.katrya_id}</p>
                </div>
                {isCertified && (
                  <div>
                    <p className="text-xs uppercase tracking-widest text-gray-400">Token NFT</p>
                    <p className="text-sm font-mono font-bold text-purple-600 mt-0.5">#{product.nft_token_id}</p>
                  </div>
                )}
              </div>

              {/* Liens blockchain */}
              {isCertified && (
                <div className="flex flex-wrap gap-2">
                  <a
                    href={polygonscanUrl!}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-50 border border-purple-200 text-purple-700 text-xs font-medium hover:bg-purple-100 transition"
                  >
                    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm0 4.5a7.5 7.5 0 110 15 7.5 7.5 0 010-15z"/>
                    </svg>
                    Voir sur Polygonscan
                  </a>
                  <a
                    href={openSeaUrl!}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-50 border border-blue-200 text-blue-700 text-xs font-medium hover:bg-blue-100 transition"
                  >
                    <svg className="w-3.5 h-3.5" viewBox="0 0 90 90" fill="currentColor">
                      <path d="M45 0C20.151 0 0 20.151 0 45C0 69.849 20.151 90 45 90C69.849 90 90 69.849 90 45C90 20.151 69.858 0 45 0Z"/>
                    </svg>
                    Voir sur OpenSea
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Blockchain details */}
        {isCertified && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-8">
            <h2 className="text-sm font-semibold text-gray-900 mb-4">🔗 Détails blockchain</h2>
            <div className="space-y-3">
              <div className="flex items-start justify-between gap-4">
                <span className="text-xs text-gray-400 uppercase tracking-widest whitespace-nowrap">Réseau</span>
                <span className="text-xs font-mono text-gray-700">Polygon (MATIC) — Chain ID 137</span>
              </div>
              <div className="flex items-start justify-between gap-4">
                <span className="text-xs text-gray-400 uppercase tracking-widest whitespace-nowrap">Contrat</span>
                <a
                  href={`https://polygonscan.com/address/${product.nft_contract_address}`}
                  target="_blank" rel="noopener noreferrer"
                  className="text-xs font-mono text-purple-600 hover:underline truncate max-w-[220px]"
                >
                  {product.nft_contract_address}
                </a>
              </div>
              <div className="flex items-start justify-between gap-4">
                <span className="text-xs text-gray-400 uppercase tracking-widest whitespace-nowrap">Standard</span>
                <span className="text-xs font-mono text-gray-700">ERC-721 (Non-Fungible Token)</span>
              </div>
              <div className="flex items-start justify-between gap-4">
                <span className="text-xs text-gray-400 uppercase tracking-widest whitespace-nowrap">Token ID</span>
                <span className="text-xs font-mono text-gray-700">#{product.nft_token_id}</span>
              </div>
            </div>
          </div>
        )}

        {/* Historique des propriétaires */}
        {transfers && transfers.length > 0 && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-8">
            <h2 className="text-sm font-semibold text-gray-900 mb-4">📜 Historique de propriété</h2>
            <div className="space-y-3">
              {transfers.map((t: any, i: number) => (
                <div key={i} className="flex items-center gap-3 text-xs">
                  <div className="w-5 h-5 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 font-bold flex-shrink-0">
                    {i + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-gray-500">
                      <span className="font-mono text-gray-700">{t.from_address?.slice(0, 8)}…</span>
                      {' → '}
                      <span className="font-mono text-gray-700">{t.to_address?.slice(0, 8)}…</span>
                    </p>
                    <p className="text-gray-400 text-[10px] mt-0.5">{new Date(t.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })}</p>
                  </div>
                  <a
                    href={`https://polygonscan.com/tx/${t.transaction_hash}`}
                    target="_blank" rel="noopener noreferrer"
                    className="text-purple-600 hover:underline text-[10px] font-mono whitespace-nowrap"
                  >
                    {t.transaction_hash?.slice(0, 10)}…
                  </a>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="text-center">
          <p className="text-gray-400 text-xs">
            Ce certificat est généré automatiquement à partir des données enregistrées
            sur la blockchain Polygon. Il ne peut pas être falsifié.
          </p>
          <Link href="/" className="inline-block mt-4 text-sm font-medium text-gray-700 hover:text-black transition">
            ← Retour à KATRYA
          </Link>
        </div>

      </div>
    </div>
  )
}
