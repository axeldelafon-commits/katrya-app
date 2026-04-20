'use client'
import { useState } from 'react'

export default function LinkTagForm({ productId }: { productId: string }) {
  const [tagUid, setTagUid] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{ resolver_url: string } | null>(null)
  const [error, setError] = useState('')

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    setResult(null)
    const res = await fetch('/api/admin/tags/link', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ product_id: productId, tag_uid: tagUid || null }),
    })
    const json = await res.json()
    setLoading(false)
    if (!res.ok) return setError(json.error ?? 'Erreur')
    setResult(json.tag)
  }

  return (
    <div style={{ marginTop: 16 }}>
      <h4 style={{ margin: '0 0 12px', color: '#aaa' }}>Lier / regénérer une puce</h4>
      {error && <p style={{ color: '#f87171' }}>{error}</p>}
      <form onSubmit={onSubmit} style={{ display: 'flex', gap: 12, alignItems: 'flex-end', flexWrap: 'wrap' }}>
        <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 13, color: '#888' }}>
          Tag UID (optionnel)
          <input
            value={tagUid}
            onChange={e => setTagUid(e.target.value)}
            placeholder="ex: 04A3B2C1..."
            style={inputStyle}
          />
        </label>
        <button type="submit" disabled={loading} style={btnStyle}>
          {loading ? 'Liaison...' : 'Générer URL resolver'}
        </button>
      </form>
      {result && (
        <div style={{ marginTop: 12, padding: 12, background: '#0a1a0a', border: '1px solid #16a34a', borderRadius: 8 }}>
          <p style={{ margin: '0 0 6px', color: '#86efac', fontWeight: 600 }}>URL générée — à écrire dans la puce NFC :</p>
          <code style={{ fontSize: 13, wordBreak: 'break-all' }}>{result.resolver_url}</code>
        </div>
      )}
    </div>
  )
}

const inputStyle: React.CSSProperties = { padding: '8px 12px', background: '#111', border: '1px solid #333', borderRadius: 6, color: '#fff', fontSize: 13 }
const btnStyle: React.CSSProperties = { background: '#fff', color: '#000', border: 'none', padding: '8px 18px', borderRadius: 6, fontWeight: 600, cursor: 'pointer', fontSize: 13 }
