'use client'

import { useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { useRouter } from 'next/navigation'

interface Props {
  productId: string
  katryaId: string
  /**
   * Couleur du bouton. Sur fond blanc, un bouton blanc serait invisible : le
   * passeport transmet ici l'encre de la marque, deja validee en contraste.
   */
  accent?: string
}

export default function AddToWardrobeButton({ productId, katryaId, accent = '#111111' }: Props) {
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
        <div className="w-full bg-emerald-50 border border-emerald-300 text-emerald-800 py-3 rounded-xl text-center font-medium">
          ✓ Ajouté à votre dressing
        </div>
        <button
          onClick={() => router.push('/wardrobe')}
          className="w-full mt-2 text-sm underline text-center hover:opacity-70"
          style={{ color: 'var(--pp-label)' }}
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
        className="w-full text-white py-3 rounded-xl font-semibold transition-opacity hover:opacity-85 disabled:opacity-50 text-sm uppercase tracking-wider"
        style={{ backgroundColor: accent }}
      >
        {loading ? 'Ajout en cours...' : '+ Ajouter à mon dressing'}
      </button>
      {error && (
        <p className="text-red-700 text-xs text-center mt-2">{error}</p>
      )}
    </div>
  )
}
