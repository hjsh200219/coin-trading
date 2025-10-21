'use client'

import { useState } from 'react'
import { Card } from '@/components/ui/Card'
import { PeriodSelector, TimeFrameSelector, ExchangeSelector } from '@/components/ui'
import type { TimeFrame, Period, Exchange } from '@/types/chart'

interface ChartControlsProps {
  onTimeFrameChange?: (timeFrame: TimeFrame) => void
  onPeriodChange?: (period: Period) => void
  onBaseDateChange?: (date: Date) => void
  onExchangeChange?: (exchange: Exchange) => void
  defaultTimeFrame?: TimeFrame
  defaultPeriod?: Period
  defaultBaseDate?: Date
  defaultExchange?: Exchange
  showExchange?: boolean
  availablePeriods?: Period[]
  currentPeriod?: Period
}

export default function ChartControls({
  onTimeFrameChange,
  onPeriodChange,
  onBaseDateChange,
  onExchangeChange,
  defaultTimeFrame = '1h',
  defaultPeriod = '1M',
  defaultBaseDate = new Date(),
  defaultExchange = 'bithumb',
  showExchange = false,
  availablePeriods,
  currentPeriod,
}: ChartControlsProps) {
  const [timeFrame, setTimeFrame] = useState<TimeFrame>(defaultTimeFrame)
  const [period, setPeriod] = useState<Period>(defaultPeriod)
  const [exchange, setExchange] = useState<Exchange>(defaultExchange)
  const [baseDate, setBaseDate] = useState<string>(
    defaultBaseDate.toISOString().split('T')[0]
  )

  const handleTimeFrameChange = (newTimeFrame: TimeFrame) => {
    setTimeFrame(newTimeFrame)
    onTimeFrameChange?.(newTimeFrame)
  }

  const handlePeriodChange = (newPeriod: Period) => {
    setPeriod(newPeriod)
    onPeriodChange?.(newPeriod)
  }

  const handleBaseDateChange = (dateString: string) => {
    setBaseDate(dateString)
    onBaseDateChange?.(new Date(dateString))
  }

  const handleExchangeChange = (newExchange: Exchange) => {
    setExchange(newExchange)
    onExchangeChange?.(newExchange)
  }

  return (
    <Card className="p-3">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        {/* 왼쪽: 거래소 (선택적) + 기준 날짜 + 조회 기간 */}
        <div className="flex items-center gap-3 flex-wrap">
          {/* 거래소 선택 (선택적) */}
          {showExchange && (
            <>
              <ExchangeSelector
                value={exchange}
                onChange={handleExchangeChange}
                label="거래소"
                showLabel
                size="sm"
              />
              {/* 구분선 */}
              <div className="hidden md:block w-px h-6 bg-border" />
            </>
          )}

          {/* 기준 날짜 */}
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-medium text-foreground/70 whitespace-nowrap">기준</span>
            <input
              type="date"
              value={baseDate}
              max={new Date().toISOString().split('T')[0]}
              onChange={(e) => handleBaseDateChange(e.target.value)}
              className="px-2 py-0.5 bg-surface border border-border rounded text-foreground focus:outline-none focus:ring-1 focus:ring-brand text-xs h-7 w-[115px]"
              style={{
                colorScheme: 'dark',
              }}
            />
          </div>

          {/* 구분선 */}
          <div className="hidden md:block w-px h-6 bg-border" />

          {/* 조회 기간 */}
          <PeriodSelector
            value={currentPeriod || period}
            onChange={handlePeriodChange}
            label="기간"
            showLabel
            size="sm"
            disabledPeriods={availablePeriods ? ['1M', '3M', '6M', '1Y', '2Y', '3Y'].filter(p => !availablePeriods.includes(p as Period)) : []}
          />
        </div>

        {/* 오른쪽: 타임프레임 */}
        <TimeFrameSelector
          value={timeFrame}
          onChange={handleTimeFrameChange}
          label="타임프레임"
          showLabel
          size="sm"
        />
      </div>
    </Card>
  )
}
