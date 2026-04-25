import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()

  // Check auth
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const formData = await request.formData()
  const url = formData.get('url') as string
  const alt_text = formData.get('alt_text') as string | null

  if (!url) {
    return NextResponse.json({ error: 'URL required' }, { status: 400 })
  }

  // Get current max position
  const { data: existing } = await supabase
    .from('product_images')
    .select('position')
    .eq('product_id', id)
    .order('position', { ascending: false })
    .limit(1)
    .maybeSingle()

  const position = existing ? existing.position + 1 : 0

  const { error } = await supabase
    .from('product_images')
    .insert({ product_id: id, url, alt_text: alt_text || null, position })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.redirect(new URL(`/admin/products/${id}`, request.url))
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const imageId = searchParams.get('imageId')

  if (!imageId) {
    return NextResponse.json({ error: 'imageId required' }, { status: 400 })
  }

  const { error } = await supabase
    .from('product_images')
    .delete()
    .eq('id', imageId)
    .eq('product_id', id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
