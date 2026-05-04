import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireProfile } from '@/lib/auth'
import { generateKatryaId } from '@/lib/katrya'

/**
 * GET /api/admin/wardrobe
 *
 * Lists wardrobe items for the connected admin.
 * Joins to the underlying product so the admin UI can display real product
 * data (brand, model, category, photos) rather than just IDs.
 */
export async function GET() {
  try {
    const { user } = await requireProfile()
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('wardrobe_items')
      .select(`
        id, product_id, added_at, notes, is_favorite,
        products(
          id, katrya_id, brand, model_name, category, status,
          product_images(url, position)
        )
      `)
      .eq('user_id', user.id)
      .order('added_at', { ascending: false })
    if (error) throw error
    return NextResponse.json(data ?? [])
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Unauthorized'
    return NextResponse.json({ error: message }, { status: 401 })
  }
}

/**
 * Map a category label from the admin form (FR / mixed case) to the canonical
 * lowercase English value used everywhere else in the app (matches the emoji
 * mapping used by /wardrobe and /admin/products).
 */
function normalizeCategory(input: string | null | undefined): string {
  if (!input) return 'other'
  const v = input.trim().toLowerCase()
  const map: Record<string, string> = {
    haut: 'tops',
    bas: 'bottoms',
    chaussures: 'shoes',
    accessoire: 'accessories',
    veste: 'outerwear',
    robe: 'tops', // closest match in the existing taxonomy
    autre: 'other',
    // Pass-through for already-normalized values
    tops: 'tops',
    bottoms: 'bottoms',
    shoes: 'shoes',
    accessories: 'accessories',
    outerwear: 'outerwear',
    other: 'other',
  }
  return map[v] ?? v
}

/**
 * POST /api/admin/wardrobe
 *
 * Quick-create flow used by /admin/wardrobe/new.
 *
 * One form submission triggers, in order:
 *   1. Insert into `products`           (real catalog entry, gets a katrya_id)
 *   2. Insert into `product_images`     (only if image_url is provided)
 *   3. Insert into `nfc_tags`           (only if nfc_tag_id is provided)
 *   4. Insert into `wardrobe_items`     (links the new product to the admin's wardrobe)
 *
 * Body (all optional except `name`):
 *   { name, category, brand, color, size, image_url, nfc_tag_id, notes }
 *
 * Notes:
 * - `name` is split into a fake brand/model_name when those fields aren't filled
 *   in separately, because the products table requires both.
 * - `color` and `size` aren't first-class on `products`, so they are appended to
 *   the wardrobe item's `notes` field for now.
 */
export async function POST(req: NextRequest) {
  try {
    const { user, profile } = await requireProfile()
    const supabase = await createClient()

    const body = await req.json()
    const {
      name,
      category,
      brand,
      color,
      size,
      image_url,
      nfc_tag_id,
      notes,
    } = body as {
      name?: string
      category?: string
      brand?: string
      color?: string
      size?: string
      image_url?: string
      nfc_tag_id?: string
      notes?: string
    }

    if (!name || !name.trim()) {
      return NextResponse.json({ error: 'name required' }, { status: 400 })
    }

    if (!profile.organization_id) {
      return NextResponse.json(
        { error: 'Aucune organisation associée à ce compte. Demande à un super_admin de te lier à une organisation.' },
        { status: 400 }
      )
    }

    // ---- 1. Create the product ------------------------------------------------
    const cleanName = name.trim()
    const cleanBrand = (brand ?? '').trim() || 'KATRYA'
    // If brand not given but name has multiple words, use first word as brand
    const splitBrand = cleanBrand === 'KATRYA' && cleanName.includes(' ')
      ? cleanName.split(' ')[0]
      : cleanBrand
    const modelName = cleanBrand === 'KATRYA' && cleanName.includes(' ')
      ? cleanName.split(' ').slice(1).join(' ')
      : cleanName

    const katrya_id = generateKatryaId()

    const { data: product, error: productErr } = await supabase
      .from('products')
      .insert({
        organization_id: profile.organization_id,
        katrya_id,
        brand: splitBrand,
        model_name: modelName,
        category: normalizeCategory(category),
        status: 'active',
      })
      .select()
      .single()

    if (productErr || !product) {
      return NextResponse.json(
        { error: `Création produit: ${productErr?.message ?? 'unknown error'}` },
        { status: 500 }
      )
    }

    // ---- 2. Optional product image -------------------------------------------
    if (image_url && image_url.trim().startsWith('http')) {
      const { error: imgErr } = await supabase.from('product_images').insert({
        product_id: product.id,
        url: image_url.trim(),
        position: 0,
        alt_text: cleanName,
      })
      if (imgErr) {
        // Non-blocking: log but don't fail the whole flow
        console.error('product_images insert failed:', imgErr)
      }
    }

    // ---- 3. Optional NFC tag --------------------------------------------------
    if (nfc_tag_id && nfc_tag_id.trim()) {
      const tagToken = crypto.randomUUID()
      const { error: tagErr } = await supabase.from('nfc_tags').insert({
        product_id: product.id,
        tag_uid: nfc_tag_id.trim(),
        resolver_token: tagToken,
        resolver_url: `/api/r/${tagToken}`,
        status: 'active',
        activated_at: new Date().toISOString(),
      })
      if (tagErr) {
        console.error('nfc_tags insert failed:', tagErr)
        // Surface tag conflicts to the user (unique tag_uid)
        if (tagErr.code === '23505') {
          return NextResponse.json(
            {
              error: `Le NFC tag "${nfc_tag_id}" est déjà associé à un autre produit. Le produit a été créé mais sans la puce.`,
              product,
              warning: 'nfc_duplicate',
            },
            { status: 207 }
          )
        }
      }
    }

    // ---- 4. Add to admin's personal wardrobe ---------------------------------
    const wardrobeNotes: string[] = []
    if (color) wardrobeNotes.push(`Couleur : ${color}`)
    if (size) wardrobeNotes.push(`Taille : ${size}`)
    if (notes) wardrobeNotes.push(notes)

    const { data: wardrobeItem, error: wardrobeErr } = await supabase
      .from('wardrobe_items')
      .insert({
        user_id: user.id,
        product_id: product.id,
        notes: wardrobeNotes.length ? wardrobeNotes.join(' · ') : null,
      })
      .select()
      .single()

    if (wardrobeErr) {
      return NextResponse.json(
        {
          error: `Le produit a été créé mais n'a pas pu être ajouté au dressing : ${wardrobeErr.message}`,
          product,
        },
        { status: 207 }
      )
    }

    // ---- 5. Audit event ------------------------------------------------------
    await supabase.from('events').insert({
      product_id: product.id,
      event_type: 'product_created',
      actor_type: 'user',
      actor_id: user.id,
      payload: { katrya_id, source: 'admin_wardrobe_quick_create' },
    })

    return NextResponse.json(
      {
        product,
        wardrobe_item: wardrobeItem,
        katrya_id: product.katrya_id,
      },
      { status: 201 }
    )
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
