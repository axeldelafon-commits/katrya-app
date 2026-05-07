import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import AddToWardrobeButton from './AddToWardrobeButton'
import ImageGallery from './ImageGallery'

interface PageProps {
  params: { katryaId: string }
}

export default async function PassportPage({ params }: PageProps) {
  const { katryaId } = params
  const supabase = createClient()

  const { data: product } = await supabase
    .from('products')
    .select(`
      *,
      passports(*),
      organizations(name, slug),
      product_images(id, url, position, alt_text)
    `)
    .eq('katrya_id', katryaId)
    .single()

  if (!product) notFound()

  const passports = product.passports as any[]
  const passport = passports && passports.length > 0
    ? passports.sort((a: any, b: any) => b.version - a.version)[0]
    : null

  const org = product.organizations as any
  const publicData = passport?.public_data as any
  const images = ((product.product_images as any[]) || []).sort(
    (a: any, b: any) => a.position - b.position
  )
  const fallbackUrl = publicData?.main_image_url || null

  // Certificat NFT
  const { data: nftCert } = await supabase
    .from('nft_certificates')
    .select('token_id, transaction_hash, contract_address, owner_address, status, minted_at')
    .eq('katrya_id', katryaId)
    .maybeSingle()

  return (
    <main className="min-h-screen bg-black text-white">
      <div className="border-b border-white/10 px-6 py-4 flex items-center justify-between">
        <span className="text-xs tracking-[0.3em] uppercase text-white/40">{org?.name || 'KATRYA'}</span>
        <div className="flex items-center gap-3">
          <span className="text-xs tracking-[0.2em] uppercase text-white/30">Passeport Produit</span>
          <Link
            href="/wardrobe"
            className="text-xs tracking-[0.2em] uppercase text-white/60 border border-white/20 px-3 py-1 rounded-full hover:border-white/50 hover:text-white transition-colors"
          >
            Mon dressing
          </Link>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-8">
        <ImageGallery
          images={images}
          productName={`${product.brand} ${product.model_name}`}
          fallbackUrl={fallbackUrl}
        />

        <div className="mb-6">
          <p className="text-xs text-white/40 uppercase tracking-widest">{org?.name || 'KATRYA'}</p>
          <h1 className="text-3xl font-bold mt-1">{product.brand} — {product.model_name}</h1>
          <p className="text-white/40 mt-2">{product.category}</p>
        </div>

        <div className="border border-white/10 rounded-xl p-4 mb-4">
          <h2 className="text-sm font-semibold text-white/40 mb-3">PASSEPORT NUMÉRIQUE</h2>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-white/40">ID KATRYA</span>
              <span className="font-mono text-xs">{product.katrya_id}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-white/40">Marque</span>
              <span>{product.brand}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-white/40">Modèle</span>
              <span>{product.model_name}</span>
            </div>
            {product.serial_number && (
              <div className="flex justify-between">
                <span className="text-white/40">N° Série</span>
                <span className="font-mono text-xs">{product.serial_number}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-white/40">Statut</span>
              <span className="text-green-400">✓ Authentique</span>
            </div>
          </div>
        </div>

        {publicData && (
          <div className="border border-white/10 rounded-xl p-4 mb-4">
            <h2 className="text-sm font-semibold text-white/40 mb-3">INFORMATIONS</h2>
            <div className="space-y-2 text-sm">
              {Object.entries(publicData)
                .filter(([key]) => key !== 'main_image_url')
                .map(([key, value]) => (
                  <div key={key} className="flex justify-between">
                    <span className="text-white/40 capitalize">{key.replace(/_/g, ' ')}</span>
                    <span className="text-white/70">{String(value)}</span>
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* === CERTIFICATION BLOCKCHAIN === */}
        {nftCert ? (
          <div className="border border-purple-500/30 bg-purple-950/20 rounded-xl p-4 mb-4">
            <div className="flex items-center gap-2 mb-3">
              <span style={{ fontSize: 16 }}>⚡</span>
              <h2 className="text-sm font-semibold text-purple-300 uppercase tracking-widest">Certifié Blockchain</h2>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-white/40">Réseau</span>
                <span className="text-purple-300 font-semibold">Polygon Mainnet</span>
              </div>
              <div className="flex justify-between">
                <span className="text-white/40">Token ID</span>
                <span className="font-mono text-xs text-white">#{nftCert.token_id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-white/40">Propriétaire</span>
                <span className="font-mono text-xs text-white/70">
                  {nftCert.owner_address.slice(0, 6)}...{nftCert.owner_address.slice(-4)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-white/40">Certifié le</span>
                <span className="text-white/70 text-xs">
                  {new Date(nftCert.minted_at).toLocaleDateString('fr-FR')}
                </span>
              </div>
              <div className="pt-2 flex gap-3 flex-wrap">
                <a
                  href={`https://polygonscan.com/tx/${nftCert.transaction_hash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-cyan-400 hover:text-cyan-300 underline underline-offset-2"
                >
                  Voir la transaction ↗
                </a>
                <a
                  href={`https://polygonscan.com/token/${nftCert.contract_address}?a=${nftCert.token_id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-cyan-400 hover:text-cyan-300 underline underline-offset-2"
                >
                  Voir le NFT ↗
                </a>
              </div>
            </div>
          </div>
        ) : (
          <div className="border border-white/5 rounded-xl p-4 mb-4">
            <div className="flex items-center gap-2">
              <span style={{ fontSize: 14, opacity: 0.3 }}>⚡</span>
              <p className="text-xs text-white/30">Certification blockchain en attente</p>
            </div>
          </div>
        )}

        <AddToWardrobeButton productId={product.id} katryaId={product.katrya_id} />
      </div>

      <div className="border-t border-white/10 px-6 py-6 text-center mt-4">
        <p className="text-xs text-white/20 tracking-widest uppercase">Powered by KATRYA NFC</p>
      </div>
    </main>
  )
}
