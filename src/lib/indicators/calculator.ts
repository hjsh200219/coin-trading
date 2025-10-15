// 기술적 지표 계산 유틸리티

import { MACD, RSI, SMA } from 'technicalindicators'
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
    SimpleMASignal: false,
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

  // 이동평균 계산
  const ma = SMA.calculate({
    values: closePrices,
    period,
  })

  // 이격도 = (현재가 / 이동평균) × 100
  const disparityValues: number[] = []
  const offset = period - 1

  for (let i = 0; i < ma.length; i++) {
    const currentPrice = closePrices[i + offset]
    const disparity = (currentPrice / ma[i]) * 100
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

