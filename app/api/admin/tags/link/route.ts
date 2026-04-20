import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { requireProfile } from '@/lib/auth'
import { buildResolverUrl, generateResolverToken } from '@/lib/katrya'

const schema = z.object({
  product_id: z.string().uuid(),
  tag_uid: z.string().optional().nullable(),
})

export async function POST(req: Request) {
  try {
    const { user } = await requireProfile()
    const body = schema.parse(await req.json())
    const supabase = await createClient()

    const { data: product, error: productError } = await supabase
      .from('products').select('*').eq('id', body.product_id).maybeSingle()

    if (productError || !product) return NextResponse.json({ error: 'Product not found' }, { status: 404 })

    const resolver_token = generateResolverToken()
    const resolver_url = buildResolverUrl(resolver_token)

    const { data: tag, error } = await supabase
      .from('nfc_tags')
      .upsert({
        product_id: body.product_id,
        tag_uid: body.tag_uid ?? null,
        resolver_token,
        resolver_url,
        status: 'pending',
      }, { onConflict: 'product_id' })
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 400 })

    await supabase.from('events').insert({
      product_id: body.product_id,
      event_type: 'tag_linked',
      actor_type: 'user',
      actor_id: user.id,
      payload: { tag_uid: body.tag_uid ?? null, resolver_url },
    })

    return NextResponse.json({ tag }, { status: 200 })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Invalid request'
    return NextResponse.json({ error: msg }, { status: 400 })
  }
}
