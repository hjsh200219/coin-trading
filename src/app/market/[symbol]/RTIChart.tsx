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
import { calculateRTI } from '@/lib/indicators/calculator'

interface RTIChartProps {
  candles: Candle[]
}

export default function RTIChart({ candles }: RTIChartProps) {
  const chartData = useMemo(() => {
    const rtiResult = calculateRTI(candles, 100, 95, 20)

    if (!rtiResult) {
      return []
    }

    // RTI 데이터 길이에 맞춰 캔들 조정
    const offset = candles.length - rtiResult.rti.length
    const alignedCandles = candles.slice(offset)

    return alignedCandles.map((candle, index) => ({
      time: new Date(candle.timestamp).toLocaleString('ko-KR', {
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      }),
      rti: rtiResult.rti[index],
      signal: rtiResult.signal[index],
    }))
  }, [candles])

  if (chartData.length === 0) {
    return (
      <IndicatorChartWrapper
        title="RTI (100, 95, 20)"
        legends={[
          { color: '#00bcd4', label: 'RTI', type: 'line' },
          { color: '#ffeb3b', label: 'Signal', type: 'line' },
        ]}
        height={200}
      >
        <div className="h-full flex items-center justify-center text-foreground/60">
          데이터 부족 (최소 100개 필요)
        </div>
      </IndicatorChartWrapper>
    )
  }

  return (
    <IndicatorChartWrapper
      title="RTI (100, 95, 20)"
      legends={[
        { color: '#00bcd4', label: 'RTI', type: 'line' },
        { color: '#ffeb3b', label: 'Signal', type: 'line' },
      ]}
      height={200}
    >
      <ResponsiveContainer width="100%" height={200}>
          <ComposedChart data={chartData} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#2e2e2e" />
        <XAxis
          dataKey="time"
          stroke="#ededed"
          tick={{ fill: '#ededed', fontSize: 11 }}
          interval="preserveStartEnd"
        />
        <YAxis
          stroke="#ededed"
          tick={{ fill: '#ededed', fontSize: 11 }}
          domain={[0, 100]}
          ticks={[0, 20, 50, 80, 100]}
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

        {/* Oversold zone fill (0-20) */}
        <Area
          type="monotone"
          dataKey={() => 20}
          fill="rgba(255, 87, 87, 0.1)"
          stroke="none"
          isAnimationActive={false}
        />

        {/* Overbought zone fill (80-100) */}
        <Area
          type="monotone"
          dataKey={() => 100}
          fill="rgba(87, 255, 87, 0.1)"
          stroke="none"
          isAnimationActive={false}
        />

        {/* Reference lines */}
        <ReferenceLine y={80} stroke="#606060" strokeDasharray="3 3" />
        <ReferenceLine y={50} stroke="#606060" strokeDasharray="3 3" />
        <ReferenceLine y={20} stroke="#606060" strokeDasharray="3 3" />

        {/* RTI line */}
        <Line
          type="monotone"
          dataKey="rti"
          stroke="#00bcd4"
          strokeWidth={2}
          dot={false}
          name="RTI"
        />

        {/* Signal line */}
        <Line
          type="monotone"
          dataKey="signal"
          stroke="#ffeb3b"
          strokeWidth={1.5}
          dot={false}
          name="Signal"
        />
      </ComposedChart>
    </ResponsiveContainer>
    </IndicatorChartWrapper>
  )
}

