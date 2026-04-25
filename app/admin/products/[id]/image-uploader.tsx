'use client'

import { useState, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'

interface ImageItem {
  id: string
  url: string
  alt_text?: string | null
  position: number
}

interface Props {
  productId: string
  initialImages: ImageItem[]
}

export default function ImageUploader({ productId, initialImages }: Props) {
  const [images, setImages] = useState<ImageItem[]>(initialImages)
  const [urlInput, setUrlInput] = useState('')
  const [altInput, setAltInput] = useState('')
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [previewError, setPreviewError] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [loading, setLoading] = useState(false)
  const [uploadError, setUploadError] = useState('')
  const [successMsg, setSuccessMsg] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  const handleUrlChange = (val: string) => {
    setUrlInput(val)
    setPreviewError(false)
    setSuccessMsg('')
    if (val.startsWith('http')) {
      setPreviewUrl(val)
    } else {
      setPreviewUrl(null)
    }
  }

  const refreshImages = async () => {
    const res = await fetch(`/api/admin/products/${productId}/images`)
    if (res.ok) {
      const data = await res.json()
      setImages(data.images || [])
    } else {
      router.refresh()
    }
  }

  const submitImage = async (url: string, altText: string) => {
    setLoading(true)
    setUploadError('')
    setSuccessMsg('')
    try {
      const fd = new FormData()
      fd.append('url', url)
      if (altText) fd.append('alt_text', altText)
      const res = await fetch(`/api/admin/products/${productId}/images`, {
        method: 'POST',
        body: fd,
      })
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Erreur lors de l\'ajout')
      }
      if (data.image) {
        setImages(prev => [...prev, data.image])
      } else {
        await refreshImages()
      }
      setUrlInput('')
      setAltInput('')
      setPreviewUrl(null)
      setSuccessMsg('Photo ajoutée avec succès !')
    } catch (err: any) {
      setUploadError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleFileUpload = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      setUploadError('Fichier non valide. Utilisez une image (jpg, png, webp).')
      return
    }
    setLoading(true)
    setUploadError('')
    setSuccessMsg('')
    try {
      const fd = new FormData()
      fd.append('file', file)
      if (altInput) fd.append('alt_text', altInput)
      const res = await fetch(`/api/admin/products/${productId}/images`, {
        method: 'POST',
        body: fd,
      })
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Erreur upload')
      }
      if (data.image) {
        setImages(prev => [...prev, data.image])
      } else {
        await refreshImages()
      }
      setAltInput('')
      setSuccessMsg('Photo uploadée avec succès !')
    } catch (err: any) {
      setUploadError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFileUpload(file)
  }, [])

  const handleDelete = async (imageId: string) => {
    if (!confirm('Supprimer cette photo ?')) return
    const res = await fetch(`/api/admin/products/${productId}/images?imageId=${imageId}`, { method: 'DELETE' })
    if (res.ok) {
      setImages(prev => prev.filter(img => img.id !== imageId))
    }
  }

  return (
    <div>
      {/* Current images */}
      {images.length > 0 ? (
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 20 }}>
          {images.map((img, i) => (
            <div key={img.id} style={{ position: 'relative' }}>
              <img
                src={img.url}
                alt={img.alt_text || `Photo ${i + 1}`}
                style={{ width: 100, height: 100, objectFit: 'cover', borderRadius: 8, border: '1px solid #333' }}
                onError={(e) => { (e.target as HTMLImageElement).style.opacity = '0.3' }}
              />
              <span style={{ position: 'absolute', top: 4, left: 4, background: '#000', color: '#fff', fontSize: 10, padding: '2px 6px', borderRadius: 4 }}>#{i + 1}</span>
              <button
                onClick={() => handleDelete(img.id)}
                style={{ position: 'absolute', top: 4, right: 4, background: '#c00', color: '#fff', border: 'none', borderRadius: 4, fontSize: 11, padding: '2px 6px', cursor: 'pointer' }}
              >
                ×
              </button>
            </div>
          ))}
        </div>
      ) : (
        <p style={{ color: '#888', marginBottom: 16 }}>Aucune photo. Ajoutez des images ci-dessous.</p>
      )}

      {successMsg && <p style={{ color: '#4c4', fontSize: 13, marginBottom: 12 }}>✔ {successMsg}</p>}

      {/* Drag & Drop zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        style={{
          border: `2px dashed ${isDragging ? '#0cf' : '#444'}`,
          borderRadius: 12,
          padding: 32,
          textAlign: 'center',
          cursor: 'pointer',
          background: isDragging ? 'rgba(0,204,255,0.05)' : '#0a0a0a',
          marginBottom: 16,
          transition: 'all 0.2s',
          opacity: loading ? 0.5 : 1,
        }}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          style={{ display: 'none' }}
          onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFileUpload(f) }}
        />
        <p style={{ color: '#888', margin: 0, fontSize: 14 }}>
          {loading ? '⏳ Upload en cours...' : isDragging ? '📂 Relâchez pour uploader' : '📷 Glissez une image ici ou cliquez pour choisir un fichier'}
        </p>
        <p style={{ color: '#555', margin: '4px 0 0', fontSize: 12 }}>JPG, PNG, WEBP acceptés</p>
      </div>

      {/* URL input */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <label style={{ fontSize: 13, color: '#aaa' }}>Ou ajouter via URL externe</label>
        <input
          value={urlInput}
          onChange={(e) => handleUrlChange(e.target.value)}
          type="url"
          placeholder="https://..."
          style={{ background: '#111', border: '1px solid #333', borderRadius: 8, padding: '8px 12px', color: '#fff', fontSize: 14 }}
        />

        {/* URL Preview */}
        {previewUrl && (
          <div style={{ background: '#111', border: `1px solid ${previewError ? '#c00' : '#333'}`, borderRadius: 8, padding: 8, display: 'flex', alignItems: 'center', gap: 12 }}>
            {!previewError ? (
              <img
                src={previewUrl}
                alt="Preview"
                onError={() => setPreviewError(true)}
                style={{ width: 60, height: 60, objectFit: 'cover', borderRadius: 6 }}
              />
            ) : (
              <div style={{ width: 60, height: 60, background: '#222', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ fontSize: 10, color: '#f66', textAlign: 'center' }}>Inaccessible</span>
              </div>
            )}
            <span style={{ fontSize: 12, color: previewError ? '#f66' : '#0cf' }}>
              {previewError ? '⚠️ Cette URL ne charge pas — vérifiez qu\'elle pointe vers un fichier image public' : '✔ Prévisualisation OK'}
            </span>
          </div>
        )}

        <input
          value={altInput}
          onChange={(e) => setAltInput(e.target.value)}
          type="text"
          placeholder="Description de l'image (optionnel)"
          style={{ background: '#111', border: '1px solid #333', borderRadius: 8, padding: '8px 12px', color: '#fff', fontSize: 14 }}
        />

        {uploadError && <p style={{ color: '#f66', fontSize: 13, margin: 0 }}>{uploadError}</p>}

        {urlInput && (
          <button
            onClick={() => submitImage(urlInput, altInput)}
            disabled={loading || previewError}
            style={{ background: previewError ? '#333' : '#0cf', color: '#000', border: 'none', borderRadius: 8, padding: '10px 20px', fontWeight: 600, cursor: previewError ? 'not-allowed' : 'pointer', width: 'fit-content', opacity: loading ? 0.6 : 1 }}
          >
            {loading ? 'Ajout en cours...' : 'Ajouter cette photo'}
          </button>
        )}
      </div>
    </div>
  )
}
