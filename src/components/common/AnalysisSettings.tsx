'use client'

import { PeriodSelector, TimeFrameSelector, ExchangeSelector } from '@/components/ui'
import type { TimeFrame, Period, Exchange, IndicatorConfig } from '@/types/chart'

interface AnalysisSettingsProps {
  exchange: Exchange
  period: Period
  timeFrame: TimeFrame
  baseDate: string
  indicators: IndicatorConfig
  onExchangeChange: (exchange: Exchange) => void
  onPeriodChange: (period: Period) => void
  onTimeFrameChange: (timeFrame: TimeFrame) => void
  onBaseDateChange: (date: string) => void
  onIndicatorToggle: (indicator: keyof IndicatorConfig) => void
  disabledExchanges?: Exchange[]
}

/**
 * 분석 설정 공통 컴포넌트
 * Ranking Value Calculation 및 Trading Simulation에서 공통으로 사용
 */
export default function AnalysisSettings({
  exchange,
  period,
  timeFrame,
  baseDate,
  indicators,
  onExchangeChange,
  onPeriodChange,
  onTimeFrameChange,
  onBaseDateChange,
  onIndicatorToggle,
  disabledExchanges = [],
}: AnalysisSettingsProps) {
  const indicatorLabels = {
    macd: 'MACD',
    rsi: 'RSI',
    ao: 'AO',
    DP: 'DP',
    rti: 'RTI',
  }

  return (
    <div className="space-y-2 md:space-y-3">
      {/* 1행: 거래소 (모바일 전용) */}
      <div className="md:hidden">
        <ExchangeSelector
          value={exchange}
          onChange={onExchangeChange}
          label="거래소"
          showLabel
          size="sm"
          disabledExchanges={disabledExchanges}
        />
      </div>

      {/* 2행: 지표 (모바일 전용) */}
      <div className="md:hidden flex items-center gap-2 flex-wrap">
        <span className="text-xs font-medium text-foreground/70 whitespace-nowrap">지표</span>
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

      {/* 데스크톱: 거래소 + 지표 */}
      <div className="hidden md:flex items-center gap-3 flex-wrap">
        {/* 거래소 선택 */}
        <ExchangeSelector
          value={exchange}
          onChange={onExchangeChange}
          label="거래소"
          showLabel
          size="sm"
          disabledExchanges={disabledExchanges}
        />

        {/* 구분선 */}
        <div className="w-px h-6 bg-border" />

        {/* 지표 */}
        <span className="text-xs font-medium text-foreground/70 whitespace-nowrap">
          지표
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

      {/* 3행: 기준 날짜 (모바일 전용) */}
      <div className="md:hidden">
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-medium text-foreground/70 whitespace-nowrap">기준</span>
          <input
            type="date"
            value={baseDate}
            max={new Date().toISOString().split('T')[0]}
            onChange={(e) => onBaseDateChange(e.target.value)}
            className="px-2 py-0.5 bg-surface border border-border rounded text-foreground focus:outline-none focus:ring-1 focus:ring-brand text-xs h-7 flex-1"
            style={{
              colorScheme: 'dark',
            }}
          />
        </div>
      </div>

      {/* 4행: 분석 기간 (모바일 전용) */}
      <div className="md:hidden">
        <PeriodSelector
          value={period}
          onChange={onPeriodChange}
          label="기간"
          showLabel
          size="sm"
        />
      </div>

      {/* 5행: 분석 단위 (모바일 전용) */}
      <div className="md:hidden">
        <TimeFrameSelector
          value={timeFrame}
          onChange={onTimeFrameChange}
          label="단위"
          showLabel
          size="sm"
        />
      </div>

      {/* 데스크톱: 기준 날짜 + 분석 기간 + 분석 단위 */}
      <div className="hidden md:flex items-center gap-3 flex-wrap">
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
        <div className="w-px h-6 bg-border" />

        {/* 분석 기간 */}
        <PeriodSelector
          value={period}
          onChange={onPeriodChange}
          label="기간"
          showLabel
          size="sm"
        />

        {/* 구분선 */}
        <div className="w-px h-6 bg-border" />

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
  )
}


