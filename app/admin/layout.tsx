import Link from 'next/link'
import { headers } from 'next/headers'
import { requireProfile } from '@/lib/auth'

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Ne pas appliquer l'auth guard sur la page login
  const headersList = await headers()
  const pathname = headersList.get('x-invoke-path') ?? headersList.get('x-pathname') ?? ''
  if (pathname === '/admin/login') {
    return <>{children}</>
  }

  try {
    const { profile } = await requireProfile()
    return (
      <div style={{ fontFamily: 'system-ui, sans-serif', minHeight: '100vh', background: '#0a0a0a', color: '#fff' }}>
        <nav style={{ display: 'flex', gap: 24, padding: '16px 32px', borderBottom: '1px solid #222', alignItems: 'center' }}>
          <span style={{ fontWeight: 700, letterSpacing: 2, fontSize: 18 }}>KATRYA Admin</span>
          <Link href="/admin/products" style={{ color: '#aaa', textDecoration: 'none' }}>Produits</Link>
          <Link href="/admin/products/new" style={{ color: '#aaa', textDecoration: 'none' }}>Nouveau produit</Link>
          <Link href="/admin/wardrobe" style={{ color: '#aaa', textDecoration: 'none' }}>Dressing Virtuel</Link>
          <span style={{ marginLeft: 'auto', fontSize: 13, color: '#666' }}>Rôle : {profile.role}</span>
        </nav>
        <main style={{ maxWidth: 1100, margin: '0 auto', padding: '32px 24px' }}>
          {children}
        </main>
      </div>
    )
  } catch {
    return <>{children}</>
  }
}
