import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import AddToWardrobeButton from './AddToWardrobeButton'

interface PageProps {
  params: { katryaId: string }
}

export default async function PassportPage({ params }: PageProps) {
  const { katryaId } = params
  const supabase = createClient()

  // Requeter le produit par katrya_id avec son passport et son organisation
  const { data: product } = await supabase
    .from('products')
    .select(`
      *,
      passports(*),
      organizations(name, slug)
    `)
    .eq('katrya_id', katryaId)
    .single()

  if (!product) {
    notFound()
  }

  // Recuperer le passport actif (version la plus recente)
  const passports = product.passports as any[]
  const passport = passports && passports.length > 0
    ? passports.sort((a: any, b: any) => b.version - a.version)[0]
    : null

  const org = product.organizations as any
  const publicData = passport?.public_data as any

  return (
    <main className="min-h-screen bg-black text-white p-6">
      <div className="max-w-lg mx-auto">
        <div className="mb-6">
          <p className="text-xs text-gray-500 uppercase tracking-widest">{org?.name || 'KATRYA'}</p>
          <h1 className="text-3xl font-bold mt-1">{product.brand} — {product.model_name}</h1>
          <p className="text-gray-400 mt-2">{product.category}</p>
        </div>
        <div className="border border-gray-800 rounded-xl p-4 mb-4">
          <h2 className="text-sm font-semibold text-gray-400 mb-3">PASSEPORT NUMÉRIQUE</h2>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">ID KATRYA</span>
              <span className="font-mono text-xs">{product.katrya_id}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Marque</span>
              <span>{product.brand}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Modèle</span>
              <span>{product.model_name}</span>
            </div>
            {product.serial_number && (
              <div className="flex justify-between">
                <span className="text-gray-500">N° Série</span>
                <span className="font-mono text-xs">{product.serial_number}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-gray-500">Statut</span>
              <span className="text-green-400">✓ Authentique</span>
            </div>
          </div>
        </div>
        {publicData && (
          <div className="border border-gray-800 rounded-xl p-4 mb-4">
            <h2 className="text-sm font-semibold text-gray-400 mb-3">INFORMATIONS</h2>
            <div className="space-y-2 text-sm">
              {Object.entries(publicData).map(([key, value]) => (
                <div key={key} className="flex justify-between">
                  <span className="text-gray-500 capitalize">{key.replace(/_/g, ' ')}</span>
                  <span className="text-gray-300">{String(value)}</span>
                </div>
              ))}
            </div>
          </div>
        )}
        <AddToWardrobeButton productId={product.id} katryaId={product.katrya_id} />
      </div>
    </main>
  )
}
