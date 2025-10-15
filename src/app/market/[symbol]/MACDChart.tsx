'use client'

import { useMemo } from 'react'
import { ComposedChart, Bar, Line, ResponsiveContainer } from 'recharts'
import IndicatorChartWrapper from '@/components/common/IndicatorChartWrapper'
import IndicatorValueGrid from '@/components/common/IndicatorValueGrid'
import {
  ChartXAxis,
  ChartYAxis,
  ChartGrid,
  ChartTooltip,
  ChartReferenceLine,
} from '@/components/common/ChartElements'
import { formatChartTime } from '@/lib/utils/format'
import type { MACDResult } from '@/lib/indicators/calculator'
import type { Candle } from '@/lib/bithumb/types'

interface MACDChartProps {
  macd: MACDResult
  candles: Candle[]
}

export default function MACDChart({ macd, candles }: MACDChartProps) {
  const chartData = useMemo(() => {
    // MACD는 데이터가 늦게 시작되므로 offset 계산
    const offset = candles.length - macd.macd.length

    return macd.macd.map((_, index) => {
      const candleIndex = offset + index
      const candle = candles[candleIndex]

      return {
        time: formatChartTime(candle.timestamp),
        macd: macd.macd[index],
        signal: macd.signal[index],
        histogram: macd.histogram[index],
      }
    })
  }, [macd, candles])

  return (
    <IndicatorChartWrapper
      title="MACD (12, 26, 9)"
      legends={[
        { color: '#3ecf8e', label: 'MACD', type: 'line' },
        { color: '#fbbf24', label: 'Signal', type: 'line' },
        { color: 'rgba(139, 92, 246, 0.5)', label: 'Histogram', type: 'bar' },
      ]}
      height={200}
    >
      <>
        <ResponsiveContainer width="100%" height={200}>
          <ComposedChart data={chartData} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
            <ChartGrid />
            <ChartXAxis />
            <ChartYAxis />
            <ChartTooltip />
            <ChartReferenceLine y={0} />
            <Bar
              dataKey="histogram"
              fill="#8b5cf6"
              opacity={0.5}
              radius={[2, 2, 0, 0]}
            />
            <Line
              type="monotone"
              dataKey="macd"
              stroke="#3ecf8e"
              strokeWidth={2}
              dot={false}
            />
            <Line
              type="monotone"
              dataKey="signal"
              stroke="#fbbf24"
              strokeWidth={2}
              dot={false}
            />
          </ComposedChart>
        </ResponsiveContainer>

        <IndicatorValueGrid
          items={[
            {
              label: 'MACD',
              value: macd.macd[macd.macd.length - 1] ?? '-',
              color: '#3ecf8e',
            },
            {
              label: 'Signal',
              value: macd.signal[macd.signal.length - 1] ?? '-',
              color: '#fbbf24',
            },
            {
              label: 'Histogram',
              value: macd.histogram[macd.histogram.length - 1] ?? '-',
              color:
                (macd.histogram[macd.histogram.length - 1] || 0) > 0
                  ? '#ef4444'
                  : '#3b82f6',
            },
          ]}
          columns={3}
        />
      </>
    </IndicatorChartWrapper>
  )
}

