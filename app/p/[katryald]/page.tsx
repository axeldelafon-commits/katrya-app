import { createClient } from '@supabase/supabase-js'
import Image from 'next/image'
import { notFound } from 'next/navigation'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

interface ProductImage {
  id: string
  url: string
  position: number
  alt_text: string | null
}

interface Product {
  id: string
  katrya_id: string
  model_name: string | null
  brand: string | null
  category: string | null
  sku: string | null
  serial_number: string | null
  status: string | null
  created_at: string
  product_images: ProductImage[]
}

export default async function ProductPage({
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

  const images: ProductImage[] = product.product_images || []

  return (
    <main className="min-h-screen bg-black text-white">
      {/* Header */}
      <div className="border-b border-white/10 px-6 py-4 flex items-center justify-between">
        <span className="text-xs tracking-[0.3em] uppercase text-white/40">KATRYA</span>
        <span className="text-xs tracking-[0.2em] uppercase text-white/30">Passeport Produit</span>
      </div>

      <div className="max-w-2xl mx-auto px-6 py-10">
        {/* Product Images Gallery */}
        {images.length > 0 ? (
          <div className="mb-10">
            {/* Main image */}
            <div className="relative aspect-square w-full bg-white/5 rounded-xl overflow-hidden mb-3">
              <img
                src={images[0].url}
                alt={images[0].alt_text || product.model_name || 'Produit KATRYA'}
                className="w-full h-full object-cover"
              />
            </div>
            {/* Thumbnail row */}
            {images.length > 1 && (
              <div className="flex gap-2 overflow-x-auto pb-1">
                {images.slice(1).map((img) => (
                  <div key={img.id} className="flex-none w-20 h-20 bg-white/5 rounded-lg overflow-hidden">
                    <img
                      src={img.url}
                      alt={img.alt_text || ''}
                      className="w-full h-full object-cover"
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="mb-10 aspect-square w-full bg-white/5 rounded-xl flex items-center justify-center">
            <span className="text-white/20 text-sm">Aucune photo disponible</span>
          </div>
        )}

        {/* Product Info */}
        <div className="space-y-6">
          <div>
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
          <div className="flex items-center gap-3 bg-white/5 rounded-xl px-5 py-4">
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

          {/* Product details */}
          <div className="space-y-3">
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
            <div className="flex justify-between text-sm border-b border-white/5 pb-3">
              <span className="text-white/40">ID KATRYA</span>
              <span className="font-mono text-white/60 text-xs">{product.katrya_id}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-white/40">Enregistré le</span>
              <span className="text-white/60">{new Date(product.created_at).toLocaleDateString('fr-FR')}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="border-t border-white/10 px-6 py-6 text-center">
        <p className="text-xs text-white/20 tracking-widest uppercase">Powered by KATRYA NFC</p>
      </div>
    </main>
  )
}
