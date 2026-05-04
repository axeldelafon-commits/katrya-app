import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export default async function AdminUsersPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/admin/login')

  // Charger tous les utilisateurs qui ont au moins 1 article dans leur dressing
  const { data: wardrobeUsers } = await supabase
    .from('wardrobe_items')
    .select(`
      user_id,
      products(katrya_id, brand, model_name, category, product_images(url, position))
    `)
    .order('user_id')

  // Regrouper par user_id
  const byUser: Record<string, any[]> = {}
  for (const row of wardrobeUsers ?? []) {
    if (!byUser[row.user_id]) byUser[row.user_id] = []
    byUser[row.user_id].push(row)
  }

  const userIds = Object.keys(byUser)

  return (
    <main className="max-w-5xl mx-auto px-6 py-10">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Dressings utilisateurs</h1>
        <p className="text-gray-400 text-sm mt-1">{userIds.length} utilisateur{userIds.length !== 1 ? 's' : ''} avec des articles</p>
      </div>

      {userIds.length === 0 ? (
        <div className="text-gray-500 text-center py-20">
          Aucun utilisateur n&apos;a encore ajouté d&apos;article à son dressing.
        </div>
      ) : (
        <div className="grid gap-4">
          {userIds.map(userId => {
            const items = byUser[userId]
            const count = items.length
            // Première image du premier produit comme apercu
            const firstItem = items[0]
            const firstProduct = firstItem?.products
            const sortedImgs = (firstProduct?.product_images ?? [])
              .slice()
              .sort((a: any, b: any) => a.position - b.position)
            const cover = sortedImgs[0]?.url

            return (
              <Link
                key={userId}
                href={`/admin/users/${userId}/wardrobe`}
                className="flex items-center gap-4 bg-gray-900 rounded-2xl p-4 hover:bg-gray-800 transition border border-white/5 hover:border-white/20"
              >
                {/* Miniature */}
                <div className="w-14 h-14 rounded-xl bg-gray-800 flex items-center justify-center overflow-hidden flex-shrink-0">
                  {cover ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={cover} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-2xl">👗</span>
                  )}
                </div>

                {/* Infos */}
                <div className="flex-1 min-w-0">
                  <p className="text-white font-mono text-sm truncate">{userId.slice(0, 8)}…</p>
                  <p className="text-gray-400 text-xs mt-0.5">
                    {count} pièce{count !== 1 ? 's' : ''} dans le dressing
                  </p>
                  <div className="flex gap-1 mt-2 flex-wrap">
                    {items.slice(0, 5).map((it: any, i: number) => {
                      const imgs = (it.products?.product_images ?? [])
                        .slice()
                        .sort((a: any, b: any) => a.position - b.position)
                      const thumb = imgs[0]?.url
                      return (
                        <div key={i} className="w-8 h-8 rounded-lg bg-gray-700 overflow-hidden flex-shrink-0">
                          {thumb ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={thumb} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <span className="text-xs flex items-center justify-center h-full">👗</span>
                          )}
                        </div>
                      )
                    })}
                    {count > 5 && (
                      <div className="w-8 h-8 rounded-lg bg-gray-700 flex items-center justify-center">
                        <span className="text-xs text-gray-400">+{count - 5}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="text-gray-600 text-sm">→</div>
              </Link>
            )
          })}
        </div>
      )}
    </main>
  )
}
