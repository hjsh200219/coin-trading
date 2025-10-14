import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import AppLayout from '@/components/AppLayout'
import ProfileCard from './ProfileCard'

const updateProfile = async (formData: FormData) => {
  'use server'
  const name = formData.get('name') as string

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return

  await supabase
    .from('user_profiles')
    .update({ name })
    .eq('id', user.id)

  revalidatePath('/my-page')
  redirect('/my-page')
}

export default async function MyPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // 사용자 프로필 가져오기
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (!profile) {
    redirect('/login')
  }

  return (
    <AppLayout>
      <ProfileCard profile={profile} updateProfile={updateProfile} />
    </AppLayout>
  )
}
