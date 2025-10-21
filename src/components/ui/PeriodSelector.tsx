'use client'

import ButtonGroup, { type ButtonGroupOption } from './ButtonGroup'
import type { Period } from '@/types/chart'

interface PeriodSelectorProps {
  value: Period
  onChange: (value: Period) => void
  label?: string
  showLabel?: boolean
  size?: 'sm' | 'md' | 'lg'
  className?: string
  disabledPeriods?: Period[]
}

export default function PeriodSelector({
  value,
  onChange,
  label = '기간',
  showLabel = true,
  size = 'sm',
  className = '',
  disabledPeriods = [],
}: PeriodSelectorProps) {
  const PERIOD_OPTIONS: ButtonGroupOption<Period>[] = [
    { value: '1M', label: '1개월', disabled: disabledPeriods.includes('1M') },
    { value: '3M', label: '3개월', disabled: disabledPeriods.includes('3M') },
    { value: '6M', label: '6개월', disabled: disabledPeriods.includes('6M') },
    { value: '1Y', label: '1년', disabled: disabledPeriods.includes('1Y') },
    { value: '2Y', label: '2년', disabled: disabledPeriods.includes('2Y') },
    { value: '3Y', label: '3년', disabled: disabledPeriods.includes('3Y') },
  ]
  
  return (
    <div className={`flex items-center gap-1.5 flex-wrap ${className}`}>
      {showLabel && (
        <span className="text-xs font-medium text-foreground/70 whitespace-nowrap">
          {label}
        </span>
      )}
      <ButtonGroup<Period>
        options={PERIOD_OPTIONS}
        value={value}
        onChange={onChange}
        size={size}
        buttonClassName="px-2 py-0.5 text-xs h-7 min-w-[42px]"
      />
    </div>
  )
}

