'use client'
import { useEffect, useRef, useState } from 'react'

type Result =
  | { state: 'waiting' }
  | { state: 'match'; scanned_at: string; tag_status: string | null }
  | { state: 'mismatch'; scanned_at: string; other_product: { katrya_id: string; brand: string; model_name: string } | null }

const TIMEOUT_MS = 60_000

export default function VerifyTagButton({ productId }: { productId: string }) {
  const [running, setRunning] = useState(false)
  const [result, setResult] = useState<Result | null>(null)
  const [error, setError] = useState('')
  const [remaining, setRemaining] = useState(0)
  const stop = useRef<() => void>(() => {})

  useEffect(() => () => stop.current(), [])

  function start() {
    const since = new Date().toISOString()
    setRunning(true)
    setResult(null)
    setError('')
    setRemaining(Math.round(TIMEOUT_MS / 1000))

    const poll = setInterval(async () => {
      try {
        const res = await fetch(
          `/api/admin/products/${productId}/verify-tag?since=${encodeURIComponent(since)}`,
          { cache: 'no-store' }
        )
        const json = await res.json()
        if (!res.ok) {
          setError(json.error ?? 'Erreur')
          stop.current()
          return
        }
        if (json.state !== 'waiting') {
          setResult(json as Result)
          stop.current()
        }
      } catch {
        /* reseau instable : on retentera au tick suivant */
      }
    }, 2000)

    const tick = setInterval(() => setRemaining(r => Math.max(0, r - 1)), 1000)
    const timeout = setTimeout(() => {
      setError('Aucun scan détecté. Approchez la puce du téléphone pendant le test.')
      stop.current()
    }, TIMEOUT_MS)

    stop.current = () => {
      clearInterval(poll)
      clearInterval(tick)
      clearTimeout(timeout)
      setRunning(false)
    }
  }

  return (
    <div style={{ marginTop: 20, borderTop: '1px solid #222', paddingTop: 16 }}>
      <h4 style={{ margin: '0 0 6px', color: '#aaa' }}>Vérifier une puce</h4>
      <p style={{ margin: '0 0 12px', fontSize: 12, color: '#777', lineHeight: 1.5 }}>
        Lancez le test puis approchez la puce d&apos;un téléphone. L&apos;écran dira si
        elle porte bien le token de ce produit — ou lequel elle pointe réellement.
      </p>

      <button type="button" onClick={running ? () => stop.current() : start} style={btnStyle}>
        {running ? `Annuler (${remaining}s)` : 'Tester cette puce'}
      </button>

      {running && (
        <p style={{ marginTop: 12, fontSize: 13, color: '#facc15' }}>
          En attente d&apos;un scan…
        </p>
      )}

      {error && <p style={{ marginTop: 12, fontSize: 13, color: '#f87171' }}>{error}</p>}

      {result?.state === 'match' && (
        <div style={{ ...boxStyle, background: '#0a1a0a', borderColor: '#16a34a' }}>
          <strong style={{ color: '#86efac' }}>Correspondance confirmée.</strong>
          <br />
          Cette puce pointe bien vers ce produit.
          {result.tag_status && result.tag_status !== 'active' && (
            <>
              <br />
              <span style={{ color: '#fcd34d' }}>
                Statut du tag : {result.tag_status}.
              </span>
            </>
          )}
        </div>
      )}

      {result?.state === 'mismatch' && (
        <div style={{ ...boxStyle, background: '#2a0000', borderColor: '#dc2626' }}>
          <strong style={{ color: '#fca5a5' }}>Mauvaise puce.</strong>
          <br />
          {result.other_product ? (
            <>
              Elle pointe vers <strong>{result.other_product.brand} {result.other_product.model_name}</strong>{' '}
              ({result.other_product.katrya_id}).
            </>
          ) : (
            <>Elle pointe vers un autre produit.</>
          )}
          <br />
          Réécrivez l&apos;URL de ce produit sur la puce.
        </div>
      )}
    </div>
  )
}

const btnStyle: React.CSSProperties = { background: '#fff', color: '#000', border: 'none', padding: '8px 18px', borderRadius: 6, fontWeight: 600, cursor: 'pointer', fontSize: 13 }
const boxStyle: React.CSSProperties = { marginTop: 12, padding: 12, border: '1px solid', borderRadius: 8, fontSize: 13, lineHeight: 1.6 }
