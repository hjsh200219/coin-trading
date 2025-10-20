'use client'

import ButtonGroup, { type ButtonGroupOption } from './ButtonGroup'
import type { Exchange } from '@/types/chart'

interface ExchangeSelectorProps {
  value: Exchange
  onChange: (value: Exchange) => void
  label?: string
  showLabel?: boolean
  size?: 'sm' | 'md' | 'lg'
  className?: string
  disabledExchanges?: Exchange[]
}

export default function ExchangeSelector({
  value,
  onChange,
  label = '거래소',
  showLabel = true,
  size = 'sm',
  className = '',
  disabledExchanges = [],
}: ExchangeSelectorProps) {
  const EXCHANGE_OPTIONS: ButtonGroupOption<Exchange>[] = [
    { value: 'bithumb', label: 'Bithumb', disabled: disabledExchanges.includes('bithumb') },
    { value: 'upbit', label: 'Upbit', disabled: disabledExchanges.includes('upbit') },
    { value: 'binance', label: 'Binance', disabled: disabledExchanges.includes('binance') },
  ]

  return (
    <div className={`flex items-center gap-1.5 ${className}`}>
      {showLabel && (
        <span className="text-xs font-medium text-foreground/70 whitespace-nowrap">
          {label}
        </span>
      )}
      <ButtonGroup<Exchange>
        options={EXCHANGE_OPTIONS}
        value={value}
        onChange={onChange}
        size={size}
        buttonClassName="px-2 py-0.5 text-xs h-7 min-w-[50px]"
      />
    </div>
  )
}

