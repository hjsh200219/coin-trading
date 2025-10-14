import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import AppLayout from '@/components/AppLayout'
import UserTypeSelect from './UserTypeSelect'

type UserProfile = {
  id: string
  email: string
  name: string | null
  avatar_url: string | null
  user_type: 'admin' | 'member' | 'quest'
  created_at: string
}

export default async function AdminPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // 현재 사용자의 프로필 확인
  const { data: currentProfile, error: profileError } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  // 프로필 조회 에러 확인
  if (profileError) {
    console.error('Profile error:', profileError)
    return (
      <main className="flex min-h-screen items-center justify-center bg-background p-4">
        <div className="bg-surface-100 p-8 rounded-lg border border-border max-w-md w-full">
          <h1 className="text-xl font-bold text-foreground mb-4">데이터베이스 오류</h1>
          <p className="text-foreground/70 mb-4">
            사용자 프로필을 불러올 수 없습니다.
          </p>
          <p className="text-sm text-foreground/50 mb-4">
            오류: {profileError.message}
          </p>
          <p className="text-sm text-foreground/50 mb-4">
            Supabase에서 <code className="bg-surface-75 px-2 py-1 rounded">supabase-schema.sql</code> 파일을 실행했는지 확인하세요.
          </p>
          <Link
            href="/"
            className="block w-full text-center px-4 py-2 bg-brand text-background rounded-lg"
          >
            홈으로 돌아가기
          </Link>
        </div>
      </main>
    )
  }

  // 관리자가 아니면 홈으로 리다이렉트
  if (!currentProfile || currentProfile.user_type !== 'admin') {
    redirect('/')
  }

  // 모든 사용자 목록 가져오기
  const { data: users, error } = await supabase
    .from('user_profiles')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching users:', error)
  }

  const updateUserType = async (formData: FormData) => {
    'use server'
    const userId = formData.get('userId') as string
    const userType = formData.get('userType') as string

    const supabase = await createClient()
    await supabase
      .from('user_profiles')
      .update({ user_type: userType })
      .eq('id', userId)

    redirect('/admin')
  }

  const getUserTypeBadgeColor = (userType: string) => {
    switch (userType) {
      case 'admin':
        return 'bg-brand text-background'
      case 'member':
        return 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
      case 'quest':
        return 'bg-surface-75 text-foreground/60 border border-border'
      default:
        return 'bg-surface-75 text-foreground/60'
    }
  }

  const getUserTypeLabel = (userType: string) => {
    switch (userType) {
      case 'admin':
        return '관리자'
      case 'member':
        return '멤버'
      case 'quest':
        return '게스트'
      default:
        return userType
    }
  }

  return (
    <AppLayout>
      <div className="mb-6">
        <p className="text-sm text-foreground/60">
          총 {users?.length || 0}명의 사용자
        </p>
      </div>

      <div>
            <div className="bg-surface-100 rounded-lg border border-border overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-surface-75 border-b border-border">
                    <tr>
                      <th className="px-4 py-3 text-center text-xs font-medium text-foreground/70 uppercase tracking-wider">
                        사용자
                      </th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-foreground/70 uppercase tracking-wider">
                        타입
                      </th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-foreground/70 uppercase tracking-wider">
                        가입일
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {users?.map((profile: UserProfile) => (
                      <tr key={profile.id} className="hover:bg-surface-75 transition">
                        <td className="px-4 py-4 whitespace-nowrap">
                          <div className="flex items-center  gap-3">
                            <div className="flex sm:flex-row flex-col gap-1">
                              <span className="text-sm text-left font-medium text-foreground">
                                {profile.name || '이름 없음'}
                              </span>
                              <span className="text-xs text-left text-foreground/70">
                                {profile.email}
                              </span>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-4 text-center whitespace-nowrap">
                          <UserTypeSelect
                            userId={profile.id}
                            currentType={profile.user_type}
                            updateUserType={updateUserType}
                          />
                        </td>
                        <td className="px-4 py-4 text-center whitespace-nowrap">
                          <span className="text-xs text-foreground/70">
                            {new Date(profile.created_at).toLocaleDateString('ko-KR')}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
      </div>
    </AppLayout>
  )
}
