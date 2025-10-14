// 코인 시세 조회 페이지

import { Suspense } from 'react'
import AppLayout from '@/components/AppLayout'
import CoinList from '@/components/market/CoinList'
import { getAllTickers } from '@/lib/bithumb/api'
import { Card } from '@/components/ui/Card'

export const metadata = {
  title: '시세 조회 | Coin Trading',
  description: '빗썸 거래소의 실시간 코인 시세를 확인하세요',
}

async function MarketData() {
  try {
    const response = await getAllTickers()
    return <CoinList initialData={response.data} />
  } catch (error) {
    return (
      <Card className="p-6 text-center">
        <p className="text-foreground/60">
          시세 정보를 불러오는 중 오류가 발생했습니다.
        </p>
        <p className="text-sm text-foreground/40 mt-2">
          잠시 후 다시 시도해주세요.
        </p>
      </Card>
    )
  }
}

function LoadingSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {Array.from({ length: 10 }).map((_, i) => (
        <Card key={i} className="h-64 animate-pulse">
          <div className="h-full bg-surface-75" />
        </Card>
      ))}
    </div>
  )
}

export default function MarketPage() {
  return (
    <AppLayout>
      <Suspense fallback={<LoadingSkeleton />}>
        <MarketData />
      </Suspense>
    </AppLayout>
  )
}
