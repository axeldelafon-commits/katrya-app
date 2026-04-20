import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'

export default async function AdminProductsPage() {
  const supabase = await createClient()
  const { data: products, error } = await supabase
    .from('products')
    .select('id, katrya_id, brand, model_name, category, status, created_at')
    .order('created_at', { ascending: false })
    .limit(100)

  if (error) {
    return <div style={{ padding: 24 }}><h2>Erreur</h2><p>{error.message}</p></div>
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h1 style={{ margin: 0 }}>Produits</h1>
        <Link href="/admin/products/new" style={btnStyle}>+ Créer un produit</Link>
      </div>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #333' }}>
              <th style={th}>ID KATRYA</th>
              <th style={th}>Marque</th>
              <th style={th}>Produit</th>
              <th style={th}>Catégorie</th>
              <th style={th}>Statut</th>
              <th style={th}>Créé le</th>
              <th style={th}>Action</th>
            </tr>
          </thead>
          <tbody>
            {products?.map((p) => (
              <tr key={p.id} style={{ borderBottom: '1px solid #1a1a1a' }}>
                <td style={td}><code style={{ fontSize: 12 }}>{p.katrya_id}</code></td>
                <td style={td}>{p.brand}</td>
                <td style={td}>{p.model_name}</td>
                <td style={td}>{p.category}</td>
                <td style={td}><span style={statusBadge(p.status)}>{p.status}</span></td>
                <td style={td}>{new Date(p.created_at).toLocaleDateString('fr-FR')}</td>
                <td style={td}>
                  <Link href={`/admin/products/${p.id}`} style={{ color: '#0cf', textDecoration: 'none', fontSize: 13 }}>Ouvrir</Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!products?.length && <p style={{ color: '#666', padding: '24px 0' }}>Aucun produit. <Link href="/admin/products/new" style={{ color: '#0cf' }}>Créer le premier.</Link></p>}
      </div>
    </div>
  )
}

const th: React.CSSProperties = { textAlign: 'left', padding: '10px 12px', fontSize: 13, color: '#888', fontWeight: 600 }
const td: React.CSSProperties = { padding: '12px', fontSize: 14 }
const btnStyle: React.CSSProperties = { background: '#fff', color: '#000', padding: '8px 18px', borderRadius: 8, textDecoration: 'none', fontWeight: 600, fontSize: 14 }

function statusBadge(status: string): React.CSSProperties {
  const colors: Record<string, string> = {
    active: '#16a34a', draft: '#ca8a04', inactive: '#6b7280',
    flagged: '#ea580c', revoked: '#dc2626', transferred: '#7c3aed'
  }
  return { background: colors[status] ?? '#333', color: '#fff', padding: '2px 10px', borderRadius: 12, fontSize: 12, fontWeight: 600 }
}
