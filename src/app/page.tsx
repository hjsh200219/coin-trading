import { redirect } from 'next/navigation'

export default async function Home() {
  // 홈 페이지를 시세 페이지로 자동 리다이렉트
  redirect('/market')
}
