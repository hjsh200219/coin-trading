import AppLayout from '@/components/AppLayout'
import { MAJOR_COINS } from '@/lib/bithumb/types'
import { notFound } from 'next/navigation'
import RankingAnalysisContent from './RankingAnalysisContent'

interface SimulationDetailPageProps {
  params: Promise<{
    symbol: string
  }>
}

export default async function SimulationDetailPage({ params }: SimulationDetailPageProps) {
  const { symbol } = await params
  const coin = MAJOR_COINS.find((c) => c.symbol === symbol)

  if (!coin) {
    notFound()
  }

  return (
    <AppLayout>
      <RankingAnalysisContent symbol={coin.symbol} />
    </AppLayout>
  )
}

