'use client'
import { useState } from 'react'

type Product = { brand: string; model_name: string; category: string }

export default function PublishPassportForm({ productId, product }: { productId: string; product: Product }) {
  const [form, setForm] = useState({
    product_name: product.model_name,
    brand: product.brand,
    category: product.category,
    color: '',
    size: '',
    material_composition: '',
    country_of_manufacture: '',
    care_instructions: '',
    authenticity_message: 'Produit vérifié par KATRYA',
    main_image_url: '',
    supplier_name: '',
    supplier_batch_id: '',
    internal_notes: '',
  })
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState('')
  const [error, setError] = useState('')

  function update(k: string, v: string) { setForm(p => ({ ...p, [k]: v })) }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setSuccess('')
    setError('')
    const public_data = {
      product_name: form.product_name, brand: form.brand, category: form.category,
      color: form.color, size: form.size, material_composition: form.material_composition,
      country_of_manufacture: form.country_of_manufacture, care_instructions: form.care_instructions,
      authenticity_message: form.authenticity_message, main_image_url: form.main_image_url,
    }
    const private_data = {
      supplier_name: form.supplier_name, supplier_batch_id: form.supplier_batch_id,
      internal_notes: form.internal_notes,
    }
    const res = await fetch('/api/admin/passports/publish', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ product_id: productId, public_data, private_data }),
    })
    const json = await res.json()
    setLoading(false)
    if (!res.ok) return setError(json.error ?? 'Erreur')
    setSuccess(`Passeport publié en version v${json.passport.version}`)
  }

  return (
    <form onSubmit={onSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 12 }}>
      {error && <p style={{ color: '#f87171' }}>{error}</p>}
      {success && <p style={{ color: '#86efac' }}>{success}</p>}
      <p style={{ margin: '0 0 4px', fontWeight: 600, color: '#aaa', fontSize: 13 }}>Données publiques</p>
      {(['product_name','brand','category','color','size','material_composition','country_of_manufacture','authenticity_message','main_image_url'] as const).map(k => (
        <label key={k} style={labelStyle}>
          {k.replace(/_/g, ' ')}
          <input value={(form as Record<string,string>)[k]} onChange={e => update(k, e.target.value)} style={inputStyle} />
        </label>
      ))}
      <label style={labelStyle}>
        care instructions
        <textarea value={form.care_instructions} onChange={e => update('care_instructions', e.target.value)} style={{ ...inputStyle, minHeight: 60 }} />
      </label>
      <p style={{ margin: '8px 0 4px', fontWeight: 600, color: '#aaa', fontSize: 13 }}>Données privées</p>
      {(['supplier_name','supplier_batch_id'] as const).map(k => (
        <label key={k} style={labelStyle}>
          {k.replace(/_/g, ' ')}
          <input value={(form as Record<string,string>)[k]} onChange={e => update(k, e.target.value)} style={inputStyle} />
        </label>
      ))}
      <label style={labelStyle}>
        notes internes
        <textarea value={form.internal_notes} onChange={e => update('internal_notes', e.target.value)} style={{ ...inputStyle, minHeight: 60 }} />
      </label>
      <button type="submit" disabled={loading} style={btnStyle}>
        {loading ? 'Publication...' : 'Publier le passeport'}
      </button>
    </form>
  )
}

const inputStyle: React.CSSProperties = { display: 'block', padding: '7px 12px', background: '#0d0d0d', border: '1px solid #2a2a2a', borderRadius: 6, color: '#fff', fontSize: 13, width: '100%', marginTop: 3 }
const labelStyle: React.CSSProperties = { display: 'flex', flexDirection: 'column', fontSize: 12, color: '#777' }
const btnStyle: React.CSSProperties = { background: '#fff', color: '#000', border: 'none', padding: '10px 20px', borderRadius: 6, fontWeight: 700, cursor: 'pointer', marginTop: 4 }
