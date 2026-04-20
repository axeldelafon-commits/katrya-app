import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export interface Profile {
  id: string
  email: string
  role: string
}

export async function requireProfile(): Promise<{ profile: Profile }> {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()

  if (error || !user) {
    redirect('/admin/login')
  }

  // Try to get role from profiles table, fallback to user metadata
  const { data: profileData } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user!.id)
    .single()

  const profile: Profile = {
    id: user!.id,
    email: user!.email ?? '',
    role: profileData?.role ?? (user!.user_metadata?.role as string) ?? 'admin',
  }

  return { profile }
}
