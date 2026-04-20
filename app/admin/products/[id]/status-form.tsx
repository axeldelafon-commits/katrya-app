'use client'
import { useState } from 'react'

const statuses = ['draft', 'active', 'inactive', 'flagged', 'revoked', 'transferred']

export default function StatusForm({ productId, currentStatus }: { productId: string; currentStatus: string }) {
  const [status, setStatus] = useState(currentStatus)
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState('')

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setMsg('')
    const res = await fetch(`/api/admin/products/${productId}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    const json = await res.json()
    setLoading(false)
    if (!res.ok) return setMsg(`Erreur: ${json.error}`)
    setMsg(`Statut mis à jour : ${json.product.status}`)
  }

  return (
    <div>
      <form onSubmit={onSubmit} style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
        <select
          value={status}
          onChange={e => setStatus(e.target.value)}
          style={{ padding: '8px 12px', background: '#111', border: '1px solid #333', borderRadius: 6, color: '#fff', fontSize: 14 }}
        >
          {statuses.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <button type="submit" disabled={loading} style={{ background: '#fff', color: '#000', border: 'none', padding: '8px 18px', borderRadius: 6, fontWeight: 600, cursor: 'pointer' }}>
          {loading ? 'Sauvegarde...' : 'Mettre à jour'}
        </button>
      </form>
      {msg && <p style={{ marginTop: 8, fontSize: 13, color: msg.startsWith('Erreur') ? '#f87171' : '#86efac' }}>{msg}</p>}
    </div>
  )
}
