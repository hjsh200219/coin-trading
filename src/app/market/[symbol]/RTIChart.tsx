'use client'

import { useMemo } from 'react'
import { Line, ResponsiveContainer, Area, ComposedChart } from 'recharts'
import IndicatorChartWrapper from '@/components/common/IndicatorChartWrapper'
import {
  ChartXAxis,
  ChartYAxis,
  ChartGrid,
  ChartTooltip,
  ChartReferenceLine,
} from '@/components/common/ChartElements'
import { formatChartTime } from '@/lib/utils/format'
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
      time: formatChartTime(candle.timestamp),
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
        <ChartGrid />
        <ChartXAxis />
        <ChartYAxis domain={[0, 100]} ticks={[0, 20, 50, 80, 100]} />
        <ChartTooltip />

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
        <ChartReferenceLine y={80} stroke="#606060" />
        <ChartReferenceLine y={50} stroke="#606060" />
        <ChartReferenceLine y={20} stroke="#606060" />

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

