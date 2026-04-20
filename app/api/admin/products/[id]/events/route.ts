import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireProfile } from '@/lib/auth'

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireProfile()
    const { id } = await params
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('events')
      .select('*')
      .eq('product_id', id)
      .order('created_at', { ascending: false })

    if (error) return NextResponse.json({ error: error.message }, { status: 400 })

    return NextResponse.json({ events: data }, { status: 200 })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Unauthorized'
    return NextResponse.json({ error: msg }, { status: 401 })
  }
}
