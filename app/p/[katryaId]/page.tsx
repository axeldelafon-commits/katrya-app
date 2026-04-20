import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'

interface PageProps {
  params: { katryaId: string }
}

export default async function PassportPage({ params }: PageProps) {
  const { katryaId } = params
  const supabase = createClient()

  const { data: passport } = await supabase
    .from('passports')
    .select(`
      *,
      products(*),
      organizations(name)
    `)
    .eq('katrya_id', katryaId)
    .single()

  if (!passport) {
    notFound()
  }

  const product = passport.products as any
  const org = passport.organizations as any

  return (
    <main className="min-h-screen bg-black text-white p-6">
      <div className="max-w-lg mx-auto">
        <div className="mb-6">
          <p className="text-xs text-gray-500 uppercase tracking-widest">{org?.name}</p>
          <h1 className="text-3xl font-bold mt-1">{product?.name}</h1>
          <p className="text-gray-400 mt-2">{product?.description}</p>
        </div>

        <div className="border border-gray-800 rounded-xl p-4 mb-4">
          <h2 className="text-sm font-semibold text-gray-400 mb-3">PASSEPORT NUMÉRIQUE</h2>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">ID KATRYA</span>
              <span className="font-mono text-xs">{passport.katrya_id}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Statut</span>
              <span className="text-green-400">✓ Authentique</span>
            </div>
          </div>
        </div>

        {passport.public_data && (
          <div className="border border-gray-800 rounded-xl p-4">
            <h2 className="text-sm font-semibold text-gray-400 mb-3">INFORMATIONS</h2>
            <pre className="text-xs text-gray-300 whitespace-pre-wrap">
              {JSON.stringify(passport.public_data, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </main>
  )
}
