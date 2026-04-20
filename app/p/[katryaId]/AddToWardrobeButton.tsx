'use client'

import { useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { useRouter } from 'next/navigation'

interface Props {
  productId: string
  katryaId: string
}

export default function AddToWardrobeButton({ productId, katryaId }: Props) {
  const [loading, setLoading] = useState(false)
  const [added, setAdded] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const handleAdd = async () => {
    setLoading(true)
    setError('')
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        router.push(`/wardrobe/login?redirect=/p/${katryaId}`)
        return
      }
      const res = await fetch('/api/wardrobe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ product_id: productId }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Erreur serveur')
      }
      setAdded(true)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  if (added) {
    return (
      <div className="mt-6">
        <div className="w-full bg-green-900/30 border border-green-700 text-green-400 py-3 rounded-xl text-center font-medium">
          ✓ Ajouté à votre dressing
        </div>
        <button
          onClick={() => router.push('/wardrobe')}
          className="w-full mt-2 text-sm text-gray-400 hover:text-white underline text-center"
        >
          Voir mon dressing →
        </button>
      </div>
    )
  }

  return (
    <div className="mt-6">
      <button
        onClick={handleAdd}
        disabled={loading}
        className="w-full bg-white text-black py-3 rounded-xl font-semibold hover:bg-gray-200 transition-colors disabled:opacity-50 text-sm uppercase tracking-wider"
      >
        {loading ? 'Ajout en cours...' : '+ Ajouter à mon dressing'}
      </button>
      {error && (
        <p className="text-red-400 text-xs text-center mt-2">{error}</p>
      )}
    </div>
  )
}
