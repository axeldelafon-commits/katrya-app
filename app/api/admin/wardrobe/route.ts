import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { requireProfile } from '@/lib/auth'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET() {
  try {
    await requireProfile()
    const { data, error } = await supabase
      .from('wardrobe_items')
      .select('*')
      .order('created_at', { ascending: false })
    if (error) throw error
    return NextResponse.json(data)
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}

export async function POST(req: NextRequest) {
  try {
    await requireProfile()
    const body = await req.json()
    const { name, category, brand, color, size, image_url, nfc_tag_id } = body
    if (!name) {
      return NextResponse.json({ error: 'name required' }, { status: 400 })
    }
    const { data, error } = await supabase
      .from('wardrobe_items')
      .insert([{ name, category, brand, color, size, image_url, nfc_tag_id: nfc_tag_id || null }])
      .select()
      .single()
    if (error) throw error
    return NextResponse.json(data, { status: 201 })
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
