import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import LinkTagForm from './link-tag-form'
import PublishPassportForm from './publish-passport-form'
import StatusForm from './status-form'

export default async function ProductDetailPage({
  params
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()
  const { data: product } = await supabase
    .from('products')
    .select('*')
    .eq('id', id)
    .maybeSingle()
  if (!product) notFound()

  const { data: tag } = await supabase
    .from('nfc_tags')
    .select('*')
    .eq('product_id', id)
    .maybeSingle()

  const { data: latestPassport } = await supabase
    .from('passports')
    .select('*')
    .eq('product_id', id)
    .order('version', { ascending: false })
    .limit(1)
    .maybeSingle()

  const { data: events } = await supabase
    .from('events')
    .select('*')
    .eq('product_id', id)
    .order('created_at', { ascending: false })
    .limit(20)

  const { data: images } = await supabase
    .from('product_images')
    .select('*')
    .eq('product_id', id)
    .order('position', { ascending: true })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <Link href="/admin/products" style={{ color: '#888', textDecoration: 'none', fontSize: 14 }}>
          ← Retour
        </Link>
        <h1 style={{ margin: 0 }}>{product.model_name}</h1>
      </div>

      <div style={grid2}>
        <div style={card}>
          <h3 style={{ margin: '0 0 12px' }}>Infos produit</h3>
          <p><strong>Marque :</strong> {product.brand}</p>
          <p><strong>ID KATRYA :</strong> <code>{product.katrya_id}</code></p>
          <p><strong>Statut :</strong> {product.status}</p>
          <p><strong>Catégorie :</strong> {product.category}</p>
          <p><strong>SKU :</strong> {product.sku ?? '—'}</p>
          <p><strong>Série :</strong> {product.serial_number ?? '—'}</p>
          <p><strong>Créé :</strong> {new Date(product.created_at).toLocaleString('fr-FR')}</p>
          <Link href={`/p/${product.katrya_id}`} target="_blank" style={{ color: '#0cf', fontSize: 13 }}>
            Voir passeport public ↗
          </Link>
        </div>

        <div style={card}>
          <h3 style={{ margin: '0 0 12px' }}>Statut produit</h3>
          <StatusForm productId={id} currentStatus={product.status} />
        </div>
      </div>

      {/* Photos du produit */}
      <div style={card}>
        <h3 style={{ margin: '0 0 16px' }}>Photos du produit</h3>
        {images && images.length > 0 ? (
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 20 }}>
            {images.map((img, i) => (
              <div key={img.id} style={{ position: 'relative' }}>
                <img
                  src={img.url}
                  alt={img.alt_text || `Photo ${i + 1}`}
                  style={{ width: 100, height: 100, objectFit: 'cover', borderRadius: 8, border: '1px solid #333' }}
                />
                <span style={{ position: 'absolute', top: 4, left: 4, background: '#000', color: '#fff', fontSize: 10, padding: '2px 6px', borderRadius: 4 }}>#{i + 1}</span>
              </div>
            ))}
          </div>
        ) : (
          <p style={{ color: '#888', marginBottom: 16 }}>Aucune photo. Ajoutez des URLs ci-dessous.</p>
        )}
        <form action={`/api/admin/products/${id}/images`} method="POST" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <label style={{ fontSize: 13, color: '#aaa' }}>URL de l&apos;image</label>
          <input
            name="url"
            type="url"
            placeholder="https://..."
            required
            style={{ background: '#111', border: '1px solid #333', borderRadius: 8, padding: '8px 12px', color: '#fff', fontSize: 14 }}
          />
          <label style={{ fontSize: 13, color: '#aaa' }}>Texte alternatif (optionnel)</label>
          <input
            name="alt_text"
            type="text"
            placeholder="Description de l'image"
            style={{ background: '#111', border: '1px solid #333', borderRadius: 8, padding: '8px 12px', color: '#fff', fontSize: 14 }}
          />
          <button
            type="submit"
            style={{ background: '#0cf', color: '#000', border: 'none', borderRadius: 8, padding: '10px 20px', fontWeight: 600, cursor: 'pointer', width: 'fit-content' }}
          >
            Ajouter cette photo
          </button>
        </form>
      </div>

      <div style={card}>
        <h3 style={{ margin: '0 0 12px' }}>Puce NFC</h3>
        {tag ? (
          <div>
            <p><strong>Statut tag :</strong> {tag.status}</p>
            <p><strong>Tag UID :</strong> {tag.tag_uid ?? '—'}</p>
            <p><strong>Resolver token :</strong> <code style={{ fontSize: 12 }}>{tag.resolver_token}</code></p>
            <p><strong>URL à écrire dans la puce :</strong> <a href={tag.resolver_url} target="_blank" style={{ color: '#0cf' }}>{tag.resolver_url}</a></p>
          </div>
        ) : (
          <p style={{ color: '#888' }}>Aucune puce liée.</p>
        )}
        <LinkTagForm productId={id} />
      </div>

      <div style={card}>
        <h3 style={{ margin: '0 0 12px' }}>Passeport</h3>
        {latestPassport ? (
          <p><strong>Dernière version :</strong> v{latestPassport.version} — {latestPassport.published_at ? new Date(latestPassport.published_at).toLocaleString('fr-FR') : 'Non publié'}</p>
        ) : (
          <p style={{ color: '#888' }}>Aucun passeport publié.</p>
        )}
        <PublishPassportForm productId={id} product={{ brand: product.brand, model_name: product.model_name, category: product.category }} />
      </div>

      <div style={card}>
        <h3 style={{ margin: '0 0 12px' }}>Journal d’événements</h3>
        {events?.map((ev) => (
          <div key={ev.id} style={{ borderBottom: '1px solid #1a1a1a', paddingBottom: 12, marginBottom: 12 }}>
            <p style={{ margin: '0 0 4px' }}>
              <strong>{ev.event_type}</strong> <span style={{ color: '#888', fontSize: 12 }}>— {ev.actor_type}</span>
            </p>
            <p style={{ margin: '0 0 4px', fontSize: 12, color: '#666' }}>
              {new Date(ev.created_at).toLocaleString('fr-FR')}
            </p>
            <pre style={preStyle}>{JSON.stringify(ev.payload, null, 2)}</pre>
          </div>
        ))}
        {!events?.length && <p style={{ color: '#888' }}>Aucun événement.</p>}
      </div>
    </div>
  )
}

const card: React.CSSProperties = {
  border: '1px solid #222',
  borderRadius: 12,
  padding: 20
}

const grid2: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
  gap: 24
}

const preStyle: React.CSSProperties = {
  background: '#0d0d0d',
  padding: 8,
  borderRadius: 6,
  overflowX: 'auto',
  fontSize: 11,
  margin: 0
}
