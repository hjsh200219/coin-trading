// 기술적 지표 계산 유틸리티

import { MACD, RSI, SMA, EMA, SD } from 'technicalindicators'
import type { Candle } from '@/lib/bithumb/types'

/**
 * MACD 계산
 */
export interface MACDResult {
  macd: number[]
  signal: number[]
  histogram: number[]
}

export function calculateMACD(
  candles: Candle[],
  fastPeriod = 12,
  slowPeriod = 26,
  signalPeriod = 9
): MACDResult | null {
  if (candles.length < slowPeriod + signalPeriod) {
    return null
  }

  const closePrices = candles.map((c) => c.close)

  const macdData = MACD.calculate({
    values: closePrices,
    fastPeriod,
    slowPeriod,
    signalPeriod,
    SimpleMAOscillator: false,
    SimpleMASignal: true, // indicator.md: signal = sma(macd, signalPeriod)
  })

  if (!macdData || macdData.length === 0) {
    return null
  }

  return {
    macd: macdData.map((d) => d.MACD || 0),
    signal: macdData.map((d) => d.signal || 0),
    histogram: macdData.map((d) => d.histogram || 0),
  }
}

/**
 * RSI 계산
 */
export function calculateRSI(candles: Candle[], period = 14): number[] | null {
  if (candles.length < period + 1) {
    return null
  }

  const closePrices = candles.map((c) => c.close)

  const rsiValues = RSI.calculate({
    values: closePrices,
    period,
  })

  return rsiValues.length > 0 ? rsiValues : null
}

/**
 * AO (Awesome Oscillator) 계산
 */
export function calculateAO(
  candles: Candle[],
  fastPeriod = 5,
  slowPeriod = 34
): number[] | null {
  if (candles.length < slowPeriod) {
    return null
  }

  // Median Price = (High + Low) / 2
  const medianPrices = candles.map((c) => (c.high + c.low) / 2)

  // Fast SMA (5일)
  const fastSMA = SMA.calculate({
    values: medianPrices,
    period: fastPeriod,
  })

  // Slow SMA (34일)
  const slowSMA = SMA.calculate({
    values: medianPrices,
    period: slowPeriod,
  })

  // AO = Fast SMA - Slow SMA
  // slowSMA가 더 긴 기간이므로 나중에 시작됨
  const offset = slowPeriod - fastPeriod
  const ao: number[] = []

  for (let i = 0; i < slowSMA.length; i++) {
    ao.push(fastSMA[i + offset] - slowSMA[i])
  }

  return ao.length > 0 ? ao : null
}

/**
 * 이격도 (Disparity Index) 계산
 * indicator.md: 100 * (close - xEMA) / xEMA
 */
export interface DisparityResult {
  period: number
  values: number[]
}

export function calculateDisparity(
  candles: Candle[],
  period = 20
): DisparityResult | null {
  if (candles.length < period) {
    return null
  }

  const closePrices = candles.map((c) => c.close)

  // EMA 계산 (indicator.md에서 EMA 사용)
  const ema = EMA.calculate({
    values: closePrices,
    period,
  })

  // 이격도 = 100 * (현재가 - EMA) / EMA
  const disparityValues: number[] = []
  const offset = period - 1

  for (let i = 0; i < ema.length; i++) {
    const currentPrice = closePrices[i + offset]
    const disparity = (100 * (currentPrice - ema[i])) / ema[i]
    disparityValues.push(disparity)
  }

  return {
    period,
    values: disparityValues,
  }
}

/**
 * 복수 기간 이격도 계산
 */
export function calculateMultipleDisparity(
  candles: Candle[],
  periods: number[] = [20, 60, 120]
): DisparityResult[] {
  return periods
    .map((period) => calculateDisparity(candles, period))
    .filter((result): result is DisparityResult => result !== null)
}

/**
 * 이동평균선 (Simple Moving Average) 계산
 */
export interface MAResult {
  period: number
  values: number[]
}

export function calculateMA(
  candles: Candle[],
  period: number
): MAResult | null {
  if (candles.length < period) {
    return null
  }

  const closePrices = candles.map((c) => c.close)
  const maValues = SMA.calculate({
    values: closePrices,
    period,
  })

  return maValues.length > 0 ? { period, values: maValues } : null
}

/**
 * 복수 기간 이동평균선 계산
 */
export function calculateMultipleMA(
  candles: Candle[],
  periods: number[] = [5, 20, 60, 120]
): MAResult[] {
  return periods
    .map((period) => calculateMA(candles, period))
    .filter((result): result is MAResult => result !== null)
}

/**
 * RTI (Relative Trend Index) 계산
 * indicator.md 기반 구현
 */
export interface RTIResult {
  rti: number[]
  signal: number[] // EMA of RTI
}

export function calculateRTI(
  candles: Candle[],
  trendDataCount = 100,
  sensitivityPercentage = 95,
  signalLength = 20
): RTIResult | null {
  if (candles.length < trendDataCount) {
    return null
  }

  const closePrices = candles.map((c) => c.close)
  const rtiValues: number[] = []

  // 각 시점마다 RTI 계산
  for (let i = trendDataCount - 1; i < closePrices.length; i++) {
    const currentClose = closePrices[i]
    
    // trendDataCount 개수만큼의 데이터로 upper/lower trend 계산
    const upperArray: number[] = []
    const lowerArray: number[] = []
    
    for (let j = 0; j < trendDataCount; j++) {
      const idx = i - j
      if (idx < 0) continue
      
      const close = closePrices[idx]
      
      // 표준편차 계산 (period=2)
      let stdev = 0
      if (idx >= 1) {
        const values = [closePrices[idx], closePrices[idx - 1]]
        const sdResult = SD.calculate({ values, period: 2 })
        stdev = sdResult[0] || 0
      }
      
      const upperTrend = close + stdev
      const lowerTrend = close - stdev
      
      upperArray.push(upperTrend)
      lowerArray.push(lowerTrend)
    }
    
    // 정렬
    upperArray.sort((a, b) => a - b)
    lowerArray.sort((a, b) => a - b)
    
    // 인덱스 계산
    const upperIndex = Math.round((sensitivityPercentage / 100) * trendDataCount) - 1
    const lowerIndex = Math.round(((100 - sensitivityPercentage) / 100) * trendDataCount) - 1
    
    const upperTrend = upperArray[upperIndex] || upperArray[upperArray.length - 1]
    const lowerTrend = lowerArray[lowerIndex] || lowerArray[0]
    
    // RTI 계산
    const denominator = upperTrend - lowerTrend
    const rti = denominator !== 0 
      ? ((currentClose - lowerTrend) / denominator) * 100 
      : 50 // 기본값
    
    rtiValues.push(Math.max(0, Math.min(100, rti))) // 0-100 범위로 제한
  }

  // Signal Line 계산 (RTI의 EMA)
  const signalValues = EMA.calculate({
    values: rtiValues,
    period: signalLength,
  })

  // signal의 길이에 맞춰 rti 조정
  const offset = rtiValues.length - signalValues.length
  const alignedRTI = rtiValues.slice(offset)

  return {
    rti: alignedRTI,
    signal: signalValues,
  }
}

