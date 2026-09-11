/**
 * GET /api/admin/products/:id/verify-tag?since=<ISO>
 *
 * Repond a une question que l'admin ne pouvait pas poser : "cette puce
 * physique porte-t-elle bien le token de CE produit ?"
 *
 * Principe : l'operateur lance le test, approche la puce d'un telephone, et
 * le scan atterrit dans /r/<token> qui journalise un evenement. Cette route
 * lit le dernier scan survenu depuis le debut du test, tous produits
 * confondus, et dit s'il correspond au produit attendu -- sinon elle nomme
 * le produit reellement pointe.
 *
 * Sans cela, une erreur d'ecriture ne se decouvre qu'apres livraison.
 */
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireAdminApi } from '@/lib/api-auth'

export const dynamic = 'force-dynamic'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await requireAdminApi()
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  const { id } = params
  const sinceParam = request.nextUrl.searchParams.get('since')
  const since = sinceParam ? new Date(sinceParam) : null
  if (!since || Number.isNaN(since.getTime())) {
    return NextResponse.json({ error: 'Parametre "since" (ISO 8601) requis' }, { status: 400 })
  }

  const supabase = await createClient()

  const { data: events, error } = await supabase
    .from('events')
    .select('product_id, event_type, payload, created_at')
    .in('event_type', ['nfc_scan', 'nfc_scan_blocked'])
    .gte('created_at', since.toISOString())
    .order('created_at', { ascending: false })
    .limit(1)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const scan = events?.[0]
  if (!scan) {
    return NextResponse.json({ state: 'waiting' })
  }

  if (scan.product_id === id) {
    return NextResponse.json({
      state: 'match',
      scanned_at: scan.created_at,
      tag_status: (scan.payload as any)?.tag_status ?? null,
    })
  }

  const { data: other } = await supabase
    .from('products')
    .select('katrya_id, brand, model_name')
    .eq('id', scan.product_id)
    .maybeSingle()

  return NextResponse.json({
    state: 'mismatch',
    scanned_at: scan.created_at,
    other_product: other ?? null,
  })
}
