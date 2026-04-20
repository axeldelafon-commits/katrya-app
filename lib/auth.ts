import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export async function requireProfile() {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()

  if (error || !user) {
    redirect('/admin/login')
  }

  return user
}
