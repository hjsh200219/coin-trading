'use client'

import { useMemo } from 'react'
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts'
import { Card } from '@/components/ui/Card'
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
        time: new Date(candle.timestamp).toLocaleString('ko-KR', {
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
        }),
        macd: macd.macd[index],
        signal: macd.signal[index],
        histogram: macd.histogram[index],
      }
    })
  }, [macd, candles])

  return (
    <Card className="p-4">
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-foreground">
            MACD (12, 26, 9)
          </h3>
          <div className="flex gap-3 text-xs">
            <div className="flex items-center gap-1">
              <div className="w-3 h-0.5 bg-[#3ecf8e]" />
              <span className="text-foreground/60">MACD</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-0.5 bg-[#fbbf24]" />
              <span className="text-foreground/60">Signal</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-2 bg-[#8b5cf6]/50" />
              <span className="text-foreground/60">Histogram</span>
            </div>
          </div>
        </div>

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

        <div className="grid grid-cols-3 gap-3 text-sm pt-2 border-t border-border">
          <div>
            <p className="text-xs text-foreground/60">MACD</p>
            <p className="font-medium text-[#3ecf8e]">
              {macd.macd[macd.macd.length - 1]?.toFixed(2) || '-'}
            </p>
          </div>
          <div>
            <p className="text-xs text-foreground/60">Signal</p>
            <p className="font-medium text-[#fbbf24]">
              {macd.signal[macd.signal.length - 1]?.toFixed(2) || '-'}
            </p>
          </div>
          <div>
            <p className="text-xs text-foreground/60">Histogram</p>
            <p
              className={`font-medium ${
                (macd.histogram[macd.histogram.length - 1] || 0) > 0
                  ? 'text-red-500'
                  : 'text-blue-500'
              }`}
            >
              {macd.histogram[macd.histogram.length - 1]?.toFixed(2) || '-'}
            </p>
          </div>
        </div>
      </div>
    </Card>
  )
}

