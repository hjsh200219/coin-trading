'use client'

import { useRouter } from 'next/navigation'
import RankingAnalysisContent from '../RankingAnalysisContent'
import TradingSimulationContent from '../TradingSimulationContent'

interface SimulationTabLayoutProps {
  symbol: string
  initialTab: 'rankingvalue' | 'simulation'
}

export default function SimulationTabLayout({ symbol, initialTab }: SimulationTabLayoutProps) {
  const router = useRouter()

  const handleTabChange = (newTab: 'rankingvalue' | 'simulation') => {
    router.push(`/simulation/${symbol}/${newTab}`)
  }

  return (
    <div className="space-y-4">
      {/* 탭 네비게이션 */}
      <div className="flex gap-2 border-b border-border pb-2">
        <button
          onClick={() => handleTabChange('rankingvalue')}
          className={`px-4 py-2 text-sm font-medium rounded-t transition ${
            initialTab === 'rankingvalue'
              ? 'bg-brand text-background'
              : 'text-foreground/70 hover:text-foreground hover:bg-surface'
          }`}
        >
          Ranking Value Calculation
        </button>
        <button
          onClick={() => handleTabChange('simulation')}
          className={`px-4 py-2 text-sm font-medium rounded-t transition ${
            initialTab === 'simulation'
              ? 'bg-brand text-background'
              : 'text-foreground/70 hover:text-foreground hover:bg-surface'
          }`}
        >
          Trading Simulation
        </button>
      </div>

      {/* 탭 컨텐츠 */}
      {initialTab === 'rankingvalue' ? (
        <RankingAnalysisContent symbol={symbol} />
      ) : (
        <TradingSimulationContent symbol={symbol} />
      )}
    </div>
  )
}


