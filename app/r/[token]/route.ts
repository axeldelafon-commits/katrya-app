import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

export async function GET(
  request: NextRequest,
  { params }: { params: { token: string } }
) {
  const { token } = params

  try {
    const supabase = createServiceClient()

    // Chercher le tag NFC par son resolver_token
    const { data: tag, error } = await supabase
      .from('nfc_tags')
      .select('product_id, products(katrya_id)')
      .eq('resolver_token', token)
      .single()

    if (error || !tag) {
      return NextResponse.redirect(new URL('/', request.url))
    }

    // Enregistrer l'event de scan
    await supabase.from('events').insert({
      product_id: tag.product_id,
      event_type: 'nfc_scan',
      actor_type: 'anonymous',
      actor_id: null,
      payload: { token, user_agent: request.headers.get('user-agent') }
    })

    // Rediriger vers le passeport public
    const product = tag.products as any
    return NextResponse.redirect(
      new URL(`/p/${product.katrya_id}`, request.url)
    )
  } catch (err) {
    return NextResponse.redirect(new URL('/', request.url))
  }
}
