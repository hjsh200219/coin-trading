'use client'

import ButtonGroup, { type ButtonGroupOption } from './ButtonGroup'
import type { TimeFrame } from '@/types/chart'

interface TimeFrameSelectorProps {
  value: TimeFrame
  onChange: (value: TimeFrame) => void
  label?: string
  showLabel?: boolean
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

const TIMEFRAME_OPTIONS: ButtonGroupOption<TimeFrame>[] = [
  { value: '30m', label: '30분' },
  { value: '1h', label: '1시간' },
  { value: '2h', label: '2시간' },
  { value: '4h', label: '4시간' },
  { value: '1d', label: '1일' },
]

export default function TimeFrameSelector({
  value,
  onChange,
  label = '타임프레임',
  showLabel = true,
  size = 'sm',
  className = '',
}: TimeFrameSelectorProps) {
  return (
    <div className={`flex items-center gap-1.5 ${className}`}>
      {showLabel && (
        <span className="text-xs font-medium text-foreground/70 whitespace-nowrap">
          {label}
        </span>
      )}
      <ButtonGroup<TimeFrame>
        options={TIMEFRAME_OPTIONS}
        value={value}
        onChange={onChange}
        size={size}
        buttonClassName="px-2 py-0.5 text-xs h-7 min-w-[42px]"
      />
    </div>
  )
}

