'use client'

import { useState } from 'react'

interface Props {
  productId: string
  katryaId: string
  brand: string
  modelName: string
  category: string
  status: string
  imageUrl?: string | null
  existingTokenId?: string | null
  existingTxHash?: string | null
}

export default function MintNFTButton({
  productId,
  katryaId,
  brand,
  modelName,
  category,
  status,
  imageUrl,
  existingTokenId,
  existingTxHash,
}: Props) {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{
    success: boolean
    tokenId?: string
    transactionHash?: string
    error?: string
    message?: string
  } | null>(existingTokenId ? {
    success: true,
    tokenId: existingTokenId,
    transactionHash: existingTxHash ?? undefined,
    message: 'NFT déjà certifié',
  } : null)

  const mint = async () => {
    if (!confirm('Certifier ce produit sur la blockchain Polygon ? Cette action est irréversible.')) return
    setLoading(true)
    try {
      const res = await fetch('/api/nft/mint', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId,
          katryaId,
          brand,
          modelName,
          category,
          status,
          imageUrl,
        }),
      })
      const json = await res.json()
      setResult(json)
    } catch (e) {
      setResult({ success: false, error: 'Erreur réseau' })
    } finally {
      setLoading(false)
    }
  }

  if (result?.success) {
    return (
      <div style={{
        background: '#0a1a0a',
        border: '1px solid #16a34a',
        borderRadius: 10,
        padding: '14px 18px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
          <span style={{ fontSize: 18 }}>✅</span>
          <span style={{ color: '#4ade80', fontWeight: 700, fontSize: 14 }}>
            {result.message ?? 'NFT certifié sur Polygon'}
          </span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {result.tokenId && (
            <div style={{ fontSize: 13, color: '#aaa' }}>
              <span style={{ color: '#555' }}>Token ID : </span>
              <code style={{ color: '#4ade80', background: '#111', padding: '2px 8px', borderRadius: 4 }}>#{result.tokenId}</code>
            </div>
          )}
          {result.transactionHash && (
            <div style={{ fontSize: 13 }}>
              <span style={{ color: '#555' }}>Tx Hash : </span>
              <a
                href={`https://polygonscan.com/tx/${result.transactionHash}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: '#818cf8', fontFamily: 'monospace', fontSize: 11, wordBreak: 'break-all' }}
              >
                {result.transactionHash}
              </a>
            </div>
          )}
          {result.transactionHash && (
            <a
              href={`https://polygonscan.com/tx/${result.transactionHash}`}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'inline-block',
                marginTop: 6,
                fontSize: 12,
                color: '#818cf8',
                textDecoration: 'underline',
              }}
            >
              Voir sur Polygonscan ↗
            </a>
          )}
        </div>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {result?.error && (
        <div style={{
          background: '#1a0a0a',
          border: '1px solid #dc2626',
          borderRadius: 8,
          padding: '10px 14px',
          fontSize: 13,
          color: '#f87171',
        }}>
          ⚠️ {result.error}
        </div>
      )}
      <button
        onClick={mint}
        disabled={loading}
        style={{
          background: loading ? '#333' : 'linear-gradient(135deg, #7c3aed, #4f46e5)',
          color: '#fff',
          border: 'none',
          borderRadius: 8,
          padding: '11px 22px',
          fontWeight: 700,
          fontSize: 14,
          cursor: loading ? 'not-allowed' : 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          width: 'fit-content',
        }}
      >
        {loading ? (
          <><span style={{ animation: 'spin 1s linear infinite', display: 'inline-block' }}>⏳</span> Certification en cours...</>
        ) : (
          <>⛓️ Certifier sur Polygon</>
        )}
      </button>
      <p style={{ fontSize: 12, color: '#555', margin: 0 }}>
        Mint un NFT ERC-721 immuable sur Polygon Mainnet.
        Le token sera lié à cet ID KATRYA et traçable sur Polygonscan.
      </p>
    </div>
  )
}
