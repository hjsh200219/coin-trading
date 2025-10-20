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
      {/* 코인 심볼 타이틀 */}
      <div className="flex items-center gap-3">
        <h1 className="text-lg md:text-xl font-bold text-foreground">
          {symbol}
        </h1>
        <span className="text-sm md:text-base text-foreground/50">
          시뮬레이션 분석
        </span>
      </div>

      {/* 탭 네비게이션 */}
      <div className="flex gap-2 border-b border-border pb-2 overflow-x-auto">
        <button
          onClick={() => handleTabChange('rankingvalue')}
          className={`px-3 md:px-4 py-2 text-xs md:text-sm font-medium rounded-t transition whitespace-nowrap ${
            initialTab === 'rankingvalue'
              ? 'bg-brand text-background'
              : 'text-foreground/70 hover:text-foreground hover:bg-surface'
          }`}
        >
          <span className="hidden sm:inline">Ranking Value Calculation</span>
          <span className="sm:hidden">Ranking Value</span>
        </button>
        <button
          onClick={() => handleTabChange('simulation')}
          className={`px-3 md:px-4 py-2 text-xs md:text-sm font-medium rounded-t transition whitespace-nowrap ${
            initialTab === 'simulation'
              ? 'bg-brand text-background'
              : 'text-foreground/70 hover:text-foreground hover:bg-surface'
          }`}
        >
          <span className="hidden sm:inline">Trading Simulation</span>
          <span className="sm:hidden">Simulation</span>
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


