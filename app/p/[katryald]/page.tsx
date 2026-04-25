import { createClient } from '@supabase/supabase-js'
import { notFound } from 'next/navigation'
import Link from 'next/link'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export default async function ProductPassportPage({
  params,
}: {
  params: { katryald: string }
}) {
  const { katryald } = params

  const { data: product, error } = await supabase
    .from('products')
    .select('*, product_images(id, url, position, alt_text)')
    .eq('katrya_id', katryald)
    .order('position', { foreignTable: 'product_images', ascending: true })
    .single()

  if (error || !product) {
    notFound()
  }

  // Get latest published passport
  const { data: passport } = await supabase
    .from('passports')
    .select('*')
    .eq('product_id', product.id)
    .order('version', { ascending: false })
    .limit(1)
    .maybeSingle()

  const publicData = passport?.public_data || {}
  const images = product.product_images || []

  // Combine: product_images table first, then fallback to passport main_image_url
  const mainImageUrl = images.length > 0 ? images[0].url : publicData.main_image_url

  return (
    <main className="min-h-screen bg-black text-white">
      {/* Header */}
      <div className="border-b border-white/10 px-6 py-4 flex items-center justify-between">
        <span className="text-xs tracking-[0.3em] uppercase text-white/40">KATRYA</span>
        <span className="text-xs tracking-[0.2em] uppercase text-white/30">Passeport Produit</span>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-8">
        {/* Photos Gallery */}
        {mainImageUrl ? (
          <div className="mb-8">
            {/* Main image */}
            <div className="relative aspect-square w-full bg-white/5 rounded-2xl overflow-hidden mb-3">
              <img
                src={mainImageUrl}
                alt={product.model_name || 'Produit KATRYA'}
                className="w-full h-full object-cover"
              />
            </div>
            {/* Thumbnails from product_images */}
            {images.length > 1 && (
              <div className="flex gap-2 overflow-x-auto pb-1">
                {images.slice(1).map((img: { id: string; url: string; alt_text: string | null }) => (
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
          {product.brand && (
            <p className="text-xs tracking-[0.3em] uppercase text-white/40 mb-1">{product.brand}</p>
          )}
          <h1 className="text-2xl font-light tracking-wide">
            {product.model_name || 'Produit Authentique'}
          </h1>
          {product.category && (
            <p className="text-sm text-white/50 mt-1">{product.category}</p>
          )}
        </div>

        {/* Authentication badge */}
        <div className="flex items-center gap-3 bg-white/5 rounded-2xl px-5 py-4 mb-6">
          <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center flex-none">
            <svg className="w-4 h-4 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-medium text-green-400">Produit Authentifié</p>
            <p className="text-xs text-white/40">Vérifié par la puce NFC KATRYA</p>
          </div>
        </div>

        {/* Passport / Product details */}
        <div className="bg-white/5 rounded-2xl px-5 py-5 mb-6 space-y-3">
          <p className="text-xs tracking-[0.2em] uppercase text-white/30 mb-4">Passeport Numérique</p>
          {product.sku && (
            <div className="flex justify-between text-sm border-b border-white/5 pb-3">
              <span className="text-white/40">Référence</span>
              <span className="font-mono text-white/80">{product.sku}</span>
            </div>
          )}
          {product.serial_number && (
            <div className="flex justify-between text-sm border-b border-white/5 pb-3">
              <span className="text-white/40">N° de série</span>
              <span className="font-mono text-white/80">{product.serial_number}</span>
            </div>
          )}
          {publicData.size && (
            <div className="flex justify-between text-sm border-b border-white/5 pb-3">
              <span className="text-white/40">Taille</span>
              <span className="text-white/80">{publicData.size}</span>
            </div>
          )}
          {publicData.color && (
            <div className="flex justify-between text-sm border-b border-white/5 pb-3">
              <span className="text-white/40">Couleur</span>
              <span className="text-white/80">{publicData.color}</span>
            </div>
          )}
          {publicData.material_composition && (
            <div className="flex justify-between text-sm border-b border-white/5 pb-3">
              <span className="text-white/40">Matériau</span>
              <span className="text-white/80 text-right max-w-[60%]">{publicData.material_composition}</span>
            </div>
          )}
          {publicData.care_instructions && (
            <div className="flex justify-between text-sm border-b border-white/5 pb-3">
              <span className="text-white/40">Entretien</span>
              <span className="text-white/80 text-right max-w-[60%]">{publicData.care_instructions}</span>
            </div>
          )}
          {publicData.country_of_manufacture && (
            <div className="flex justify-between text-sm border-b border-white/5 pb-3">
              <span className="text-white/40">Origine</span>
              <span className="text-white/80">{publicData.country_of_manufacture}</span>
            </div>
          )}
          <div className="flex justify-between text-sm">
            <span className="text-white/40">ID KATRYA</span>
            <span className="font-mono text-white/60 text-xs">{product.katrya_id}</span>
          </div>
        </div>

        {/* Add to wardrobe */}
        <Link
          href={`/wardrobe/login?product_id=${product.id}&redirect=/p/${product.katrya_id}`}
          className="block w-full text-center bg-white text-black font-semibold py-4 rounded-2xl text-sm tracking-widest uppercase hover:bg-white/90 transition-colors"
        >
          + Ajouter à mon Dressing
        </Link>
      </div>

      {/* Footer */}
      <div className="border-t border-white/10 px-6 py-6 text-center mt-8">
        <p className="text-xs text-white/20 tracking-widest uppercase">Powered by KATRYA NFC</p>
      </div>
    </main>
  )
}
