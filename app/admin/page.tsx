import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function AdminPage() {
  const supabase = createClient()

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/admin/login')
  }

  // Charger les données du dashboard
  const [{ data: products }, { data: passports }, { data: events }] = await Promise.all([
    supabase.from('products').select('*').order('created_at', { ascending: false }),
    supabase.from('passports').select('*').order('created_at', { ascending: false }),
    supabase.from('events').select('*').order('created_at', { ascending: false }).limit(20)
  ])

  return (
    <main className="min-h-screen bg-gray-950 text-white p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl font-bold">KATRYA Admin</h1>
          <span className="text-sm text-gray-400">{user.email}</span>
        </div>

        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="bg-gray-900 rounded-xl p-4">
            <p className="text-gray-400 text-sm">Produits</p>
            <p className="text-3xl font-bold mt-1">{products?.length ?? 0}</p>
          </div>
          <div className="bg-gray-900 rounded-xl p-4">
            <p className="text-gray-400 text-sm">Passeports</p>
            <p className="text-3xl font-bold mt-1">{passports?.length ?? 0}</p>
          </div>
          <div className="bg-gray-900 rounded-xl p-4">
            <p className="text-gray-400 text-sm">Scans NFC (total)</p>
            <p className="text-3xl font-bold mt-1">{events?.length ?? 0}</p>
          </div>
        </div>

        <div className="bg-gray-900 rounded-xl p-6">
          <h2 className="text-lg font-semibold mb-4">Derniers scans</h2>
          {events && events.length > 0 ? (
            <div className="space-y-2">
              {events.map((event: any) => (
                <div key={event.id} className="flex justify-between text-sm py-2 border-b border-gray-800">
                  <span className="text-gray-400">{event.type}</span>
                  <span className="text-gray-500">{new Date(event.created_at).toLocaleString('fr-FR')}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500">Aucun scan enregistré</p>
          )}
        </div>
      </div>
    </main>
  )
}
