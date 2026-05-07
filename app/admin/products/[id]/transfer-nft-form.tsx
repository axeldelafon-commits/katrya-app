'use client'
import { useState } from 'react'

interface Props {
  productId: string
  tokenId: string
  currentOwner: string
}

export default function TransferNFTForm({ productId, tokenId, currentOwner }: Props) {
  const [toAddress, setToAddress] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{ success: boolean; txHash?: string; error?: string } | null>(null)

  async function handleTransfer() {
    if (!toAddress || !toAddress.startsWith('0x') || toAddress.length !== 42) {
      setResult({ success: false, error: 'Adresse wallet invalide (doit commencer par 0x, 42 caractères)' })
      return
    }
    setLoading(true)
    setResult(null)
    try {
      const res = await fetch('/api/nft/transfer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId, toAddress }),
      })
      const data = await res.json()
      if (data.success) {
        setResult({ success: true, txHash: data.transactionHash })
        setToAddress('')
      } else {
        setResult({ success: false, error: data.error })
      }
    } catch {
      setResult({ success: false, error: 'Erreur réseau' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ marginTop: 16 }}>
      <p style={{ fontSize: 12, color: '#888', margin: '0 0 8px' }}>
        Propriétaire actuel : <code style={{ color: '#0cf', fontSize: 11 }}>{currentOwner}</code>
      </p>
      <p style={{ fontSize: 12, color: '#888', margin: '0 0 12px' }}>
        Token ID : <strong style={{ color: '#fff' }}>#{tokenId}</strong>
      </p>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
        <input
          type="text"
          placeholder="Adresse wallet client (0x...)"
          value={toAddress}
          onChange={e => setToAddress(e.target.value)}
          disabled={loading}
          style={{
            flex: 1,
            minWidth: 280,
            background: '#111',
            border: '1px solid #333',
            borderRadius: 6,
            padding: '8px 12px',
            color: '#fff',
            fontSize: 13,
            fontFamily: 'monospace',
          }}
        />
        <button
          onClick={handleTransfer}
          disabled={loading || !toAddress}
          style={{
            background: loading ? '#333' : '#7c3aed',
            color: '#fff',
            border: 'none',
            borderRadius: 6,
            padding: '8px 18px',
            fontWeight: 700,
            fontSize: 13,
            cursor: loading ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            whiteSpace: 'nowrap',
          }}
        >
          {loading ? (
            <><span style={{ animation: 'spin 1s linear infinite', display: 'inline-block' }}>🔄</span> Transfert en cours...</>
          ) : (
            <>📤 Transférer au client</>
          )}
        </button>
      </div>
      {result && (
        <div style={{
          marginTop: 12,
          padding: '10px 14px',
          borderRadius: 8,
          background: result.success ? '#0a1f0a' : '#1f0a0a',
          border: `1px solid ${result.success ? '#1a4a1a' : '#4a1a1a'}`,
        }}>
          {result.success ? (
            <>
              <p style={{ margin: '0 0 6px', color: '#4ade80', fontWeight: 700 }}>✅ NFT transféré avec succès !</p>
              <p style={{ margin: 0, fontSize: 12 }}>
                Transaction : 
                <a
                  href={`https://polygonscan.com/tx/${result.txHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: '#0cf', fontSize: 11, fontFamily: 'monospace' }}
                >
                  {result.txHash?.slice(0, 20)}...↗
                </a>
              </p>
              <p style={{ margin: '6px 0 0', fontSize: 12, color: '#888' }}>
                Rechargez la page pour voir le nouveau propriétaire.
              </p>
            </>
          ) : (
            <p style={{ margin: 0, color: '#f87171' }}>❌ {result.error}</p>
          )}
        </div>
      )}
    </div>
  )
}
