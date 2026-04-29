'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createBrowserClient } from '@supabase/ssr'

type WardrobeItem = {
  id: string
  product_id: string | null
  added_at: string
  is_favorite: boolean
  notes: string | null
  // Legacy columns (kept for backward compat with old rows)
  name: string | null
  brand: string | null
  category: string | null
  color: string | null
  size: string | null
  image_url: string | null
  nfc_tag_id: string | null
  // Joined product (new schema, since cascade fix)
  products: {
    katrya_id: string
    brand: string
    model_name: string
    category: string
    status: string
    product_images?: { url: string; position: number }[]
  } | null
}

export default function WardrobePage() {
  const [items, setItems] = useState<WardrobeItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
    // Pull both the legacy columns AND the joined product so we can
    // display data whatever insert path was used.
    supabase
      .from('wardrobe_items')
      .select(`
        id, product_id, added_at, is_favorite, notes,
        name, brand, category, color, size, image_url, nfc_tag_id,
        products(
          katrya_id, brand, model_name, category, status,
          product_images(url, position)
        )
      `)
      .order('added_at', { ascending: false })
      .then(({ data, error }) => {
        if (error) setError(error.message)
        else setItems((data as any) ?? [])
        setLoading(false)
      })
  }, [])

  const handleDelete = async (id: string) => {
    if (!confirm('Supprimer cet article ?')) return
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
    await supabase.from('wardrobe_items').delete().eq('id', id)
    setItems(items.filter(i => i.id !== id))
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 }}>
        <h1 style={{ fontSize: 28, fontWeight: 700, letterSpacing: 2 }}>Dressing Virtuel</h1>
        <Link href="/admin/wardrobe/new" style={{
          background: '#fff', color: '#000', padding: '10px 24px',
          textDecoration: 'none', fontWeight: 600, fontSize: 14
        }}>+ Ajouter un article</Link>
      </div>

      {loading && <p style={{ color: '#666' }}>Chargement...</p>}
      {error && <p style={{ color: '#f87171' }}>Erreur : {error}</p>}

      {!loading && !error && items.length === 0 && (
        <p style={{ color: '#666' }}>Aucun article dans le dressing. Ajoutez votre premier article !</p>
      )}

      {!loading && !error && items.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 24 }}>
          {items.map(item => {
            // Prefer joined product data (new schema), fall back to legacy columns.
            const p = item.products
            const displayName = p?.model_name ?? item.name ?? '—'
            const displayBrand = p?.brand ?? item.brand ?? ''
            const displayCategory = p?.category ?? item.category ?? ''
            const sortedImages = (p?.product_images || [])
              .slice()
              .sort((a, b) => a.position - b.position)
            const displayImage = sortedImages[0]?.url ?? item.image_url ?? null
            const displayKatryaId = p?.katrya_id ?? null

            return (
              <div key={item.id} style={{
                background: '#111', border: '1px solid #222', padding: 20,
                display: 'flex', flexDirection: 'column', gap: 12
              }}>
                {displayImage && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={displayImage} alt={displayName}
                    style={{ width: '100%', height: 200, objectFit: 'cover' }} />
                )}
                <div>
                  <div style={{ fontWeight: 700, fontSize: 16 }}>{displayName}</div>
                  <div style={{ color: '#888', fontSize: 13 }}>
                    {displayBrand}{displayBrand && displayCategory ? ' — ' : ''}{displayCategory}
                  </div>
                  {(item.color || item.size) && (
                    <div style={{ color: '#666', fontSize: 12, marginTop: 4 }}>
                      {item.color ?? '—'} / {item.size ?? '—'}
                    </div>
                  )}
                  {displayKatryaId && (
                    <div style={{ color: '#4ade80', fontSize: 11, marginTop: 4, fontFamily: 'monospace' }}>
                      {displayKatryaId}
                    </div>
                  )}
                  {item.nfc_tag_id && (
                    <div style={{ color: '#4ade80', fontSize: 11, marginTop: 4 }}>NFC: {item.nfc_tag_id}</div>
                  )}
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  {displayKatryaId && (
                    <Link
                      href={`/p/${displayKatryaId}`}
                      style={{
                        background: 'transparent', border: '1px solid #333',
                        color: '#fff', padding: '6px 12px', textDecoration: 'none',
                        fontSize: 12,
                      }}
                    >
                      Voir la fiche
                    </Link>
                  )}
                  <button
                    onClick={() => handleDelete(item.id)}
                    style={{
                      background: 'transparent', border: '1px solid #333',
                      color: '#f87171', padding: '6px 12px', cursor: 'pointer',
                      fontSize: 12,
                    }}
                  >Supprimer</button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
