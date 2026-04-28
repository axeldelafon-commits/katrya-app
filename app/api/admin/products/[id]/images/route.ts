import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: images, error } = await supabase
    .from('product_images')
    .select('*')
    .eq('product_id', id)
    .order('position', { ascending: true })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ images })
}

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
  const file = formData.get('file') as File | null
  const urlInput = formData.get('url') as string | null
  const alt_text = formData.get('alt_text') as string | null

  let finalUrl: string | null = null

  if (file && file.size > 0) {
    // Handle file upload to Supabase Storage
    const fileExt = file.name.split('.').pop() || 'jpg'
    const fileName = `${id}/${Date.now()}.${fileExt}`
    const arrayBuffer = await file.arrayBuffer()
    const buffer = new Uint8Array(arrayBuffer)

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('product-images')
      .upload(fileName, buffer, {
        contentType: file.type,
        upsert: false,
      })

    if (uploadError) {
      return NextResponse.json({ error: uploadError.message }, { status: 500 })
    }

    const { data: { publicUrl } } = supabase.storage
      .from('product-images')
      .getPublicUrl(uploadData.path)

    finalUrl = publicUrl
  } else if (urlInput) {
    finalUrl = urlInput
  }

  if (!finalUrl) {
    return NextResponse.json({ error: 'URL or file required' }, { status: 400 })
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

  const { data: newImage, error } = await supabase
    .from('product_images')
    .insert({ product_id: id, url: finalUrl, alt_text: alt_text || null, position })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ image: newImage })
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

  // Fetch the image to know its position before deletion
  const { data: deletedImage } = await supabase
    .from('product_images')
    .select('position')
    .eq('id', imageId)
    .eq('product_id', id)
    .maybeSingle()

  const { error } = await supabase
    .from('product_images')
    .delete()
    .eq('id', imageId)
    .eq('product_id', id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Re-pack positions of remaining images so they stay contiguous (0..n-1)
  if (deletedImage) {
    const { data: remaining } = await supabase
      .from('product_images')
      .select('id, position')
      .eq('product_id', id)
      .order('position', { ascending: true })

    if (remaining && remaining.length > 0) {
      await Promise.all(
        remaining.map((img, idx) =>
          supabase
            .from('product_images')
            .update({ position: idx })
            .eq('id', img.id)
        )
      )
    }
  }

  return NextResponse.json({ success: true })
}

/**
 * PATCH — réordonne les images du produit.
 * Body JSON: { order: string[] }  (tableau d'IDs d'images, dans l'ordre voulu)
 * Retourne la liste à jour des images.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: { order?: unknown }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const order = body.order
  if (!Array.isArray(order) || order.some((x) => typeof x !== 'string')) {
    return NextResponse.json(
      { error: 'Body must be { order: string[] } where each item is an image id' },
      { status: 400 }
    )
  }

  // Charge les images actuelles pour vérifier l'appartenance au produit
  const { data: existing, error: fetchError } = await supabase
    .from('product_images')
    .select('id')
    .eq('product_id', id)

  if (fetchError) {
    return NextResponse.json({ error: fetchError.message }, { status: 500 })
  }

  const existingIds = new Set((existing || []).map((img) => img.id))
  const orderIds = order as string[]

  // L'ordre doit contenir exactement les images du produit (mêmes IDs, sans doublon)
  const orderSet = new Set(orderIds)
  if (
    orderSet.size !== orderIds.length ||
    orderSet.size !== existingIds.size ||
    !orderIds.every((imgId) => existingIds.has(imgId))
  ) {
    return NextResponse.json(
      { error: 'Order list must contain exactly the product images, without duplicates' },
      { status: 400 }
    )
  }

  // Met à jour les positions en parallèle
  const updates = await Promise.all(
    orderIds.map((imgId, idx) =>
      supabase
        .from('product_images')
        .update({ position: idx })
        .eq('id', imgId)
        .eq('product_id', id)
    )
  )

  const updateError = updates.find((u) => u.error)?.error
  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 })
  }

  const { data: images, error: reloadError } = await supabase
    .from('product_images')
    .select('*')
    .eq('product_id', id)
    .order('position', { ascending: true })

  if (reloadError) {
    return NextResponse.json({ error: reloadError.message }, { status: 500 })
  }

  return NextResponse.json({ images })
}
