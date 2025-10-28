import { MAJOR_COINS } from '@/lib/bithumb/types'
import { notFound, redirect } from 'next/navigation'

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

  // 기본적으로 progressive 탭으로 redirect
  redirect(`/simulation/${symbol}/progressive`)
}
