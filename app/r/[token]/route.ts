/**
 * app/r/[token]/route.ts
 * GET /r/:token — point d'entree des scans NFC.
 *
 * Quatre situations que l'utilisateur final ne doit jamais confondre :
 *   - puce inconnue          -> /tag/not-found  (le produit n'est pas un KATRYA)
 *   - puce revoquee          -> /tag/revoked    (elle a existe, elle ne vaut plus rien)
 *   - puce suspendue         -> /tag/inactive   (mise en pause, reversible)
 *   - panne d'infrastructure -> /tag/error      (service indisponible)
 *
 * Renvoyer "inconnu" pendant une panne reviendrait a signaler un produit
 * authentique comme une contrefacon. Et resoudre normalement une puce revoquee
 * reviendrait a authentifier ce qu'on a justement invalide : le statut est
 * lu ici, sinon la revocation n'existe que dans l'interface.
 *
 * 'pending' resout normalement : une puce fraichement gravee doit pouvoir
 * etre testee avant d'etre activee.
 */
import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

const BLOCKED: Record<string, string> = {
  revoked: '/tag/revoked',
  inactive: '/tag/inactive',
}

export async function GET(
  request: NextRequest,
  { params }: { params: { token: string } }
) {
  const { token } = params

  try {
    const supabase = createServiceClient()

    const { data: tag, error } = await supabase
      .from('nfc_tags')
      .select('product_id, status, products(katrya_id)')
      .eq('resolver_token', token)
      .maybeSingle()

    // Erreur base / reseau : on ne dit PAS que la puce est inconnue
    if (error) {
      console.error('[resolver] Supabase error:', error.message)
      return NextResponse.redirect(new URL('/tag/error', request.url))
    }

    if (!tag) {
      return NextResponse.redirect(new URL('/tag/not-found', request.url))
    }

    const product = tag.products as any
    if (!product?.katrya_id) {
      console.error('[resolver] tag sans produit associe:', token)
      return NextResponse.redirect(new URL('/tag/error', request.url))
    }

    const blockedPath = BLOCKED[tag.status]

    // Journalisation best-effort : un echec de log ne doit jamais casser un scan.
    // Un scan sur puce revoquee est une information precieuse (contrefacon en
    // circulation) : on l'enregistre sous un type distinct.
    try {
      await supabase.from('events').insert({
        product_id: tag.product_id,
        event_type: blockedPath ? 'nfc_scan_blocked' : 'nfc_scan',
        actor_type: 'anonymous',
        actor_id: null,
        payload: {
          token,
          tag_status: tag.status,
          user_agent: request.headers.get('user-agent'),
        },
      })
    } catch (logErr) {
      console.error('[resolver] event insert failed:', logErr)
    }

    if (blockedPath) {
      return NextResponse.redirect(new URL(blockedPath, request.url))
    }

    return NextResponse.redirect(new URL(`/p/${product.katrya_id}`, request.url))
  } catch (err) {
    console.error('[resolver] Unexpected error:', err)
    return NextResponse.redirect(new URL('/tag/error', request.url))
  }
}
