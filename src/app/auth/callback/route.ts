import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/market'

  console.log('[Auth Callback] Request URL:', request.url)
  console.log('[Auth Callback] Origin:', origin)
  console.log('[Auth Callback] Code exists:', !!code)
  console.log('[Auth Callback] Next:', next)

  if (code) {
    const cookieStore = await cookies()

    console.log('[Auth Callback] Creating Supabase client')
    console.log('[Auth Callback] URL exists:', !!process.env.NEXT_PUBLIC_SUPABASE_URL)
    console.log('[Auth Callback] Anon Key exists:', !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options)
            })
          },
        },
      }
    )

    console.log('[Auth Callback] Exchanging code for session')
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)
    console.log('[Auth Callback] Exchange result - User ID:', data?.user?.id)
    console.log('[Auth Callback] Exchange error:', error)

    if (!error && data.user) {
      console.log('[Auth Callback] User authenticated:', data.user.email)
      
      // 사용자 프로필이 존재하는지 확인
      const { data: existingProfile } = await supabase
        .from('user_profiles')
        .select('id')
        .eq('id', data.user.id)
        .single()

      console.log('[Auth Callback] Existing profile:', !!existingProfile)

      // 프로필이 없으면 생성
      if (!existingProfile) {
        console.log('[Auth Callback] Creating new profile')
        await supabase
          .from('user_profiles')
          .insert({
            id: data.user.id,
            email: data.user.email || '',
            name: data.user.user_metadata?.name || null,
            avatar_url: data.user.user_metadata?.avatar_url || null,
            user_type: 'quest',
          })
      }

      const forwardedHost = request.headers.get('x-forwarded-host')
      const isLocalEnv = process.env.NODE_ENV === 'development'

      console.log('[Auth Callback] Environment:', { isLocalEnv, forwardedHost })
      
      let redirectUrl = ''
      if (isLocalEnv) {
        redirectUrl = `${origin}${next}`
      } else if (forwardedHost) {
        redirectUrl = `https://${forwardedHost}${next}`
      } else {
        redirectUrl = `${origin}${next}`
      }
      
      console.log('[Auth Callback] Redirecting to:', redirectUrl)
      return NextResponse.redirect(redirectUrl)
    }

    console.error('[Auth Callback] Auth error:', error)
  } else {
    console.log('[Auth Callback] No code in URL')
  }

  // 오류 발생 시 로그인 페이지로 리다이렉트
  console.log('[Auth Callback] Redirecting to login')
  return NextResponse.redirect(`${origin}/login`)
}
