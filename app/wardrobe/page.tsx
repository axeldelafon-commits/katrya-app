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

// Correspond aux colonnes réelles de la table nft_certificates
interface NftCertificate {
  token_id: string
  transaction_hash: string
  contract_address: string
  chain: string
  owner_address: string | null
  minted_at: string
  status: string
}

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
  nft?: NftCertificate | null
}

function KatryaMenu() {
  return (
    <nav className="sticky top-0 z-20 bg-black border-b border-white/5">
      <div className="max-w-4xl mx-auto px-4 h-12 flex items-center">
        <Link
          href="/"
          className="text-white font-semibold tracking-widest text-sm uppercase hover:opacity-70 transition"
        >
          KATRYA
        </Link>
      </div>
    </nav>
  )
}

export default function WardrobePage() {
  const [items, setItems] = useState<WardrobeItem[]>([])
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'favorites'>('all')
  const [view, setView] = useState<'2d' | '3d'>('2d')
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  useEffect(() => {
    const safetyTimeout = setTimeout(() => {
      setLoading(false)
    }, 8000)

    const withTimeout = <T,>(promise: Promise<T>, ms: number, label: string): Promise<T> => {
      return Promise.race([
        promise,
        new Promise<T>((_, reject) =>
          setTimeout(() => reject(new Error(`${label} timeout after ${ms}ms`)), ms)
        ),
      ])
    }

    let didLoad = false
    const tryLoad = async (sessionUser: any) => {
      if (didLoad || !sessionUser) return
      didLoad = true
      try {
        await loadWardrobe(sessionUser.id)
      } catch (err: any) {
        console.error('[wardrobe] loadWardrobe failed:', err)
      }
    }

    const init = async () => {
      try {
        const { data: { session } } = await withTimeout(
          supabase.auth.getSession(),
          4000,
          'getSession'
        )
        const sessionUser = session?.user ?? null
        setUser(sessionUser)
        if (sessionUser) {
          await tryLoad(sessionUser)
        }
      } catch (err: any) {
        console.error('[wardrobe] init failed:', err)
      } finally {
        clearTimeout(safetyTimeout)
        setLoading(false)
      }
    }

    init()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      const sessionUser = session?.user ?? null
      setUser(sessionUser)
      if (sessionUser) {
        await tryLoad(sessionUser)
      } else {
        setItems([])
      }
    })

    return () => subscription.unsubscribe()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const loadWardrobe = async (userId: string) => {
    const { data, error } = await supabase
      .from('wardrobe_items')
      .select(`
        id,
        product_id,
        added_at,
        notes,
        is_favorite,
        products(
          katrya_id,
          brand,
          model_name,
          category,
          status,
          product_images(url, position)
        )
      `)
      .eq('user_id', userId)
      .order('added_at', { ascending: false })

    if (error) {
      console.error('[wardrobe] loadWardrobe error:', error.message)
      return
    }

    if (!data) return

    const productIds = data.map((i: any) => i.product_id).filter(Boolean)

    let nftMap: Record<string, NftCertificate> = {}
    if (productIds.length > 0) {
      const { data: nfts } = await supabase
        .from('nft_certificates')
        .select('product_id, token_id, transaction_hash, contract_address, chain, owner_address, minted_at, status')
        .in('product_id', productIds)
      if (nfts) {
        for (const n of nfts) {
          nftMap[n.product_id] = n as NftCertificate
        }
      }
    }

    const merged = data.map((i: any) => ({
      ...i,
      nft: nftMap[i.product_id] ?? null,
    }))

    setItems(merged as WardrobeItem[])
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

  const displayedItems = filter === 'favorites'
    ? items.filter(i => i.is_favorite)
    : items

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
    outerwear: '\uD83E\uDDE5',
    tops: '\uD83D\uDC55',
    bottoms: '\uD83D\uDC56',
    shoes: '\uD83D\uDC5F',
    accessories: '\uD83D\uDC5C',
    default: '\uD83D\uDC57'
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <p className="text-gray-500 text-sm">Chargement...</p>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center gap-6 px-4">
        <div className="text-6xl">\uD83D\uDC57</div>
        <h1 className="text-2xl font-bold tracking-widest uppercase">Mon Dressing</h1>
        <p className="text-gray-400 text-sm text-center max-w-xs">
          Connecte-toi pour acc\u00E9der \u00E0 ta collection personnelle KATRYA
        </p>
        <div className="flex gap-3">
          <Link href="/auth" className="px-6 py-2.5 bg-white text-black text-sm font-semibold rounded-full hover:opacity-90 transition">
            Se connecter
          </Link>
          <Link href="/" className="px-6 py-2.5 bg-gray-900 text-gray-300 text-sm font-semibold rounded-full hover:bg-gray-800 transition">
            Retour \u00E0 l'accueil
          </Link>
        </div>
      </div>
    )
  }

  if (view === '3d') {
    return (
      <div className="min-h-screen bg-black flex flex-col">
        <KatryaMenu />
        <div className="px-4 py-3 flex items-center justify-between border-b border-white/5">
          <div>
            <h1 className="text-lg font-bold tracking-widest uppercase">\uD83D\uDC57 Mon Dressing 3D</h1>
            <p className="text-xs text-gray-500 mt-0.5">
              {displayedItems.length} pi\u00E8ce{displayedItems.length !== 1 ? 's' : ''}
              {filter === 'favorites' && ' \u00B7 favoris'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setView('2d')}
              className="px-3 py-1.5 rounded-full text-xs font-medium bg-gray-900 text-gray-400 hover:bg-gray-800 transition mr-2"
            >
              \u2190 Vue grille
            </button>
            <button onClick={handleSignOut} className="text-xs text-gray-500 hover:text-gray-300 transition">
              D\u00E9connexion
            </button>
          </div>
        </div>
        <div className="flex-1">
          <Wardrobe3D items={items3D} />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <KatryaMenu />

      <div className="max-w-4xl mx-auto px-4 pt-8 pb-4">
        <div className="flex items-end justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-widest uppercase">\uD83D\uDC57 Mon Dressing</h1>
            <p className="text-xs text-gray-500 mt-1">{items.length} pi\u00E8ce{items.length !== 1 ? 's' : ''}</p>
          </div>
          <button onClick={handleSignOut} className="text-xs text-gray-500 hover:text-gray-300 transition">
            D\u00E9connexion
          </button>
        </div>

        {items.length > 0 && (
          <div className="flex gap-2 mt-4 flex-wrap">
            <button
              onClick={() => setFilter('all')}
              className={`px-4 py-2 rounded-full text-sm font-medium transition ${
                filter === 'all' ? 'bg-white text-black' : 'bg-gray-900 text-gray-400 hover:bg-gray-800'
              }`}
            >
              Tout ({items.length})
            </button>
            <button
              onClick={() => setFilter('favorites')}
              className={`px-4 py-2 rounded-full text-sm font-medium transition ${
                filter === 'favorites' ? 'bg-white text-black' : 'bg-gray-900 text-gray-400 hover:bg-gray-800'
              }`}
            >
              \u2665 Favoris ({items.filter(i => i.is_favorite).length})
            </button>
            <button
              onClick={() => setView('3d')}
              className="px-4 py-2 rounded-full text-sm font-medium bg-gradient-to-r from-cyan-500 to-blue-600 text-white hover:opacity-90 transition flex items-center gap-1.5"
              title="Voir mon dressing en 3D"
            >
              \u2728 Vue 3D
            </button>
          </div>
        )}
      </div>

      <div className="max-w-4xl mx-auto px-4 pb-12">
        {displayedItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <div className="text-5xl">{filter === 'favorites' ? '\u2665' : '\uD83D\uDC57'}</div>
            <p className="text-gray-500 text-sm text-center whitespace-pre-line">
              {filter === 'favorites'
                ? 'Aucun favori pour l\u2019instant.'
                : 'Ton dressing est vide.\nScanne une puce NFC KATRYA pour commencer !'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {displayedItems.map(item => {
              const p = item.products
              const emoji = categoryEmoji[p?.category] || categoryEmoji.default
              const sortedImages = (p?.product_images || [])
                .slice()
                .sort((a, b) => a.position - b.position)
              const cover = sortedImages[0]?.url
              const nft = item.nft
              const polygonscanBase = 'https://polygonscan.com'

              return (
                <div key={item.id} className="bg-gray-950 border border-white/5 rounded-2xl overflow-hidden flex flex-col">
                  <div className="aspect-square bg-gray-900 flex items-center justify-center relative">
                    {cover ? (
                      <div className="w-full h-full">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={cover}
                          alt={p?.model_name}
                          className="w-full h-full object-cover"
                          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
                        />
                      </div>
                    ) : (
                      <span className="text-4xl">{emoji}</span>
                    )}
                    {nft && nft.status !== 'pending' && (
                      <div className="absolute top-2 right-2 bg-cyan-500/90 text-black text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                        <span>&#9830;</span>
                        <span>NFT</span>
                      </div>
                    )}
                  </div>

                  <div className="p-3 flex flex-col gap-1 flex-1">
                    <p className="text-xs text-gray-500 uppercase tracking-wider">{p?.brand}</p>
                    <p className="text-sm font-medium leading-tight">{p?.model_name}</p>
                    <p className="text-xs text-gray-600 capitalize">{p?.category}</p>

                    {nft && nft.status === 'minted' ? (
                      <div className="mt-2 p-2 bg-cyan-950/40 border border-cyan-500/20 rounded-xl">
                        <p className="text-[10px] text-cyan-400 font-semibold uppercase tracking-wider mb-1">Certifi\u00E9 blockchain</p>
                        <p className="text-[10px] text-gray-400">Token #{nft.token_id} \u00B7 Polygon</p>
                        <div className="flex gap-2 mt-1.5 flex-wrap">
                          <a
                            href={`${polygonscanBase}/tx/${nft.transaction_hash}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[10px] text-cyan-400 hover:text-cyan-300 underline underline-offset-2"
                          >
                            Voir la transaction
                          </a>
                          <a
                            href={`${polygonscanBase}/token/${nft.contract_address}?a=${nft.token_id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[10px] text-cyan-400 hover:text-cyan-300 underline underline-offset-2"
                          >
                            Voir le NFT
                          </a>
                        </div>
                      </div>
                    ) : nft && nft.status === 'transferred' ? (
                      <div className="mt-2 p-2 bg-violet-950/40 border border-violet-500/20 rounded-xl">
                        <p className="text-[10px] text-violet-400 font-semibold uppercase tracking-wider mb-1">Propri\u00E9taire v\u00E9rifi\u00E9</p>
                        <p className="text-[10px] text-gray-400">Token #{nft.token_id} \u00B7 Polygon</p>
                        <div className="flex gap-2 mt-1.5 flex-wrap">
                          <a
                            href={`${polygonscanBase}/tx/${nft.transaction_hash}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[10px] text-violet-400 hover:text-violet-300 underline underline-offset-2"
                          >
                            Voir la transaction
                          </a>
                        </div>
                      </div>
                    ) : (
                      <div className="mt-2 flex items-center gap-1">
                        <span style={{ fontSize: 11, opacity: 0.3 }}>&#9830;</span>
                        <p className="text-[10px] text-white/20">Certification en attente</p>
                      </div>
                    )}

                    <p className="text-xs text-gray-700 font-mono mt-auto pt-2">{p?.katrya_id}</p>

                    <div className="flex items-center justify-between mt-2">
                      <button
                        onClick={() => toggleFavorite(item.id, item.is_favorite)}
                        className={`text-lg transition ${
                          item.is_favorite ? 'text-red-400' : 'text-gray-700 hover:text-gray-400'
                        }`}
                        title={item.is_favorite ? 'Retirer des favoris' : 'Ajouter aux favoris'}
                      >
                        {item.is_favorite ? '\u2665' : '\u2661'}
                      </button>
                      <div className="flex items-center gap-3">
                        <Link
                          href={`/p/${p?.katrya_id}`}
                          className="text-xs text-gray-600 hover:text-gray-300 transition"
                          title="Voir le passeport"
                        >
                          Passeport &#8599;
                        </Link>
                        <button
                          onClick={() => removeFromWardrobe(item.id)}
                          className="text-xs text-gray-700 hover:text-red-400 transition"
                          title="Retirer du dressing"
                        >
                          \u2715
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      <div className="border-t border-white/5 py-4">
        <p className="text-center text-xs text-gray-700">{user.email}</p>
      </div>
    </div>
  )
}
