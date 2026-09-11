import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { requireProfile } from '@/lib/auth'
import NewProductForm from './new-product-form'

export const dynamic = 'force-dynamic'

export default async function NewProductPage() {
  const { profile } = await requireProfile()
  const supabase = await createClient()

  // Un super_admin peut creer pour n'importe quelle organisation ;
  // un admin d'organisation ne voit que la sienne.
  let query = supabase.from('organizations').select('id, name').eq('status', 'active').order('name')
  if (profile.role !== 'super_admin' && profile.organization_id) {
    query = query.eq('id', profile.organization_id)
  }
  const { data: organizations, error } = await query

  if (error) {
    return (
      <div style={{ maxWidth: 640 }}>
        <h1>Nouveau produit</h1>
        <p style={{ color: '#f87171' }}>
          Impossible de charger la liste des organisations : {error.message}
        </p>
      </div>
    )
  }

  if (!organizations || organizations.length === 0) {
    redirect('/admin/products')
  }

  return <NewProductForm organizations={organizations} />
}
