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
  Legend,
} from 'recharts'
import IndicatorChartWrapper from '@/components/common/IndicatorChartWrapper'
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
        time: new Date(candle.timestamp).toLocaleString('ko-KR', {
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
        }),
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
              domain={[90, 110]}
              ticks={[90, 95, 100, 105, 110]}
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
              formatter={(value: number) => `${value.toFixed(2)}%`}
            />
            
            {/* 과매수 구간 */}
            <ReferenceLine 
              y={105} 
              stroke="#ef4444" 
              strokeDasharray="3 3" 
              label={{ 
                value: '과매수', 
                position: 'right', 
                fill: '#ef4444', 
                fontSize: 10 
              }} 
            />
            
            {/* 기준선 */}
            <ReferenceLine 
              y={100} 
              stroke="#666" 
              strokeDasharray="3 3"
              label={{ 
                value: '기준', 
                position: 'right', 
                fill: '#666', 
                fontSize: 10 
              }}
            />
            
            {/* 과매도 구간 */}
            <ReferenceLine 
              y={95} 
              stroke="#3b82f6" 
              strokeDasharray="3 3" 
              label={{ 
                value: '과매도', 
                position: 'right', 
                fill: '#3b82f6', 
                fontSize: 10 
              }} 
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

        <div className="grid grid-cols-3 gap-3 text-sm pt-2 border-t border-border">
          {latestValues.map((item, index) => (
            <div key={item.period}>
              <p className="text-xs text-foreground/60">{item.period}일</p>
              <p className="font-medium" style={{ color: colors[index] }}>
                {item.value.toFixed(2)}%
              </p>
              <p className={`text-xs ${item.color}`}>{item.status}</p>
            </div>
          ))}
        </div>
      </>
    </IndicatorChartWrapper>
  )
}

