'use client'

import { useRouter } from 'next/navigation'

export interface Wardrobe3DItem {
  id: string
  product_id: string
  katrya_id: string
  brand: string
  model_name: string
  category: string
  image_url: string | null
  is_favorite: boolean
}

// Helper: returns true for clothing categories
function isClothing(cat: string) {
  return ['tops', 'bottoms', 'outerwear', 'dresses', 'full-body'].includes(cat)
}
function isAccessory(cat: string) {
  return ['accessories', 'bags', 'hats', 'jewelry'].includes(cat)
}
function isShoe(cat: string) {
  return cat === 'shoes'
}

interface ItemTileProps {
  item: Wardrobe3DItem
  size?: 'sm' | 'md'
  onClick?: (item: Wardrobe3DItem) => void
}

function ItemTile({ item, size = 'md', onClick }: ItemTileProps) {
  const w = size === 'md' ? 'w-24 h-28' : 'w-16 h-20'
  return (
    <button
      className="flex flex-col items-center gap-1.5 group"
      onClick={() => onClick?.(item)}
      title={`${item.brand} — ${item.model_name}`}
    >
      <div className={`${w} bg-gray-50 rounded-xl overflow-hidden border border-gray-200 shadow-sm group-hover:shadow-md group-hover:-translate-y-0.5 transition relative`}>
        {item.image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={item.image_url} alt={item.model_name} className="w-full h-full object-cover" />
        ) : (
          <span className="flex items-center justify-center h-full text-2xl">
            {isShoe(item.category) ? '\uD83D\uDC5F' : isAccessory(item.category) ? '\uD83D\uDC5C' : '\uD83D\uDC57'}
          </span>
        )}
        {item.is_favorite && (
          <span className="absolute top-1 right-1 text-xs text-red-400">\u2665</span>
        )}
      </div>
      <p className="text-xs text-gray-500 truncate max-w-[6rem] text-center">{item.brand}</p>
    </button>
  )
}

export default function Wardrobe3D({ items }: { items: Wardrobe3DItem[] }) {
  const router = useRouter()

  const clothing = items.filter(i => isClothing(i.category))
  const accessories = items.filter(i => isAccessory(i.category))
  const shoes = items.filter(i => isShoe(i.category))
  const other = items.filter(i => !isClothing(i.category) && !isAccessory(i.category) && !isShoe(i.category))

  const handleSelect = (item: Wardrobe3DItem) => {
    router.push(`/product/${item.katrya_id}`)
  }

  if (items.length === 0) {
    return (
      <div className="flex items-center justify-center h-full bg-white text-gray-400 text-sm p-8 text-center">
        Ton dressing est vide. Scanne une puce NFC KATRYA pour commencer.
      </div>
    )
  }

  return (
    <div className="min-h-full bg-white overflow-y-auto">
      <div className="max-w-4xl mx-auto px-6 py-8">

        {/* === PORTANT === */}
        <section className="mb-10">
          {/* Barre du portant */}
          <div className="relative mb-6">
            <div className="flex justify-center">
              {/* Crochet central */}
              <div className="absolute -top-4 left-1/2 -translate-x-1/2 flex flex-col items-center">
                <div className="w-px h-4 bg-gray-300" />
                <div className="w-4 h-4 rounded-full border-2 border-gray-300 -mt-1" />
              </div>
              {/* Barre horizontale */}
              <div className="w-full max-w-2xl h-2 bg-gray-200 rounded-full shadow-inner mt-3" />
            </div>
          </div>

          {/* Vêtements suspendus */}
          <div className="flex flex-wrap justify-center gap-5 pt-2">
            {clothing.length === 0 ? (
              <p className="text-gray-300 text-sm">Aucun vêtement dans le dressing</p>
            ) : (
              clothing.map(item => (
                <div key={item.id} className="flex flex-col items-center">
                  {/* Fil cintre */}
                  <div className="w-px h-4 bg-gray-300" />
                  {/* Cintre SVG */}
                  <svg viewBox="0 0 60 18" className="w-10 text-gray-300" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M30 2 Q30 7 8 14 H52 Q30 7 30 2" strokeLinecap="round" />
                    <circle cx="30" cy="2" r="2" fill="currentColor" />
                  </svg>
                  <ItemTile item={item} size="md" onClick={handleSelect} />
                </div>
              ))
            )}
            {other.map(item => (
              <div key={item.id} className="flex flex-col items-center">
                <div className="w-px h-4 bg-gray-300" />
                <svg viewBox="0 0 60 18" className="w-10 text-gray-300" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M30 2 Q30 7 8 14 H52 Q30 7 30 2" strokeLinecap="round" />
                  <circle cx="30" cy="2" r="2" fill="currentColor" />
                </svg>
                <ItemTile item={item} size="md" onClick={handleSelect} />
              </div>
            ))}
          </div>
        </section>

        {/* === ACCESSOIRES + CHAUSSURES (ligne de fond) === */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

          {/* Accessoires */}
          <section className="bg-gray-50 rounded-2xl p-5 border border-gray-100">
            <h2 className="text-xs uppercase tracking-widest text-gray-400 mb-4">Accessoires</h2>
            {accessories.length === 0 ? (
              <p className="text-gray-300 text-sm">Aucun accessoire</p>
            ) : (
              <div className="flex flex-wrap gap-3">
                {accessories.map(item => (
                  <ItemTile key={item.id} item={item} size="sm" onClick={handleSelect} />
                ))}
              </div>
            )}
          </section>

          {/* Chaussures */}
          <section className="bg-gray-50 rounded-2xl p-5 border border-gray-100">
            <h2 className="text-xs uppercase tracking-widest text-gray-400 mb-4">Chaussures</h2>
            {shoes.length === 0 ? (
              <p className="text-gray-300 text-sm">Aucune chaussure</p>
            ) : (
              <div className="flex flex-wrap gap-3">
                {shoes.map(item => (
                  <ItemTile key={item.id} item={item} size="sm" onClick={handleSelect} />
                ))}
              </div>
            )}
          </section>
        </div>

      </div>
    </div>
  )
}
