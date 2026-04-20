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
      .select('passport_id, passports(katrya_id)')
      .eq('resolver_token', token)
      .single()
    
    if (error || !tag) {
      return NextResponse.redirect(new URL('/', request.url))
    }
    
    // Enregistrer l'event de scan
    await supabase.from('events').insert({
      passport_id: tag.passport_id,
      type: 'nfc_scan',
      meta: { token, user_agent: request.headers.get('user-agent') }
    })
    
    // Rediriger vers le passeport public
    const passport = tag.passports as any
    return NextResponse.redirect(
      new URL(`/p/${passport.katrya_id}`, request.url)
    )
  } catch (err) {
    return NextResponse.redirect(new URL('/', request.url))
  }
}
