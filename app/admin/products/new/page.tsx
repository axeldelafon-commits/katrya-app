'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function NewProductPage() {
  const router = useRouter()
  const [form, setForm] = useState({
    organization_id: '',
    brand: '',
    model_name: '',
    sku: '',
    serial_number: '',
    category: '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const res = await fetch('/api/admin/products', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    const json = await res.json()
    setLoading(false)
    if (!res.ok) return setError(json.error ?? 'Erreur')
    router.push(`/admin/products/${json.product.id}`)
  }

  function update(k: string, v: string) { setForm(p => ({ ...p, [k]: v })) }

  return (
    <div style={{ maxWidth: 640 }}>
      <h1>Nouveau produit</h1>
      {error && <p style={{ color: '#f87171', background: '#1a0000', padding: 12, borderRadius: 8 }}>{error}</p>}
      <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <label style={labelStyle}>
          Organisation UUID *
          <input required value={form.organization_id} onChange={e => update('organization_id', e.target.value)} style={inputStyle} placeholder="uuid de l'organisation" />
        </label>
        <label style={labelStyle}>
          Marque *
          <input required value={form.brand} onChange={e => update('brand', e.target.value)} style={inputStyle} placeholder="ex: KATRYA" />
        </label>
        <label style={labelStyle}>
          Nom du produit *
          <input required value={form.model_name} onChange={e => update('model_name', e.target.value)} style={inputStyle} placeholder="ex: Veste cuir noire" />
        </label>
        <label style={labelStyle}>
          Catégorie *
          <input required value={form.category} onChange={e => update('category', e.target.value)} style={inputStyle} placeholder="ex: Veste" />
        </label>
        <label style={labelStyle}>
          SKU
          <input value={form.sku} onChange={e => update('sku', e.target.value)} style={inputStyle} placeholder="ex: VCN-001" />
        </label>
        <label style={labelStyle}>
          N° de série
          <input value={form.serial_number} onChange={e => update('serial_number', e.target.value)} style={inputStyle} placeholder="optionnel" />
        </label>
        <button type="submit" disabled={loading} style={btnStyle}>
          {loading ? 'Création...' : 'Créer le produit'}
        </button>
      </form>
    </div>
  )
}

const inputStyle: React.CSSProperties = { display: 'block', width: '100%', padding: '10px 14px', background: '#111', border: '1px solid #333', borderRadius: 8, color: '#fff', fontSize: 14, marginTop: 6 }
const labelStyle: React.CSSProperties = { display: 'flex', flexDirection: 'column', fontSize: 13, color: '#aaa' }
const btnStyle: React.CSSProperties = { background: '#fff', color: '#000', border: 'none', padding: '12px 24px', borderRadius: 8, fontWeight: 700, fontSize: 15, cursor: 'pointer', marginTop: 8 }
