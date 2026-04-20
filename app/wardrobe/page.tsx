'use client'

import { useEffect, useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import Link from 'next/link'

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
  }
}

export default function WardrobePage() {
  const [items, setItems] = useState<WardrobeItem[]>([])
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'favorites'>('all')

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)
      if (user) {
        await loadWardrobe()
      }
      setLoading(false)
    }
    init()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      setUser(session?.user ?? null)
      if (session?.user) {
        await loadWardrobe()
      } else {
        setItems([])
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  const loadWardrobe = async () => {
    const { data, error } = await supabase
      .from('wardrobe_items')
      .select(`
        id, product_id, added_at, notes, is_favorite,
        products(katrya_id, brand, model_name, category, status)
      `)
      .order('added_at', { ascending: false })
    if (!error && data) setItems(data as any)
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
        <div className="text-gray-500 text-sm">Chargement...</div>
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
        {/* Filtres */}
        {items.length > 0 && (
          <div className="flex gap-2 mb-6">
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
              return (
                <div
                  key={item.id}
                  className="bg-gray-950 border border-gray-800 rounded-2xl p-4 relative"
                >
                  {/* Emoji catégorie */}
                  <div className="text-3xl mb-3 text-center">{emoji}</div>

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
