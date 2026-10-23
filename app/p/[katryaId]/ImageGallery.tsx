'use client'

import { useState } from 'react'
import { isVideoUrl } from '@/lib/media'

interface MediaItem {
  id: string
  url: string
  alt_text?: string | null
  position: number
}

interface Props {
  images: MediaItem[]
  productName: string
  fallbackUrl?: string | null
  /** Couleur d'accent de la marque, pour la vignette active. */
  accent?: string
}

export default function ImageGallery({ images, productName, fallbackUrl, accent }: Props) {
  const allMedia =
    images.length > 0
      ? images
      : fallbackUrl
      ? [{ id: 'fallback', url: fallbackUrl, alt_text: null, position: 0 }]
      : []
  const [activeIndex, setActiveIndex] = useState(0)

  if (allMedia.length === 0) {
    return (
      <div className="mb-8 aspect-square w-full bg-white/5 rounded-2xl flex items-center justify-center">
        <span className="text-white/20 text-sm">Aucune photo disponible</span>
      </div>
    )
  }

  const active = allMedia[Math.min(activeIndex, allMedia.length - 1)]
  const activeIsVideo = isVideoUrl(active.url)

  return (
    <div className="mb-8">
      {/* Media principal */}
      <div className="aspect-square w-full bg-white/5 rounded-2xl overflow-hidden mb-3 relative">
        {activeIsVideo ? (
          <video
            // La cle force le remontage au changement de media : sans elle,
            // React reutilise l'element <video> et garde la piste precedente.
            key={active.id}
            src={active.url}
            className="w-full h-full object-cover"
            controls
            playsInline
            preload="metadata"
            aria-label={active.alt_text || `Vidéo — ${productName}`}
          />
        ) : (
          <img
            src={active.url}
            alt={active.alt_text || productName}
            className="w-full h-full object-cover transition-opacity duration-300"
          />
        )}
        {allMedia.length > 1 && !activeIsVideo && (
          <div className="absolute bottom-3 right-3 bg-black/60 text-white text-xs px-2 py-1 rounded-full">
            {activeIndex + 1} / {allMedia.length}
          </div>
        )}
      </div>

      {/* Vignettes */}
      {allMedia.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {allMedia.map((item, i) => {
            const itemIsVideo = isVideoUrl(item.url)
            const isActive = i === activeIndex
            return (
              <button
                key={item.id}
                onClick={() => setActiveIndex(i)}
                aria-label={
                  itemIsVideo ? `Vidéo ${i + 1}` : `Photo ${i + 1}`
                }
                aria-current={isActive}
                className={`relative flex-none w-20 h-20 rounded-xl overflow-hidden border-2 transition-all ${
                  isActive ? 'opacity-100' : 'border-transparent opacity-50 hover:opacity-80'
                }`}
                style={isActive ? { borderColor: accent || '#ffffff' } : undefined}
              >
                {itemIsVideo ? (
                  <>
                    {/* Pas de poster en base : la premiere frame sert de
                        vignette. preload="metadata" suffit a l'obtenir sans
                        telecharger la video entiere. */}
                    <video
                      src={item.url}
                      className="w-full h-full object-cover"
                      muted
                      playsInline
                      preload="metadata"
                    />
                    <span className="absolute inset-0 grid place-items-center bg-black/35">
                      <span className="block w-0 h-0 border-y-[7px] border-y-transparent border-l-[11px] border-l-white ml-1" />
                    </span>
                  </>
                ) : (
                  <img
                    src={item.url}
                    alt={item.alt_text || `Photo ${i + 1}`}
                    className="w-full h-full object-cover"
                  />
                )}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
