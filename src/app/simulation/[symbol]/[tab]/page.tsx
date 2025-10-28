import AppLayout from '@/components/AppLayout'
import { MAJOR_COINS } from '@/lib/bithumb/types'
import { notFound, redirect } from 'next/navigation'
import SimulationTabLayout from './SimulationTabLayout'

interface SimulationTabPageProps {
  params: Promise<{
    symbol: string
    tab: string
  }>
}

export default async function SimulationTabPage({ params }: SimulationTabPageProps) {
  const { symbol, tab } = await params
  const coin = MAJOR_COINS.find((c) => c.symbol === symbol)

  if (!coin) {
    notFound()
  }

  // 유효하지 않은 탭인 경우 progressive로 redirect
  if (tab !== 'progressive' && tab !== 'rankingvalue' && tab !== 'simulation') {
    redirect(`/simulation/${symbol}/progressive`)
  }

  return (
    <AppLayout>
      <SimulationTabLayout symbol={symbol} initialTab={tab as 'progressive' | 'rankingvalue' | 'simulation'} />
    </AppLayout>
  )
}
