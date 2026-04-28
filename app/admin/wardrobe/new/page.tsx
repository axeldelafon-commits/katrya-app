'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function NewWardrobeItemPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
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
    setError(null)
    setSuccess(null)
    try {
      const res = await fetch('/api/admin/wardrobe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json().catch(() => ({}))
      if (res.ok) {
        setSuccess(
          `Article créé (${data.katrya_id ?? 'KTR-???'}) et ajouté au dressing. Redirection...`
        )
        setTimeout(() => router.push('/admin/wardrobe'), 1200)
      } else if (res.status === 207 && data.warning === 'nfc_duplicate') {
        // Partial success — product created but NFC conflict
        setError(data.error ?? 'Conflit NFC')
        setLoading(false)
      } else {
        setError(data.error ?? `Erreur ${res.status}`)
        setLoading(false)
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erreur réseau'
      setError(msg)
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
      <h1 style={{ fontSize: 24, fontWeight: 700, letterSpacing: 2, marginBottom: 12 }}>Ajouter un article</h1>
      <p style={{ color: '#888', fontSize: 13, marginBottom: 32, lineHeight: 1.5 }}>
        Cette action crée un produit dans le catalogue KATRYA (avec un identifiant
        KTR-XXX), associe une photo et une puce NFC si vous les fournissez, puis
        ajoute le produit à <em>votre</em> dressing personnel.
      </p>

      {error && (
        <div style={{
          background: 'rgba(255,80,80,0.08)',
          border: '1px solid rgba(255,80,80,0.4)',
          color: '#f88',
          padding: '12px 16px',
          marginBottom: 20,
          fontSize: 13,
          borderRadius: 4,
        }}>
          ⚠ {error}
        </div>
      )}

      {success && (
        <div style={{
          background: 'rgba(80,255,160,0.08)',
          border: '1px solid rgba(80,255,160,0.4)',
          color: '#8f8',
          padding: '12px 16px',
          marginBottom: 20,
          fontSize: 13,
          borderRadius: 4,
        }}>
          ✓ {success}
        </div>
      )}

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        <div>
          <label style={labelStyle}>NOM *</label>
          <input name="name" value={form.name} onChange={handleChange} required style={inputStyle} placeholder="Ex: Air Jordan Black Toe 2016" />
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
          <input name="brand" value={form.brand} onChange={handleChange} style={inputStyle} placeholder="Ex: Jordan" />
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
          <p style={{ color: '#666', fontSize: 11, marginTop: 4 }}>
            Sera utilisée comme photo principale dans la galerie produit + le dressing 3D.
          </p>
        </div>
        <div>
          <label style={labelStyle}>NFC TAG ID (optionnel)</label>
          <input name="nfc_tag_id" value={form.nfc_tag_id} onChange={handleChange} style={inputStyle} />
          <p style={{ color: '#666', fontSize: 11, marginTop: 4 }}>
            UID de la puce NFC physique. Doit être unique sur l&apos;ensemble du
            catalogue.
          </p>
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
