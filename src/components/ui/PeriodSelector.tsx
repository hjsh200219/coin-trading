'use client'

import ButtonGroup, { type ButtonGroupOption } from './ButtonGroup'
import type { Period, Exchange, TimeFrame } from '@/types/chart'

interface PeriodSelectorProps {
  value: Period
  onChange: (value: Period) => void
  label?: string
  showLabel?: boolean
  size?: 'sm' | 'md' | 'lg'
  className?: string
  exchange?: Exchange
  timeFrame?: TimeFrame
  disabledPeriods?: Period[]
}

/**
 * 거래소별 최대 조회 가능 캔들 개수
 * - Bithumb: ~500개
 * - Upbit: 200개
 * - Binance: 1000개
 */
const MAX_CANDLES_BY_EXCHANGE: Record<Exchange, number> = {
  bithumb: 500,
  upbit: 200,
  binance: 1000,
}

/**
 * 타임프레임별 하루당 캔들 개수
 */
const CANDLES_PER_DAY: Record<TimeFrame, number> = {
  '1h': 24,
  '2h': 12,
  '4h': 6,
  '1d': 1,
}

/**
 * 기간별 일수
 */
const PERIOD_DAYS: Record<Period, number> = {
  '1M': 30,
  '3M': 90,
  '6M': 180,
  '1Y': 365,
  '2Y': 730,
  '3Y': 1095,
}

const PERIOD_OPTIONS: ButtonGroupOption<Period>[] = [
  { value: '1M', label: '1개월' },
  { value: '3M', label: '3개월' },
  { value: '6M', label: '6개월' },
  { value: '1Y', label: '1년' },
  { value: '2Y', label: '2년' },
  { value: '3Y', label: '3년' },
]

export default function PeriodSelector({
  value,
  onChange,
  label = '기간',
  showLabel = true,
  size = 'sm',
  className = '',
  exchange = 'bithumb',
  timeFrame = '1h',
  disabledPeriods = [],
}: PeriodSelectorProps) {
  // 거래소와 타임프레임에 따라 사용 불가능한 기간 계산
  const getDisabledPeriods = (): Period[] => {
    if (disabledPeriods.length > 0) return disabledPeriods
    
    const maxCandles = MAX_CANDLES_BY_EXCHANGE[exchange]
    const candlesPerDay = CANDLES_PER_DAY[timeFrame]
    const maxDays = Math.floor(maxCandles / candlesPerDay)
    
    const disabled: Period[] = []
    Object.entries(PERIOD_DAYS).forEach(([period, days]) => {
      if (days > maxDays) {
        disabled.push(period as Period)
      }
    })
    
    return disabled
  }

  const calculatedDisabledPeriods = getDisabledPeriods()
  
  const options = PERIOD_OPTIONS.map(option => ({
    ...option,
    disabled: calculatedDisabledPeriods.includes(option.value)
  }))
  return (
    <div className={`flex items-center gap-1.5 flex-wrap ${className}`}>
      {showLabel && (
        <span className="text-xs font-medium text-foreground/70 whitespace-nowrap">
          {label}
        </span>
      )}
      <ButtonGroup<Period>
        options={options}
        value={value}
        onChange={onChange}
        size={size}
        buttonClassName="px-2 py-0.5 text-xs h-7 min-w-[42px]"
      />
    </div>
  )
}

