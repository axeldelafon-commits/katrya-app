import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'

interface Props {
  params: { userId: string }
}

export default async function AdminUserWardrobePage({ params }: Props) {
  const { userId } = params
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/admin/login')

  const { data: items } = await supabase
    .from('wardrobe_items')
    .select(`
      id,
      products(
        katrya_id, brand, model_name, category,
        product_images(url, position)
      )
    `)
    .eq('user_id', userId)

  const sorted = (items ?? []).map((item: any) => ({
    ...item,
    products: {
      ...item.products,
      product_images: (item.products?.product_images ?? [])
        .slice()
        .sort((a: any, b: any) => a.position - b.position),
    },
  }))

  const clothes = sorted.filter((i: any) =>
    ['tops', 'bottoms', 'outerwear', 'dresses', 'full-body'].includes(i.products?.category)
  )
  const accessories = sorted.filter((i: any) =>
    ['accessories', 'bags', 'hats', 'jewelry'].includes(i.products?.category)
  )
  const shoes = sorted.filter((i: any) =>
    i.products?.category === 'shoes'
  )
  const other = sorted.filter((i: any) =>
    !clothes.includes(i) && !accessories.includes(i) && !shoes.includes(i)
  )

  return (
    <main className="min-h-screen bg-white text-gray-900">
      {/* Header */}
      <div className="max-w-5xl mx-auto px-6 py-8">
        <Link href="/admin/users" className="text-sm text-gray-500 hover:text-gray-800 mb-6 inline-block">
          ← Retour à la liste
        </Link>
        <h1 className="text-2xl font-bold">Dressing de l'utilisateur</h1>
        <p className="text-gray-400 text-sm font-mono mt-1">{userId}</p>
        <p className="text-gray-500 text-sm mt-1">{sorted.length} pièce{sorted.length !== 1 ? 's' : ''}</p>
      </div>

      {/* Portant principal */}
      <div className="max-w-5xl mx-auto px-6 pb-16">
        {/* Barre du portant */}
        <div className="relative flex justify-center mb-2">
          <div className="w-3/4 h-3 bg-gray-200 rounded-full shadow-inner" />
          {/* Crochets */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-6 h-6 border-t-4 border-gray-300 rounded-t-full" />
        </div>

        {/* Vêtements sur le portant */}
        <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-6 mb-8">
          <h2 className="text-xs uppercase tracking-widest text-gray-400 mb-4">Vêtements</h2>
          {clothes.length === 0 ? (
            <p className="text-gray-300 text-sm">Aucun vêtement</p>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-4">
              {clothes.map((item: any) => {
                const cover = item.products?.product_images[0]?.url
                return (
                  <div key={item.id} className="flex flex-col items-center gap-2">
                    {/* Cintre SVG */}
                    <svg viewBox="0 0 60 20" className="w-10 text-gray-300" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M30 2 Q30 8 10 14 Q5 15 5 18 H55 Q55 15 50 14 Q30 8 30 2" />
                      <circle cx="30" cy="2" r="2" />
                    </svg>
                    <div className="w-20 h-24 bg-gray-50 rounded-xl overflow-hidden border border-gray-100">
                      {cover
                        // eslint-disable-next-line @next/next/no-img-element
                        ? <img src={cover} alt="" className="w-full h-full object-cover" />
                        : <span className="flex items-center justify-center h-full text-2xl">👕</span>
                      }
                    </div>
                    <p className="text-xs text-center text-gray-500 truncate w-20">
                      {item.products?.brand}
                    </p>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Layout accessoires + chaussures */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {/* Accessoires */}
          <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-6">
            <h2 className="text-xs uppercase tracking-widest text-gray-400 mb-4">Accessoires</h2>
            {accessories.length === 0 && other.length === 0 ? (
              <p className="text-gray-300 text-sm">Aucun accessoire</p>
            ) : (
              <div className="grid grid-cols-3 gap-3">
                {[...accessories, ...other].map((item: any) => {
                  const cover = item.products?.product_images[0]?.url
                  return (
                    <div key={item.id} className="flex flex-col items-center gap-1">
                      <div className="w-16 h-16 bg-gray-50 rounded-xl overflow-hidden border border-gray-100">
                        {cover
                          // eslint-disable-next-line @next/next/no-img-element
                          ? <img src={cover} alt="" className="w-full h-full object-cover" />
                          : <span className="flex items-center justify-center h-full text-xl">👜</span>
                        }
                      </div>
                      <p className="text-xs text-center text-gray-500 truncate w-16">
                        {item.products?.brand}
                      </p>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Chaussures */}
          <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-6">
            <h2 className="text-xs uppercase tracking-widest text-gray-400 mb-4">Chaussures</h2>
            {shoes.length === 0 ? (
              <p className="text-gray-300 text-sm">Aucune chaussure</p>
            ) : (
              <div className="grid grid-cols-3 gap-3">
                {shoes.map((item: any) => {
                  const cover = item.products?.product_images[0]?.url
                  return (
                    <div key={item.id} className="flex flex-col items-center gap-1">
                      <div className="w-16 h-16 bg-gray-50 rounded-xl overflow-hidden border border-gray-100">
                        {cover
                          // eslint-disable-next-line @next/next/no-img-element
                          ? <img src={cover} alt="" className="w-full h-full object-cover" />
                          : <span className="flex items-center justify-center h-full text-xl">👟</span>
                        }
                      </div>
                      <p className="text-xs text-center text-gray-500 truncate w-16">
                        {item.products?.brand}
                      </p>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  )
}
