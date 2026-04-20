import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { requireProfile } from '@/lib/auth'

const schema = z.object({
  product_id: z.string().uuid(),
  public_data: z.record(z.unknown()),
  private_data: z.record(z.unknown()).default({}),
})

export async function POST(req: Request) {
  try {
    const { user } = await requireProfile()
    const body = schema.parse(await req.json())
    const supabase = await createClient()

    const { data: lastPassport } = await supabase
      .from('passports').select('version').eq('product_id', body.product_id)
      .order('version', { ascending: false }).limit(1).maybeSingle()

    const version = (lastPassport?.version ?? 0) + 1

    const { data: passport, error } = await supabase
      .from('passports')
      .insert({
        product_id: body.product_id,
        version,
        public_data: body.public_data,
        private_data: body.private_data,
        published_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 400 })

    await supabase.from('events').insert({
      product_id: body.product_id,
      event_type: 'passport_published',
      actor_type: 'user',
      actor_id: user.id,
      payload: { version },
    })

    return NextResponse.json({ passport }, { status: 201 })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Invalid request'
    return NextResponse.json({ error: msg }, { status: 400 })
  }
}
