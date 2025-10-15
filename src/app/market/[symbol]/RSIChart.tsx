'use client'

import { useMemo } from 'react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Area,
  ComposedChart,
} from 'recharts'
import IndicatorChartWrapper from '@/components/common/IndicatorChartWrapper'
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
        time: new Date(candle.timestamp).toLocaleString('ko-KR', {
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
        }),
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
              domain={[0, 100]}
              ticks={[0, 30, 50, 70, 100]}
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
            <ReferenceLine y={70} stroke="#ef4444" strokeDasharray="3 3" label={{ value: '과매수', position: 'right', fill: '#ef4444', fontSize: 10 }} />
            <ReferenceLine y={30} stroke="#3b82f6" strokeDasharray="3 3" label={{ value: '과매도', position: 'right', fill: '#3b82f6', fontSize: 10 }} />
            <ReferenceLine y={50} stroke="#666" strokeDasharray="3 3" />
            
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

        <div className="grid grid-cols-2 gap-3 text-sm pt-2 border-t border-border">
          <div>
            <p className="text-xs text-foreground/60">현재 RSI</p>
            <p className="font-medium text-[#3ecf8e]">
              {latest?.toFixed(2) || '-'}
            </p>
          </div>
          <div>
            <p className="text-xs text-foreground/60">상태</p>
            <p className={`font-semibold ${statusColor}`}>{status}</p>
          </div>
        </div>
      </>
    </IndicatorChartWrapper>
  )
}

