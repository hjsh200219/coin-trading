import AppLayout from '@/components/AppLayout'
import { MAJOR_COINS } from '@/lib/bithumb/types'
import { notFound } from 'next/navigation'

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
      <div className="space-y-6">
        <div className="p-8 border border-border rounded-lg text-center">
          <p className="text-foreground/60">Coming soon...</p>
        </div>
      </div>
    </AppLayout>
  )
}

