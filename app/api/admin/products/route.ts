import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { requireProfile } from '@/lib/auth'
import { generateKatryaId } from '@/lib/katrya'

const schema = z.object({
  organization_id: z.string().uuid(),
  brand: z.string().min(1),
  model_name: z.string().min(1),
  sku: z.string().optional().nullable(),
  serial_number: z.string().optional().nullable(),
  category: z.string().min(1),
})

export async function POST(req: Request) {
  try {
    const { user, profile } = await requireProfile()
    const body = schema.parse(await req.json())

    if (profile.role !== 'super_admin' && profile.organization_id !== body.organization_id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const supabase = await createClient()
    const katrya_id = generateKatryaId()

    const { data: product, error } = await supabase
      .from('products')
      .insert({
        organization_id: body.organization_id,
        katrya_id,
        brand: body.brand,
        model_name: body.model_name,
        sku: body.sku ?? null,
        serial_number: body.serial_number ?? null,
        category: body.category,
        status: 'draft',
      })
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 400 })

    await supabase.from('events').insert({
      product_id: product.id,
      event_type: 'product_created',
      actor_type: 'user',
      actor_id: user.id,
      payload: { katrya_id },
    })

    return NextResponse.json({ product }, { status: 201 })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Invalid request'
    return NextResponse.json({ error: msg }, { status: 400 })
  }
}
