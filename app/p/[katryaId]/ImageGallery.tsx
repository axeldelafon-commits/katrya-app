'use client'

import { useState } from 'react'

interface ImageItem {
  id: string
  url: string
  alt_text?: string | null
  position: number
}

interface Props {
  images: ImageItem[]
  productName: string
  fallbackUrl?: string | null
}

export default function ImageGallery({ images, productName, fallbackUrl }: Props) {
  const allImages = images.length > 0 ? images : (fallbackUrl ? [{ id: 'fallback', url: fallbackUrl, alt_text: null, position: 0 }] : [])
  const [activeIndex, setActiveIndex] = useState(0)

  if (allImages.length === 0) {
    return (
      <div className="mb-8 aspect-square w-full bg-white/5 rounded-2xl flex items-center justify-center">
        <span className="text-white/20 text-sm">Aucune photo disponible</span>
      </div>
    )
  }

  const activeImage = allImages[activeIndex]

  return (
    <div className="mb-8">
      {/* Main image */}
      <div className="aspect-square w-full bg-white/5 rounded-2xl overflow-hidden mb-3 relative">
        <img
          src={activeImage.url}
          alt={activeImage.alt_text || productName}
          className="w-full h-full object-cover transition-opacity duration-300"
        />
        {/* Image counter */}
        {allImages.length > 1 && (
          <div className="absolute bottom-3 right-3 bg-black/60 text-white text-xs px-2 py-1 rounded-full">
            {activeIndex + 1} / {allImages.length}
          </div>
        )}
      </div>

      {/* Thumbnails */}
      {allImages.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {allImages.map((img, i) => (
            <button
              key={img.id}
              onClick={() => setActiveIndex(i)}
              className={`flex-none w-20 h-20 rounded-xl overflow-hidden border-2 transition-all ${
                i === activeIndex
                  ? 'border-white opacity-100'
                  : 'border-transparent opacity-50 hover:opacity-80'
              }`}
            >
              <img
                src={img.url}
                alt={img.alt_text || `Photo ${i + 1}`}
                className="w-full h-full object-cover"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
