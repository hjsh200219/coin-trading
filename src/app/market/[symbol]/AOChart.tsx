'use client'

import { useMemo } from 'react'
import { BarChart, Bar, ResponsiveContainer, Cell } from 'recharts'
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
import type { Candle } from '@/lib/bithumb/types'

interface AOChartProps {
  ao: number[]
  candles: Candle[]
}

export default function AOChart({ ao, candles }: AOChartProps) {
  const chartData = useMemo(() => {
    // AO는 데이터가 늦게 시작되므로 offset 계산
    const offset = candles.length - ao.length

    return ao.map((value, index) => {
      const candleIndex = offset + index
      const candle = candles[candleIndex]

      return {
        time: formatChartTime(candle.timestamp),
        ao: value,
      }
    })
  }, [ao, candles])

  const latest = ao[ao.length - 1]
  const previous = ao[ao.length - 2]
  const trend = latest > previous ? '상승' : '하락'
  const momentum = latest > 0 ? '상승 모멘텀' : '하락 모멘텀'
  const trendColor = latest > 0 ? 'text-[#3ecf8e]' : 'text-red-500'

  return (
    <IndicatorChartWrapper
      title="Awesome Oscillator (5, 34)"
      legends={[
        { color: '#3ecf8e', label: '상승', type: 'bar' },
        { color: '#ef4444', label: '하락', type: 'bar' },
      ]}
      height={200}
    >
      <>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={chartData} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
            <ChartGrid />
            <ChartXAxis />
            <ChartYAxis />
            <ChartTooltip />
            <ChartReferenceLine y={0} />
            <Bar dataKey="ao" radius={[2, 2, 2, 2]}>
              {chartData.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={entry.ao > 0 ? '#3ecf8e' : '#ef4444'}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>

        <IndicatorValueGrid
          items={[
            {
              label: '현재 AO',
              value: latest ?? '-',
              className: trendColor,
            },
            {
              label: '추세',
              value: `${momentum} (${trend})`,
              className: `font-semibold ${trendColor}`,
            },
          ]}
          columns={2}
        />
      </>
    </IndicatorChartWrapper>
  )
}

