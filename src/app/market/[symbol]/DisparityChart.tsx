'use client'

import { useMemo } from 'react'
import { LineChart, Line, ResponsiveContainer } from 'recharts'
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
import type { DPResult } from '@/lib/indicators/calculator'
import type { Candle } from '@/lib/bithumb/types'

interface DPChartProps {
  DP: DPResult[]
  candles: Candle[]
}

export default function DPChart({ DP, candles }: DPChartProps) {
  const chartData = useMemo(() => {
    if (DP.length === 0) return []

    // 가장 긴 DP 데이터를 기준으로 차트 생성
    const longestDP = DP.reduce((prev, current) => 
      current.values.length > prev.values.length ? current : prev
    )

    const offset = candles.length - longestDP.values.length

    return longestDP.values.map((_, index) => {
      const candleIndex = offset + index
      const candle = candles[candleIndex]

      const dataPoint: any = {
        time: formatChartTime(candle.timestamp),
      }

      // 각 기간별 DP 데이터 추가
      DP.forEach((d) => {
        const DPOffset = longestDP.values.length - d.values.length
        const DPIndex = index - DPOffset
        if (DPIndex >= 0 && DPIndex < d.values.length) {
          dataPoint[`DP${d.period}`] = d.values[DPIndex]
        }
      })

      return dataPoint
    })
  }, [DP, candles])

  // 각 DP의 최신 값
  const latestValues = DP.map((d) => ({
    period: d.period,
    value: d.values[d.values.length - 1],
    status: d.values[d.values.length - 1] >= 105 
      ? '과매수' 
      : d.values[d.values.length - 1] <= 95 
      ? '과매도' 
      : '중립',
    color: d.values[d.values.length - 1] >= 105 
      ? 'text-red-500' 
      : d.values[d.values.length - 1] <= 95 
      ? 'text-blue-500' 
      : 'text-foreground',
  }))

  const colors = ['#fbbf24', '#3ecf8e', '#8b5cf6'] // 노랑, 초록, 보라

  const legends = DP.map((d, index) => ({
    color: colors[index],
    label: `${d.period}일`,
    type: 'line' as const,
  }))

  return (
    <IndicatorChartWrapper
      title="DP Index"
      legends={legends}
      height={200}
    >
      <>
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={chartData} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
            <ChartGrid />
            <ChartXAxis />
            <ChartYAxis domain={[90, 110]} ticks={[90, 95, 100, 105, 110]} />
            <ChartTooltip formatter={(value: number) => `${value.toFixed(2)}%`} />
            
            {/* 과매수 구간 */}
            <ChartReferenceLine
              y={105}
              label="과매수"
              stroke="#ef4444"
              labelColor="#ef4444"
            />
            
            {/* 기준선 */}
            <ChartReferenceLine y={100} label="기준" stroke="#666" labelColor="#666" />
            
            {/* 과매도 구간 */}
            <ChartReferenceLine
              y={95}
              label="과매도"
              stroke="#3b82f6"
              labelColor="#3b82f6"
            />

            {/* 각 기간별 DP 라인 */}
            {DP.map((d, index) => (
              <Line
                key={d.period}
                type="monotone"
                dataKey={`DP${d.period}`}
                name={`${d.period}일`}
                stroke={colors[index]}
                strokeWidth={2}
                dot={false}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>

        <IndicatorValueGrid
          items={latestValues.map((item, index) => ({
            label: `${item.period}일`,
            value: `${item.value.toFixed(2)}%\n${item.status}`,
            color: colors[index],
          }))}
          columns={3}
        />
      </>
    </IndicatorChartWrapper>
  )
}

