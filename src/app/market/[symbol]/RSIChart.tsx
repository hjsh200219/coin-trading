'use client'

import { useMemo } from 'react'
import { Line, ResponsiveContainer, Area, ComposedChart } from 'recharts'
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

interface RSIChartProps {
  rsi: number[]
  candles: Candle[]
}

export default function RSIChart({ rsi, candles }: RSIChartProps) {
  const chartData = useMemo(() => {
    // RSI는 데이터가 늦게 시작되므로 offset 계산
    const offset = candles.length - rsi.length

    return rsi.map((value, index) => {
      const candleIndex = offset + index
      const candle = candles[candleIndex]

      return {
        time: formatChartTime(candle.timestamp),
        rsi: value,
        overbought: 70,
        oversold: 30,
      }
    })
  }, [rsi, candles])

  const latest = rsi[rsi.length - 1]
  let status = '중립'
  let statusColor = 'text-foreground'

  if (latest >= 70) {
    status = '과매수'
    statusColor = 'text-red-500'
  } else if (latest <= 30) {
    status = '과매도'
    statusColor = 'text-blue-500'
  }

  return (
    <IndicatorChartWrapper
      title="RSI (14)"
      legends={[{ color: '#3ecf8e', label: 'RSI', type: 'line' }]}
      height={200}
    >
      <>
        <ResponsiveContainer width="100%" height={200}>
          <ComposedChart data={chartData} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
            <ChartGrid />
            <ChartXAxis />
            <ChartYAxis domain={[0, 100]} ticks={[0, 30, 50, 70, 100]} />
            <ChartTooltip />
            <ChartReferenceLine y={70} label="과매수" stroke="#ef4444" labelColor="#ef4444" />
            <ChartReferenceLine y={30} label="과매도" stroke="#3b82f6" labelColor="#3b82f6" />
            <ChartReferenceLine y={50} />
            
            {/* 과매수 영역 */}
            <Area
              dataKey="overbought"
              fill="#ef4444"
              fillOpacity={0.1}
              stroke="none"
            />
            
            {/* RSI 라인 */}
            <Line
              type="monotone"
              dataKey="rsi"
              stroke="#3ecf8e"
              strokeWidth={2}
              dot={false}
            />
          </ComposedChart>
        </ResponsiveContainer>

        <IndicatorValueGrid
          items={[
            {
              label: '현재 RSI',
              value: latest ?? '-',
              color: '#3ecf8e',
            },
            {
              label: '상태',
              value: status,
              className: `font-semibold ${statusColor}`,
            },
          ]}
          columns={2}
        />
      </>
    </IndicatorChartWrapper>
  )
}

