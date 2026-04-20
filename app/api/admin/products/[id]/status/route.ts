import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { requireProfile } from '@/lib/auth'

const schema = z.object({
  status: z.enum(['draft', 'active', 'inactive', 'flagged', 'revoked', 'transferred']),
})

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user } = await requireProfile()
    const { id } = await params
    const body = schema.parse(await req.json())
    const supabase = await createClient()

    const { data: current } = await supabase.from('products').select('status').eq('id', id).single()

    const { data: product, error } = await supabase
      .from('products')
      .update({ status: body.status })
      .eq('id', id)
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 400 })

    await supabase.from('events').insert({
      product_id: id,
      event_type: 'status_changed',
      actor_type: 'user',
      actor_id: user.id,
      payload: { from: current?.status ?? null, to: body.status },
    })

    return NextResponse.json({ product }, { status: 200 })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Invalid request'
    return NextResponse.json({ error: msg }, { status: 400 })
  }
}
