'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

type WardrobeItem = {
  id: string
  name: string
  category: string
  brand: string
  color: string
  size: string
  image_url: string
  nfc_tag_id: string | null
  created_at: string
}

export default function WardrobePage() {
  const [items, setItems] = useState<WardrobeItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/admin/wardrobe')
      .then(r => r.json())
      .then(data => { setItems(data); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  const handleDelete = async (id: string) => {
    if (!confirm('Supprimer cet article ?')) return
    await fetch(`/api/admin/wardrobe/${id}`, { method: 'DELETE' })
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

      {loading ? (
        <p style={{ color: '#666' }}>Chargement...</p>
      ) : items.length === 0 ? (
        <p style={{ color: '#666' }}>Aucun article dans le dressing. Ajoutez votre premier article !</p>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 24 }}>
          {items.map(item => (
            <div key={item.id} style={{
              background: '#111', border: '1px solid #222', padding: 20,
              display: 'flex', flexDirection: 'column', gap: 12
            }}>
              {item.image_url && (
                <img src={item.image_url} alt={item.name}
                  style={{ width: '100%', height: 200, objectFit: 'cover' }} />
              )}
              <div>
                <div style={{ fontWeight: 700, fontSize: 16 }}>{item.name}</div>
                <div style={{ color: '#888', fontSize: 13 }}>{item.brand} — {item.category}</div>
                <div style={{ color: '#666', fontSize: 12, marginTop: 4 }}>
                  {item.color} / {item.size}
                </div>
                {item.nfc_tag_id && (
                  <div style={{ color: '#4ade80', fontSize: 11, marginTop: 4 }}>NFC: {item.nfc_tag_id}</div>
                )}
              </div>
              <button
                onClick={() => handleDelete(item.id)}
                style={{
                  background: 'transparent', border: '1px solid #333',
                  color: '#f87171', padding: '6px 12px', cursor: 'pointer',
                  fontSize: 12, alignSelf: 'flex-start'
                }}
              >Supprimer</button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
