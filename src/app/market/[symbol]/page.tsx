import { notFound } from 'next/navigation'
import Link from 'next/link'
import AppLayout from '@/components/AppLayout'
import { MAJOR_COINS } from '@/lib/bithumb/types'
import CoinDetailContent from './CoinDetailContent'

interface PageProps {
  params: Promise<{
    symbol: string
  }>
}

export default async function CoinDetailPage({ params }: PageProps) {
  const { symbol } = await params
  
  // 지원하는 코인인지 확인
  const coin = MAJOR_COINS.find((c) => c.symbol === symbol.toUpperCase())
  
  if (!coin) {
    notFound()
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* 뒤로가기 버튼 */}
        <div>
          <Link
            href="/market"
            className="inline-flex items-center gap-2 text-sm text-foreground/60 hover:text-brand transition"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
            시세 목록으로 돌아가기
          </Link>
        </div>

        {/* 코인 이름 */}
        <div>
          <h1 className="text-xl font-bold text-foreground flex items-center gap-3">
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: coin.color }}
            />
            {coin.name} ({coin.symbol})
          </h1>
        </div>

        {/* 상세 컨텐츠 (클라이언트 컴포넌트) */}
        <CoinDetailContent coin={coin} />
      </div>
    </AppLayout>
  )
}

