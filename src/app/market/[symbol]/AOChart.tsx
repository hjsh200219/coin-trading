'use client'

import { useMemo } from 'react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Cell,
} from 'recharts'
import IndicatorChartWrapper from '@/components/common/IndicatorChartWrapper'
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
        time: new Date(candle.timestamp).toLocaleString('ko-KR', {
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
        }),
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
            <CartesianGrid strokeDasharray="3 3" stroke="#2e2e2e" />
            <XAxis
              dataKey="time"
              stroke="#ededed"
              tick={{ fill: '#ededed', fontSize: 10 }}
              tickFormatter={(value) => {
                const parts = value.split(' ')
                return `${parts[0]} ${parts[1]}`
              }}
            />
            <YAxis
              stroke="#ededed"
              tick={{ fill: '#ededed', fontSize: 10 }}
              domain={['auto', 'auto']}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#181818',
                border: '1px solid #2e2e2e',
                borderRadius: '8px',
                color: '#ededed',
              }}
              labelStyle={{ color: '#ededed' }}
              itemStyle={{ color: '#ededed' }}
              formatter={(value: number) => value.toFixed(2)}
            />
            <ReferenceLine y={0} stroke="#666" strokeDasharray="3 3" />
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

        <div className="grid grid-cols-2 gap-3 text-sm pt-2 border-t border-border">
          <div>
            <p className="text-xs text-foreground/60">현재 AO</p>
            <p className={`font-medium ${trendColor}`}>
              {latest?.toFixed(2) || '-'}
            </p>
          </div>
          <div>
            <p className="text-xs text-foreground/60">추세</p>
            <p className={`font-semibold ${trendColor}`}>
              {momentum} ({trend})
            </p>
          </div>
        </div>
      </>
    </IndicatorChartWrapper>
  )
}

