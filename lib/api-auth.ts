/**
 * lib/api-auth.ts
 * Garde d'authentification pour les routes API sensibles.
 *
 * Les routes /api/nft/* declenchent des transactions on-chain payees en POL
 * par le wallet KATRYA : elles doivent etre reservees aux admins connectes.
 * getUser() (et non getSession()) est utilise car il valide le JWT
 * cote serveur aupres de Supabase.
 */
import { createClient } from '@/lib/supabase/server'

const ADMIN_ROLES = ['admin', 'super_admin']

export interface ApiAuthResult {
  ok: boolean
  status: number
  error?: string
  userId?: string
  role?: string
}

export async function requireAdminApi(): Promise<ApiAuthResult> {
  try {
    const supabase = createClient()
    const { data, error } = await supabase.auth.getUser()
    const user = data?.user

    if (error || !user) {
      return { ok: false, status: 401, error: 'Authentification requise' }
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('user_id', user.id)
      .maybeSingle()

    const role =
      (profile?.role as string | undefined) ??
      (user.user_metadata?.role as string | undefined)

    if (!role || !ADMIN_ROLES.includes(role)) {
      return { ok: false, status: 403, error: 'Acces reserve aux administrateurs' }
    }

    return { ok: true, status: 200, userId: user.id, role }
  } catch (err) {
    console.error('[api-auth] Unexpected error:', err)
    return { ok: false, status: 401, error: 'Authentification requise' }
  }
}
