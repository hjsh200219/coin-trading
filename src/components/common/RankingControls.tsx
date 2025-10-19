'use client'

import { Button, PeriodSelector, TimeFrameSelector, ExchangeSelector, Card } from '@/components/ui'
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
  const indicatorLabels = {
    macd: 'MACD',
    rsi: 'RSI',
    ao: 'AO',
    disparity: 'Dispariy',
    rti: 'RTI',
  }

  return (
    <Card className="p-3">
      <div className="grid md:grid-cols-[1fr,auto] gap-3">
        {/* 왼쪽 영역: 조회 설정 + 지표 선택 */}
        <div className="space-y-3">
          {/* 1행: 거래소 + 분석 지표 */}
          <div className="flex items-center gap-3 flex-wrap">
            {/* 거래소 선택 */}
            <ExchangeSelector
              value={exchange}
              onChange={onExchangeChange}
              label="거래소"
              showLabel
              size="sm"
            />

            {/* 구분선 */}
            <div className="hidden md:block w-px h-6 bg-border" />

            {/* 분석 지표 */}
            <span className="text-xs font-medium text-foreground/70 whitespace-nowrap">
              분석 지표
            </span>
            <div className="flex gap-2 flex-wrap">
              {Object.entries(indicators).map(([key, enabled]) => (
                <button
                  key={key}
                  onClick={() => onIndicatorToggle(key as keyof IndicatorConfig)}
                  className={`px-3 py-1 text-xs rounded transition ${
                    enabled
                      ? 'bg-brand text-background font-medium'
                      : 'bg-surface border border-border text-foreground/60'
                  }`}
                >
                  {indicatorLabels[key as keyof typeof indicatorLabels]}
                </button>
              ))}
            </div>
          </div>

          {/* 2행: 기준 날짜 + 분석 기간 + 분석 단위 */}
          <div className="flex items-center gap-3 flex-wrap">
            {/* 기준 날짜 */}
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-medium text-foreground/70 whitespace-nowrap">기준</span>
              <input
                type="date"
                value={baseDate}
                max={new Date().toISOString().split('T')[0]}
                onChange={(e) => onBaseDateChange(e.target.value)}
                className="px-2 py-0.5 bg-surface border border-border rounded text-foreground focus:outline-none focus:ring-1 focus:ring-brand text-xs h-7 w-[115px]"
                style={{
                  colorScheme: 'dark',
                }}
              />
            </div>

            {/* 구분선 */}
            <div className="hidden md:block w-px h-6 bg-border" />

            {/* 분석 기간 */}
            <PeriodSelector
              value={period}
              onChange={onPeriodChange}
              label="기간"
              showLabel
              size="sm"
            />

            {/* 구분선 */}
            <div className="hidden md:block w-px h-6 bg-border" />

            {/* 분석 단위 */}
            <TimeFrameSelector
              value={timeFrame}
              onChange={onTimeFrameChange}
              label="단위"
              showLabel
              size="sm"
            />
          </div>
        </div>

        {/* 오른쪽 영역: 분석 버튼 (데스크톱에서 2행에 걸쳐 표시) */}
        <div className="flex items-center md:items-stretch">
          <Button
            variant="primary"
            onClick={onAnalyze}
            disabled={isAnalyzing}
            size="sm"
            className="px-6 w-full md:w-auto md:h-full"
          >
            {isAnalyzing ? '분석 중...' : '분석 시작'}
          </Button>
        </div>
      </div>
    </Card>
  )
}
