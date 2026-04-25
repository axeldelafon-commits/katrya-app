import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import AddToWardrobeButton from './AddToWardrobeButton'

interface PageProps {
  params: { katryaId: string }
}

export default async function PassportPage({ params }: PageProps) {
  const { katryaId } = params
  const supabase = createClient()

  // Fetch product by katrya_id with passport, organization, and images
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

  if (!product) {
    notFound()
  }

  // Get latest passport (most recent version)
  const passports = product.passports as any[]
  const passport = passports && passports.length > 0
    ? passports.sort((a: any, b: any) => b.version - a.version)[0]
    : null

  const org = product.organizations as any
  const publicData = passport?.public_data as any

  // Sort images by position
  const images = ((product.product_images as any[]) || []).sort(
    (a: any, b: any) => a.position - b.position
  )

  // Main image: from product_images first, then passport public_data main_image_url
  const mainImageUrl = images.length > 0
    ? images[0].url
    : publicData?.main_image_url || null

  return (
    <main className="min-h-screen bg-black text-white">
      {/* Header */}
      <div className="border-b border-white/10 px-6 py-4 flex items-center justify-between">
        <span className="text-xs tracking-[0.3em] uppercase text-white/40">{org?.name || 'KATRYA'}</span>
        <span className="text-xs tracking-[0.2em] uppercase text-white/30">Passeport Produit</span>
      </div>

      <div className="max-w-lg mx-auto px-4 py-8">
        {/* Photo gallery */}
        {mainImageUrl ? (
          <div className="mb-8">
            <div className="aspect-square w-full bg-white/5 rounded-2xl overflow-hidden mb-3">
              <img
                src={mainImageUrl}
                alt={product.model_name || 'Produit'}
                className="w-full h-full object-cover"
              />
            </div>
            {images.length > 1 && (
              <div className="flex gap-2 overflow-x-auto pb-1">
                {images.slice(1).map((img: any) => (
                  <div key={img.id} className="flex-none w-20 h-20 bg-white/5 rounded-xl overflow-hidden">
                    <img src={img.url} alt={img.alt_text || ''} className="w-full h-full object-cover" />
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="mb-8 aspect-square w-full bg-white/5 rounded-2xl flex items-center justify-center">
            <span className="text-white/20 text-sm">Aucune photo disponible</span>
          </div>
        )}

        {/* Product title */}
        <div className="mb-6">
          <p className="text-xs text-white/40 uppercase tracking-widest">{org?.name || 'KATRYA'}</p>
          <h1 className="text-3xl font-bold mt-1">{product.brand} — {product.model_name}</h1>
          <p className="text-white/40 mt-2">{product.category}</p>
        </div>

        {/* Passport numérique */}
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

        {/* Public passport data (size, color, etc.) */}
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

        <AddToWardrobeButton productId={product.id} katryaId={product.katrya_id} />
      </div>

      {/* Footer */}
      <div className="border-t border-white/10 px-6 py-6 text-center mt-4">
        <p className="text-xs text-white/20 tracking-widest uppercase">Powered by KATRYA NFC</p>
      </div>
    </main>
  )
}
