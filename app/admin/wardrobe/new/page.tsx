'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function NewWardrobeItemPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    name: '',
    category: '',
    brand: '',
    color: '',
    size: '',
    image_url: '',
    nfc_tag_id: '',
  })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    const res = await fetch('/api/admin/wardrobe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    if (res.ok) {
      router.push('/admin/wardrobe')
    } else {
      alert('Erreur lors de la création')
      setLoading(false)
    }
  }

  const inputStyle = {
    background: '#111', border: '1px solid #333', color: '#fff',
    padding: '10px 14px', fontSize: 14, width: '100%', boxSizing: 'border-box' as const
  }
  const labelStyle = { display: 'block', color: '#aaa', fontSize: 12, marginBottom: 6, letterSpacing: 1 }

  return (
    <div style={{ maxWidth: 600 }}>
      <h1 style={{ fontSize: 24, fontWeight: 700, letterSpacing: 2, marginBottom: 32 }}>Ajouter un article</h1>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        <div>
          <label style={labelStyle}>NOM *</label>
          <input name="name" value={form.name} onChange={handleChange} required style={inputStyle} />
        </div>
        <div>
          <label style={labelStyle}>CATÉGORIE</label>
          <select name="category" value={form.category} onChange={handleChange} style={inputStyle}>
            <option value="">-- Sélectionnez --</option>
            <option value="Haut">Haut</option>
            <option value="Bas">Bas</option>
            <option value="Chaussures">Chaussures</option>
            <option value="Accessoire">Accessoire</option>
            <option value="Veste">Veste</option>
            <option value="Robe">Robe</option>
            <option value="Autre">Autre</option>
          </select>
        </div>
        <div>
          <label style={labelStyle}>MARQUE</label>
          <input name="brand" value={form.brand} onChange={handleChange} style={inputStyle} />
        </div>
        <div>
          <label style={labelStyle}>COULEUR</label>
          <input name="color" value={form.color} onChange={handleChange} style={inputStyle} />
        </div>
        <div>
          <label style={labelStyle}>TAILLE</label>
          <input name="size" value={form.size} onChange={handleChange} style={inputStyle} />
        </div>
        <div>
          <label style={labelStyle}>URL IMAGE</label>
          <input name="image_url" value={form.image_url} onChange={handleChange} style={inputStyle} placeholder="https://..." />
        </div>
        <div>
          <label style={labelStyle}>NFC TAG ID (optionnel)</label>
          <input name="nfc_tag_id" value={form.nfc_tag_id} onChange={handleChange} style={inputStyle} />
        </div>
        <button type="submit" disabled={loading} style={{
          background: '#fff', color: '#000', padding: '12px 32px',
          fontWeight: 700, fontSize: 14, border: 'none', cursor: 'pointer',
          opacity: loading ? 0.5 : 1
        }}>
          {loading ? 'Enregistrement...' : 'Ajouter au dressing'}
        </button>
      </form>
    </div>
  )
}
