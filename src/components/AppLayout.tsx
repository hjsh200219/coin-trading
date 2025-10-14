import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Navigation from './Navigation'

type AppLayoutProps = {
  children: React.ReactNode
}

export default async function AppLayout({ children }: AppLayoutProps) {
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
    <div className="flex min-h-screen flex-col bg-background">
      <Navigation
        user={{
          email: profile.email,
          name: profile.name,
          avatar_url: profile.avatar_url,
        }}
        userType={profile.user_type}
      />

      <div className="flex-1 p-4 sm:p-6 md:p-8">
        <div className="max-w-7xl mx-auto">
          {children}
        </div>
      </div>
    </div>
  )
}
