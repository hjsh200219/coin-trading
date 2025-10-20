'use client'

import { useState } from 'react'
import ButtonGroup from '@/components/ui/ButtonGroup'
import RankingAnalysisContent from './RankingAnalysisContent'
import TradingSimulationContent from './TradingSimulationContent'

interface SimulationTabContentProps {
  symbol: string
}

type TabType = 'ranking' | 'trading'

export default function SimulationTabContent({ symbol }: SimulationTabContentProps) {
  const [activeTab, setActiveTab] = useState<TabType>('ranking')

  return (
    <div className="space-y-4">
      {/* 탭 선택 */}
      <div className="flex justify-start">
        <ButtonGroup
          options={[
            { value: 'ranking', label: 'Ranking Value Calculation' },
            { value: 'trading', label: 'Trading Simulation' }
          ]}
          value={activeTab}
          onChange={(value: string) => setActiveTab(value as TabType)}
        />
      </div>

      {/* 탭 컨텐츠 */}
      {activeTab === 'ranking' && (
        <RankingAnalysisContent symbol={symbol} />
      )}

      {activeTab === 'trading' && (
        <TradingSimulationContent symbol={symbol} />
      )}
    </div>
  )
}

