'use client'

import { useState } from 'react'
import { Card } from '@/components/ui/Card'
import Button from '@/components/ui/Button'

export type TimeFrame = '30m' | '1h' | '2h' | '4h' | '1d'
export type Period = '1M' | '3M' | '6M' | '1Y' | '2Y' | '3Y'

interface ChartControlSectionProps {
  onTimeFrameChange?: (timeFrame: TimeFrame) => void
  onPeriodChange?: (period: Period) => void
  onBaseDateChange?: (date: Date) => void
}

export default function ChartControlSection({
  onTimeFrameChange,
  onPeriodChange,
  onBaseDateChange,
}: ChartControlSectionProps) {
  const [timeFrame, setTimeFrame] = useState<TimeFrame>('1h')
  const [period, setPeriod] = useState<Period>('1M')
  const [baseDate, setBaseDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  )

  const timeFrames: { value: TimeFrame; label: string }[] = [
    { value: '30m', label: '30분' },
    { value: '1h', label: '1시간' },
    { value: '2h', label: '2시간' },
    { value: '4h', label: '4시간' },
    { value: '1d', label: '1일' },
  ]

  const periods: { value: Period; label: string }[] = [
    { value: '1M', label: '1개월' },
    { value: '3M', label: '3개월' },
    { value: '6M', label: '6개월' },
    { value: '1Y', label: '1년' },
    { value: '2Y', label: '2년' },
    { value: '3Y', label: '3년' },
  ]

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

  return (
    <Card className="p-3">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        {/* 왼쪽: 기준 날짜 + 조회 기간 */}
        <div className="flex items-center gap-3 flex-wrap">
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
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-xs font-medium text-foreground/70 whitespace-nowrap">기간</span>
            <div className="flex gap-1">
              {periods.map((p) => (
                <Button
                  key={p.value}
                  onClick={() => handlePeriodChange(p.value)}
                  variant={period === p.value ? 'primary' : 'outline'}
                  size="sm"
                  className="px-2 py-0.5 text-xs h-7 min-w-[42px]"
                >
                  {p.label}
                </Button>
              ))}
            </div>
          </div>
        </div>

        {/* 오른쪽: 타임프레임 */}
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-medium text-foreground/70 whitespace-nowrap">타임프레임</span>
          <div className="flex gap-1">
            {timeFrames.map((tf) => (
              <Button
                key={tf.value}
                onClick={() => handleTimeFrameChange(tf.value)}
                variant={timeFrame === tf.value ? 'primary' : 'outline'}
                size="sm"
                className="px-2 py-0.5 text-xs h-7 min-w-[42px]"
              >
                {tf.label}
              </Button>
            ))}
          </div>
        </div>
      </div>
    </Card>
  )
}

