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
}: PeriodSelectorProps) {
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

