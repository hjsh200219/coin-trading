'use client'

import { Button, Card } from '@/components/ui'
import { AnalysisSettings } from '@/components/common'
import type { TimeFrame, Period, Exchange, IndicatorConfig } from '@/types/chart'

interface RankingControlsProps {
  period: Period
  timeFrame: TimeFrame
  baseDate: string // YYYY-MM-DD 형식
  exchange: Exchange
  indicators: IndicatorConfig
  onPeriodChange: (period: Period) => void
  onTimeFrameChange: (timeFrame: TimeFrame) => void
  onBaseDateChange: (date: string) => void
  onExchangeChange: (exchange: Exchange) => void
  onIndicatorToggle: (indicator: keyof IndicatorConfig) => void
  onAnalyze: () => void
  isAnalyzing?: boolean
}

export default function RankingControls({
  period,
  timeFrame,
  baseDate,
  exchange,
  indicators,
  onPeriodChange,
  onTimeFrameChange,
  onBaseDateChange,
  onExchangeChange,
  onIndicatorToggle,
  onAnalyze,
  isAnalyzing = false,
}: RankingControlsProps) {
  return (
    <Card className="p-3">
      <div className="grid md:grid-cols-[1fr,auto] gap-3">
        {/* 왼쪽 영역: 공통 분석 설정 */}
        <AnalysisSettings
          exchange={exchange}
          period={period}
          timeFrame={timeFrame}
          baseDate={baseDate}
          indicators={indicators}
          onExchangeChange={onExchangeChange}
          onPeriodChange={onPeriodChange}
          onTimeFrameChange={onTimeFrameChange}
          onBaseDateChange={onBaseDateChange}
          onIndicatorToggle={onIndicatorToggle}
        />

        {/* 오른쪽 영역: 분석 버튼 (데스크톱에서 2행에 걸쳐 표시) */}
        <div className="flex items-center md:items-stretch">
          <Button
            variant="primary"
            onClick={onAnalyze}
            disabled={isAnalyzing}
            size="sm"
            className="px-6 w-full md:w-28 md:h-full"
          >
            {isAnalyzing ? '분석 중...' : '분석 시작'}
          </Button>
        </div>
      </div>
    </Card>
  )
}
