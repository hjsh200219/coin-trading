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
import type { DisparityResult } from '@/lib/indicators/calculator'
import type { Candle } from '@/lib/bithumb/types'

interface DisparityChartProps {
  disparity: DisparityResult[]
  candles: Candle[]
}

export default function DisparityChart({ disparity, candles }: DisparityChartProps) {
  const chartData = useMemo(() => {
    if (disparity.length === 0) return []

    // 가장 긴 이격도 데이터를 기준으로 차트 생성
    const longestDisparity = disparity.reduce((prev, current) => 
      current.values.length > prev.values.length ? current : prev
    )

    const offset = candles.length - longestDisparity.values.length

    return longestDisparity.values.map((_, index) => {
      const candleIndex = offset + index
      const candle = candles[candleIndex]

      const dataPoint: any = {
        time: formatChartTime(candle.timestamp),
      }

      // 각 기간별 이격도 데이터 추가
      disparity.forEach((d) => {
        const disparityOffset = longestDisparity.values.length - d.values.length
        const disparityIndex = index - disparityOffset
        if (disparityIndex >= 0 && disparityIndex < d.values.length) {
          dataPoint[`disparity${d.period}`] = d.values[disparityIndex]
        }
      })

      return dataPoint
    })
  }, [disparity, candles])

  // 각 이격도의 최신 값
  const latestValues = disparity.map((d) => ({
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

  const legends = disparity.map((d, index) => ({
    color: colors[index],
    label: `${d.period}일`,
    type: 'line' as const,
  }))

  return (
    <IndicatorChartWrapper
      title="이격도 (Disparity Index)"
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

            {/* 각 기간별 이격도 라인 */}
            {disparity.map((d, index) => (
              <Line
                key={d.period}
                type="monotone"
                dataKey={`disparity${d.period}`}
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

