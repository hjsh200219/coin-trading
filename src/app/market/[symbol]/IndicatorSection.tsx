'use client'

import { useState } from 'react'
import { Card } from '@/components/ui/Card'
import { Tooltip } from '@/components/ui/Tooltip'
import type { Candle } from '@/lib/bithumb/types'
import {
  calculateMACD,
  calculateRSI,
  calculateAO,
  calculateMultipleDisparity,
  type MACDResult,
  type DisparityResult,
} from '@/lib/indicators/calculator'

interface IndicatorSectionProps {
  candles: Candle[]
}

export default function IndicatorSection({ candles }: IndicatorSectionProps) {
  const [enabledIndicators, setEnabledIndicators] = useState({
    macd: true,
    rsi: true,
    ao: true,
    disparity: true,
  })

  // 지표 계산
  const macd = enabledIndicators.macd ? calculateMACD(candles) : null
  const rsi = enabledIndicators.rsi ? calculateRSI(candles) : null
  const ao = enabledIndicators.ao ? calculateAO(candles) : null
  const disparity = enabledIndicators.disparity
    ? calculateMultipleDisparity(candles, [20, 60, 120])
    : null

  const toggleIndicator = (indicator: keyof typeof enabledIndicators) => {
    setEnabledIndicators((prev) => ({
      ...prev,
      [indicator]: !prev[indicator],
    }))
  }

  if (!candles || candles.length === 0) {
    return null
  }

  return (
    <div className="space-y-4">
      {/* 지표 제목 및 토글 */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-foreground">기술적 지표</h2>
        <div className="flex gap-2 flex-wrap">
          {Object.entries(enabledIndicators).map(([key, enabled]) => (
            <button
              key={key}
              onClick={() => toggleIndicator(key as keyof typeof enabledIndicators)}
              className={`px-3 py-1 text-xs rounded transition ${
                enabled
                  ? 'bg-brand text-background'
                  : 'bg-surface border border-border text-foreground/60'
              }`}
            >
              {key.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {/* MACD 지표 */}
      {enabledIndicators.macd && macd && (
        <MACDCard macd={macd} />
      )}

      {/* RSI 지표 */}
      {enabledIndicators.rsi && rsi && (
        <RSICard rsi={rsi} />
      )}

      {/* AO 지표 */}
      {enabledIndicators.ao && ao && (
        <AOCard ao={ao} />
      )}

      {/* 이격도 지표 */}
      {enabledIndicators.disparity && disparity && disparity.length > 0 && (
        <DisparityCard disparity={disparity} />
      )}
    </div>
  )
}

// MACD 카드
function MACDCard({ macd }: { macd: MACDResult }) {
  const latest = {
    macd: macd.macd[macd.macd.length - 1],
    signal: macd.signal[macd.signal.length - 1],
    histogram: macd.histogram[macd.histogram.length - 1],
  }

  const signal = latest.histogram > 0 ? '매수' : '매도'
  const signalColor = latest.histogram > 0 ? 'text-red-500' : 'text-blue-500'

  return (
    <Card className="p-4">
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-foreground">MACD (12, 26, 9)</h3>
          <Tooltip content={
            <div className="space-y-1">
              <p className="font-semibold">MACD (Moving Average Convergence Divergence)</p>
              <p>단기 이동평균(12)과 장기 이동평균(26)의 차이로 추세 전환을 포착</p>
              <p className="text-brand">• Histogram &gt; 0: 상승 추세 (매수)</p>
              <p className="text-red-500">• Histogram &lt; 0: 하락 추세 (매도)</p>
              <p className="text-foreground/80">• MACD가 Signal을 상향 돌파: 골든 크로스</p>
            </div>
          }>
            <button className="text-xs text-foreground/60 hover:text-brand">?</button>
          </Tooltip>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
          <div>
            <p className="text-xs text-foreground/60">MACD</p>
            <p className="font-medium text-foreground">{latest.macd.toFixed(2)}</p>
          </div>
          <div>
            <p className="text-xs text-foreground/60">Signal</p>
            <p className="font-medium text-foreground">{latest.signal.toFixed(2)}</p>
          </div>
          <div>
            <p className="text-xs text-foreground/60">Histogram</p>
            <p className={`font-medium ${signalColor}`}>{latest.histogram.toFixed(2)}</p>
          </div>
          <div>
            <p className="text-xs text-foreground/60">신호</p>
            <p className={`font-semibold ${signalColor}`}>{signal}</p>
          </div>
        </div>
      </div>
    </Card>
  )
}

// RSI 카드
function RSICard({ rsi }: { rsi: number[] }) {
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
    <Card className="p-4">
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-foreground">RSI (14)</h3>
          <Tooltip content={
            <div className="space-y-1">
              <p className="font-semibold">RSI (Relative Strength Index)</p>
              <p>가격 변동 속도와 강도를 0-100으로 표현</p>
              <p className="text-red-500">• 70 이상: 과매수 (매도 고려)</p>
              <p className="text-blue-500">• 30 이하: 과매도 (매수 고려)</p>
              <p className="text-foreground/80">• 50: 중립</p>
            </div>
          }>
            <button className="text-xs text-foreground/60 hover:text-brand">?</button>
          </Tooltip>
        </div>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <p className="text-xs text-foreground/60">RSI</p>
            <p className="font-medium text-foreground">{latest.toFixed(2)}</p>
          </div>
          <div>
            <p className="text-xs text-foreground/60">상태</p>
            <p className={`font-semibold ${statusColor}`}>{status}</p>
          </div>
        </div>
        {/* RSI 바 */}
        <div className="relative h-2 bg-surface-75 rounded-full overflow-hidden">
          <div
            className={`absolute left-0 top-0 h-full transition-all ${
              latest >= 70 ? 'bg-red-500' : latest <= 30 ? 'bg-blue-500' : 'bg-brand'
            }`}
            style={{ width: `${latest}%` }}
          />
        </div>
        <div className="flex justify-between text-xs text-foreground/60">
          <span>0</span>
          <span>30</span>
          <span>50</span>
          <span>70</span>
          <span>100</span>
        </div>
      </div>
    </Card>
  )
}

// AO 카드
function AOCard({ ao }: { ao: number[] }) {
  const latest = ao[ao.length - 1]
  const previous = ao[ao.length - 2]
  
  const trend = latest > previous ? '상승' : '하락'
  const trendColor = latest > 0 ? 'text-brand' : 'text-red-500'
  const momentum = latest > 0 ? '상승 모멘텀' : '하락 모멘텀'

  return (
    <Card className="p-4">
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-foreground">Awesome Oscillator (5, 34)</h3>
          <Tooltip content={
            <div className="space-y-1">
              <p className="font-semibold">Awesome Oscillator</p>
              <p>5일과 34일 중간가 이동평균의 차이로 모멘텀 측정</p>
              <p className="text-brand">• AO &gt; 0: 상승 모멘텀</p>
              <p className="text-red-500">• AO &lt; 0: 하락 모멘텀</p>
              <p className="text-foreground/80">• Zero Line 크로스: 추세 전환</p>
            </div>
          }>
            <button className="text-xs text-foreground/60 hover:text-brand">?</button>
          </Tooltip>
        </div>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <p className="text-xs text-foreground/60">AO</p>
            <p className={`font-medium ${trendColor}`}>{latest.toFixed(2)}</p>
          </div>
          <div>
            <p className="text-xs text-foreground/60">추세</p>
            <p className={`font-semibold ${trendColor}`}>
              {momentum} ({trend})
            </p>
          </div>
        </div>
      </div>
    </Card>
  )
}

// 이격도 카드
function DisparityCard({ disparity }: { disparity: DisparityResult[] }) {
  return (
    <Card className="p-4">
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-foreground">이격도 (Disparity Index)</h3>
          <Tooltip content={
            <div className="space-y-1">
              <p className="font-semibold">이격도 (Disparity Index)</p>
              <p>현재가가 이동평균선에서 얼마나 떨어져 있는지를 백분율로 표현</p>
              <p className="text-red-500">• 105% 이상: 과매수 (매도 고려)</p>
              <p className="text-blue-500">• 95% 이하: 과매도 (매수 고려)</p>
              <p className="text-foreground/80">• 100%: 현재가 = 이동평균</p>
            </div>
          }>
            <button className="text-xs text-foreground/60 hover:text-brand">?</button>
          </Tooltip>
        </div>
        <div className="grid grid-cols-3 gap-3 text-sm">
          {disparity.map((d) => {
            const latest = d.values[d.values.length - 1]
            let status = '중립'
            let statusColor = 'text-foreground'
            
            if (latest >= 105) {
              status = '과매수'
              statusColor = 'text-red-500'
            } else if (latest <= 95) {
              status = '과매도'
              statusColor = 'text-blue-500'
            }

            return (
              <div key={d.period}>
                <p className="text-xs text-foreground/60">{d.period}일</p>
                <p className={`font-medium ${statusColor}`}>{latest.toFixed(2)}%</p>
                <p className={`text-xs ${statusColor}`}>{status}</p>
              </div>
            )
          })}
        </div>
      </div>
    </Card>
  )
}

