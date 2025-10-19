'use client'

import { useState } from 'react'
import type { Candle } from '@/lib/bithumb/types'
import {
  calculateMACD,
  calculateRSI,
  calculateAO,
  calculateMultipleDisparity,
  calculateRTI,
} from '@/lib/indicators/calculator'
import MACDChart from './MACDChart'
import RSIChart from './RSIChart'
import AOChart from './AOChart'
import DisparityChart from './DisparityChart'
import RTIChart from './RTIChart'

interface IndicatorSectionProps {
  candles: Candle[]
}

export default function IndicatorSection({ candles }: IndicatorSectionProps) {
  const [enabledIndicators, setEnabledIndicators] = useState({
    macd: true,
    rsi: true,
    ao: true,
    disparity: true,
    rti: true,
  })

  // 지표 계산
  const macd = enabledIndicators.macd ? calculateMACD(candles) : null
  const rsi = enabledIndicators.rsi ? calculateRSI(candles) : null
  const ao = enabledIndicators.ao ? calculateAO(candles) : null
  const disparity = enabledIndicators.disparity
    ? calculateMultipleDisparity(candles, [20, 60, 120])
    : null
  const rti = enabledIndicators.rti ? calculateRTI(candles) : null

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

      {/* MACD 차트 */}
      {enabledIndicators.macd && macd && (
        <MACDChart macd={macd} candles={candles} />
      )}

      {/* RSI 차트 */}
      {enabledIndicators.rsi && rsi && (
        <RSIChart rsi={rsi} candles={candles} />
      )}

      {/* AO 차트 */}
      {enabledIndicators.ao && ao && (
        <AOChart ao={ao} candles={candles} />
      )}

      {/* Dispariy 차트 */}
      {enabledIndicators.disparity && disparity && disparity.length > 0 && (
        <DisparityChart disparity={disparity} candles={candles} />
      )}

      {/* RTI 차트 */}
      {enabledIndicators.rti && rti && (
        <RTIChart candles={candles} />
      )}
    </div>
  )
}

