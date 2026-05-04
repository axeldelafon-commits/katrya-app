import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import type { User } from '@supabase/supabase-js'

export interface Profile {
  id: string
  email: string
  role: string
  organization_id: string | null
}

export async function requireProfile(): Promise<{ user: User; profile: Profile }> {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()

  if (error || !user) {
    redirect('/admin/login')
  }

  // Try to get profile data from profiles table.
  // The profiles table has its own auto-generated id (PK) and a user_id
  // that links to auth.users — match on user_id, not on id.
  const { data: profileData } = await supabase
    .from('profiles')
    .select('role, organization_id')
    .eq('user_id', user!.id)
    .single()

  const profile: Profile = {
    id: user!.id,
    email: user!.email ?? '',
    role: profileData?.role ?? (user!.user_metadata?.role as string) ?? 'admin',
    organization_id: profileData?.organization_id ?? null,
  }

  return { user: user!, profile }
}
