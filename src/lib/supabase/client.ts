import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  
  // 디버깅: 환경 변수 확인
  console.log('[Supabase Client] URL exists:', !!supabaseUrl)
  console.log('[Supabase Client] URL value:', supabaseUrl)
  console.log('[Supabase Client] Anon Key exists:', !!supabaseAnonKey)
  console.log('[Supabase Client] Anon Key length:', supabaseAnonKey?.length)
  
  if (!supabaseUrl || !supabaseAnonKey) {
    console.error('[Supabase Client] Missing environment variables!')
    throw new Error('Missing Supabase environment variables')
  }
  
  return createBrowserClient(supabaseUrl, supabaseAnonKey)
}
