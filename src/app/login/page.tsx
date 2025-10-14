'use client'

import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

export default function Login() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const supabase = createClient()

  const handleGoogleLogin = async () => {
    try {
      setIsLoading(true)
      
      // 디버깅: 환경 변수 확인
      console.log('Supabase URL:', process.env.NEXT_PUBLIC_SUPABASE_URL)
      console.log('Has Anon Key:', !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
      console.log('Redirect URL:', `${window.location.origin}/auth/callback`)
      
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      })

      console.log('OAuth response:', { data, error })

      if (error) {
        console.error('Login error:', error)
        alert(`로그인에 실패했습니다: ${error.message}`)
      }
    } catch (error) {
      console.error('Unexpected error:', error)
      alert(`예상치 못한 오류가 발생했습니다: ${error}`)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 sm:px-6">
      <div className="bg-surface-100 p-6 sm:p-8 rounded-2xl border border-border max-w-md w-full">
        <div className="text-center mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-2">
            Coin Trading
          </h1>
          <p className="text-sm sm:text-base text-foreground/60">
            Google 계정으로 로그인하세요
          </p>
        </div>

        <button
          onClick={handleGoogleLogin}
          disabled={isLoading}
          className="w-full bg-surface-75 active:bg-overlay-hover text-foreground font-semibold py-3.5 sm:py-3 px-4 border border-border rounded-lg transition duration-200 flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation"
        >
          <svg className="w-5 h-5 sm:w-6 sm:h-6 flex-shrink-0" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            />
          </svg>
          <span className="text-sm sm:text-base">
            {isLoading ? '로그인 중...' : 'Google로 계속하기'}
          </span>
        </button>

        <div className="mt-6 text-center text-xs sm:text-sm text-foreground/50">
          <p>로그인하면 서비스 이용약관 및</p>
          <p>개인정보 처리방침에 동의하게 됩니다</p>
        </div>
      </div>
    </div>
  )
}
