'use client'

import { useEffect, useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import type { Wardrobe3DItem } from './Wardrobe3D'

// Lazy-load the 3D view (Three.js is ~600KB) only when the user opts in
const Wardrobe3D = dynamic(() => import('./Wardrobe3D'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-full text-gray-500 text-sm">
      Chargement de la vue 3D...
    </div>
  ),
})

interface WardrobeItem {
  id: string
  product_id: string
  added_at: string
  notes: string | null
  is_favorite: boolean
  products: {
    katrya_id: string
    brand: string
    model_name: string
    category: string
    status: string
    product_images?: { url: string; position: number }[]
  }
}

export default function WardrobePage() {
  const [items, setItems] = useState<WardrobeItem[]>([])
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [debugMsg, setDebugMsg] = useState<string>('init')
  const [filter, setFilter] = useState<'all' | 'favorites'>('all')
  const [view, setView] = useState<'2d' | '3d'>('2d')

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  useEffect(() => {
    // Hard safety net: if anything hangs for more than 8s,
    // bail out of the loading state so the user sees something.
    const safetyTimeout = setTimeout(() => {
      setLoading(false)
      setDebugMsg('timeout: bail out after 8s')
    }, 8000)

    // Helper: race a promise against a timeout.
    // supabase.auth.getUser() can hang forever when the cached JWT is corrupt
    // or when the refresh-token loop deadlocks. We never want to await it for
    // more than 4s.
    const withTimeout = <T,>(promise: Promise<T>, ms: number, label: string): Promise<T> => {
      return Promise.race([
        promise,
        new Promise<T>((_, reject) =>
          setTimeout(() => reject(new Error(`${label} timeout after ${ms}ms`)), ms)
        ),
      ])
    }

    const init = async () => {
      try {
        // Prefer getSession() (synchronous read of localStorage, never blocks)
        // over getUser() (network call, can hang on bad JWT).
        setDebugMsg('reading session')
        const { data: { session } } = await withTimeout(
          supabase.auth.getSession(),
          4000,
          'getSession'
        )
        const sessionUser = session?.user ?? null
        setUser(sessionUser)
        setDebugMsg(sessionUser ? `user found (${sessionUser.email}), loading wardrobe` : 'no session')
        if (sessionUser) {
          await loadWardrobe(sessionUser.id)
          setDebugMsg('wardrobe loaded')
        }
      } catch (err: any) {
        console.error('[wardrobe] init failed:', err)
        setDebugMsg('init failed: ' + (err?.message || String(err)))
      } finally {
        // CRITICAL: always exit the loading state, even on error,
        // otherwise the page is stuck on "Chargement..." forever.
        clearTimeout(safetyTimeout)
        setLoading(false)
      }
    }
    init()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      setUser(session?.user ?? null)
      if (session?.user) {
        try {
          await loadWardrobe(session.user.id)
        } catch (err) {
          console.error('[wardrobe] loadWardrobe (auth change) failed:', err)
        }
      } else {
        setItems([])
      }
    })

    return () => subscription.unsubscribe()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const loadWardrobe = async (userId: string) => {
    // Pull the first product image alongside basic product info so the 3D view
    // can render real photos instead of category emojis.
    // Defense in depth: explicit user_id filter on top of RLS.
    const { data, error } = await supabase
      .from('wardrobe_items')
      .select(`
        id, product_id, added_at, notes, is_favorite,
        products(
          katrya_id, brand, model_name, category, status,
          product_images(url, position)
        )
      `)
      .eq('user_id', userId)
      .order('added_at', { ascending: false })
    if (error) {
      console.error('[wardrobe] loadWardrobe error:', error.message)
      return
    }
    if (data) setItems(data as any)
  }

  const toggleFavorite = async (itemId: string, current: boolean) => {
    await supabase
      .from('wardrobe_items')
      .update({ is_favorite: !current })
      .eq('id', itemId)
    setItems(prev => prev.map(i => i.id === itemId ? { ...i, is_favorite: !current } : i))
  }

  const removeFromWardrobe = async (itemId: string) => {
    await supabase.from('wardrobe_items').delete().eq('id', itemId)
    setItems(prev => prev.filter(i => i.id !== itemId))
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    setUser(null)
    setItems([])
  }

  const displayedItems = filter === 'favorites' ? items.filter(i => i.is_favorite) : items

  // Map to 3D items: pick the lowest-position image as the visual
  const items3D: Wardrobe3DItem[] = displayedItems
    .map((it) => {
      const p = it.products
      if (!p) return null
      const sortedImages = (p.product_images || [])
        .slice()
        .sort((a, b) => a.position - b.position)
      const imageUrl = sortedImages[0]?.url ?? null
      return {
        id: it.id,
        product_id: it.product_id,
        katrya_id: p.katrya_id,
        brand: p.brand,
        model_name: p.model_name,
        category: p.category,
        image_url: imageUrl,
        is_favorite: it.is_favorite,
      } as Wardrobe3DItem
    })
    .filter((x): x is Wardrobe3DItem => x !== null)

  const categoryEmoji: Record<string, string> = {
    outerwear: '🧥',
    tops: '👕',
    bottoms: '👖',
    shoes: '👟',
    accessories: '👜',
    default: '👗'
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-gray-500 text-sm text-center">
          <div>Chargement...</div>
          <div className="mt-2 text-xs text-gray-700">{debugMsg}</div>
        </div>
      </main>
    )
  }

  if (!user) {
    return (
      <main className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-6">
        <div className="max-w-sm w-full text-center">
          <p className="text-4xl mb-4">👗</p>
          <h1 className="text-2xl font-bold mb-2">Mon Dressing</h1>
          <p className="text-gray-400 mb-8 text-sm">Connecte-toi pour accéder à ta collection personnelle KATRYA</p>
          <Link
            href="/wardrobe/login"
            className="block w-full bg-white text-black py-3 rounded-xl font-semibold hover:bg-gray-100 transition"
          >
            Se connecter
          </Link>
          <Link href="/" className="block mt-4 text-gray-500 text-sm hover:text-gray-300">
            Retour à l&apos;accueil
          </Link>
        </div>
      </main>
    )
  }

  // 3D fullscreen layout
  if (view === '3d') {
    return (
      <main className="h-screen w-screen bg-black text-white overflow-hidden flex flex-col">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-900 bg-black/80 backdrop-blur z-10">
          <div>
            <h1 className="text-lg font-bold">👗 Mon Dressing 3D</h1>
            <p className="text-xs text-gray-500">
              {displayedItems.length} pièce{displayedItems.length !== 1 ? 's' : ''}
              {filter === 'favorites' && ' · favoris'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setView('2d')}
              className="px-3 py-1.5 rounded-full text-xs font-medium bg-gray-900 text-gray-400 hover:bg-gray-800 transition"
            >
              ← Vue grille
            </button>
            <button
              onClick={handleSignOut}
              className="text-xs text-gray-500 hover:text-gray-300 transition px-2"
            >
              Déconnexion
            </button>
          </div>
        </div>
        <div className="flex-1 relative">
          <Wardrobe3D items={items3D} />
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-black text-white">
      {/* Header */}
      <div className="sticky top-0 bg-black border-b border-gray-900 px-4 py-4 z-10">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">👗 Mon Dressing</h1>
            <p className="text-xs text-gray-500">{items.length} pièce{items.length !== 1 ? 's' : ''}</p>
          </div>
          <button
            onClick={handleSignOut}
            className="text-xs text-gray-500 hover:text-gray-300 transition"
          >
            Déconnexion
          </button>
        </div>
      </div>

      <div className="max-w-lg mx-auto p-4">
        {/* Filtres + toggle vue */}
        {items.length > 0 && (
          <div className="flex gap-2 mb-6 items-center justify-between flex-wrap">
            <div className="flex gap-2">
              <button
                onClick={() => setFilter('all')}
                className={`px-4 py-2 rounded-full text-sm font-medium transition ${
                  filter === 'all'
                    ? 'bg-white text-black'
                    : 'bg-gray-900 text-gray-400 hover:bg-gray-800'
                }`}
              >
                Tout ({items.length})
              </button>
              <button
                onClick={() => setFilter('favorites')}
                className={`px-4 py-2 rounded-full text-sm font-medium transition ${
                  filter === 'favorites'
                    ? 'bg-white text-black'
                    : 'bg-gray-900 text-gray-400 hover:bg-gray-800'
                }`}
              >
                ♥ Favoris ({items.filter(i => i.is_favorite).length})
              </button>
            </div>
            <button
              onClick={() => setView('3d')}
              className="px-4 py-2 rounded-full text-sm font-medium bg-gradient-to-r from-cyan-500 to-blue-600 text-white hover:opacity-90 transition flex items-center gap-1.5"
              title="Voir mon dressing en 3D"
            >
              <span>✨</span>
              <span>Vue 3D</span>
            </button>
          </div>
        )}

        {/* Grille des articles */}
        {displayedItems.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-5xl mb-4">{filter === 'favorites' ? '♥' : '👗'}</p>
            <p className="text-gray-400 text-sm">
              {filter === 'favorites'
                ? 'Aucun favori pour l’instant.'
                : 'Ton dressing est vide.\nScanne une puce NFC KATRYA pour commencer !'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {displayedItems.map(item => {
              const p = item.products
              const emoji = categoryEmoji[p?.category] || categoryEmoji.default
              const sortedImages = (p?.product_images || [])
                .slice()
                .sort((a, b) => a.position - b.position)
              const cover = sortedImages[0]?.url
              return (
                <div
                  key={item.id}
                  className="bg-gray-950 border border-gray-800 rounded-2xl p-4 relative"
                >
                  {/* Image ou Emoji catégorie */}
                  {cover ? (
                    <div className="aspect-square mb-3 rounded-xl overflow-hidden bg-gray-900">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={cover}
                        alt={p?.model_name || ''}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none'
                        }}
                      />
                    </div>
                  ) : (
                    <div className="text-3xl mb-3 text-center">{emoji}</div>
                  )}

                  {/* Infos */}
                  <Link href={`/p/${p?.katrya_id}`}>
                    <p className="text-xs text-gray-500 uppercase tracking-wider">{p?.brand}</p>
                    <p className="font-semibold text-sm mt-0.5 leading-tight">{p?.model_name}</p>
                    <p className="text-xs text-gray-600 mt-1 capitalize">{p?.category}</p>
                  </Link>

                  {/* ID */}
                  <p className="text-xs font-mono text-gray-700 mt-2">{p?.katrya_id}</p>

                  {/* Actions */}
                  <div className="flex justify-between items-center mt-3 pt-3 border-t border-gray-800">
                    <button
                      onClick={() => toggleFavorite(item.id, item.is_favorite)}
                      className={`text-lg transition ${
                        item.is_favorite ? 'text-red-400' : 'text-gray-700 hover:text-gray-400'
                      }`}
                      title={item.is_favorite ? 'Retirer des favoris' : 'Ajouter aux favoris'}
                    >
                      {item.is_favorite ? '♥' : '♡'}
                    </button>
                    <button
                      onClick={() => removeFromWardrobe(item.id)}
                      className="text-xs text-gray-700 hover:text-red-400 transition"
                      title="Retirer du dressing"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Date d'ajout */}
        <p className="text-center text-xs text-gray-700 mt-8">
          {user.email}
        </p>
      </div>
    </main>
  )
}
