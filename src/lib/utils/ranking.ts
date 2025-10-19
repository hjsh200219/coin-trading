// 시뮬레이션 Ranking Value 유틸리티

import type { Candle } from '@/lib/bithumb/types'
import type { RankingDataPoint, IndicatorConfig } from '@/types/chart'
import {
  calculateMACD,
  calculateRSI,
  calculateAO,
  calculateDisparity,
  calculateRTI,
} from '@/lib/indicators/calculator'

/**
 * 평균 계산
 */
function calculateAverage(values: number[]): number {
  if (values.length === 0) return 0
  return values.reduce((sum, val) => sum + val, 0) / values.length
}

/**
 * 표준편차 계산 (STDEV.P - 모집단 표준편차)
 */
function calculateStdDevP(values: number[]): number {
  if (values.length === 0) return 0

  const mean = calculateAverage(values)
  const squaredDiffs = values.map((val) => Math.pow(val - mean, 2))
  const variance = squaredDiffs.reduce((sum, val) => sum + val, 0) / values.length

  return Math.sqrt(variance)
}

/**
 * Z-Score 계산 (표준점수)
 * z-score = (값 - 평균) / 표준편차
 */
function calculateZScore(value: number, mean: number, stdDev: number): number {
  if (stdDev === 0) return 0
  return (value - mean) / stdDev
}

/**
 * Ranking Value 계산
 * - 5개의 보조지표(MACD, RSI, AO, Disparity, RTI)를 기반으로 Z-score 합산
 * - baseDate와 period를 기준으로 데이터 필터링
 * - indicatorConfig로 사용할 지표 선택
 */
export function calculateRankingValues(
  candles: Candle[],
  indicatorConfig: IndicatorConfig,
  baseDate?: Date,
  period?: string
): RankingDataPoint[] {
  if (candles.length === 0) return []

  let filteredCandles = candles

  // 기준 날짜가 있으면 필터링
  if (baseDate && period) {
    const baseDateTimestamp = baseDate.getTime()
    const periodDays = periodToDays(period)
    const startTimestamp = baseDateTimestamp - periodDays * 24 * 60 * 60 * 1000

    // 기준 날짜 이전이고 분석 기간 내의 데이터만 필터링
    filteredCandles = candles.filter(
      (candle) => candle.timestamp <= baseDateTimestamp && candle.timestamp >= startTimestamp
    )
  }

  if (filteredCandles.length === 0) return []

  // 지표 계산
  const macdResult = indicatorConfig.macd ? calculateMACD(filteredCandles) : null
  const rsiResult = indicatorConfig.rsi ? calculateRSI(filteredCandles) : null
  const aoResult = indicatorConfig.ao ? calculateAO(filteredCandles) : null
  const disparityResult = indicatorConfig.disparity
    ? calculateDisparity(filteredCandles, 20)
    : null
  const rtiResult = indicatorConfig.rti ? calculateRTI(filteredCandles) : null

  // 모든 지표가 null이면 빈 배열 반환
  if (!macdResult && !rsiResult && !aoResult && !disparityResult && !rtiResult) {
    return []
  }

  // 각 지표의 길이 계산 (null이 아닌 것만)
  const lengths = [
    macdResult?.histogram.length,
    rsiResult?.length,
    aoResult?.length,
    disparityResult?.values.length,
    rtiResult?.rti.length,
  ].filter((len): len is number => len !== undefined)

  // 가장 짧은 길이를 기준으로 데이터 정렬
  const minLength = Math.min(...lengths)
  const candleOffset = filteredCandles.length - minLength

  const alignedCandles = filteredCandles.slice(candleOffset)

  // 각 지표 데이터 정렬
  const macdValues = macdResult
    ? macdResult.histogram.slice(macdResult.histogram.length - minLength)
    : null
  const rsiValues = rsiResult ? rsiResult.slice(rsiResult.length - minLength) : null
  const aoValues = aoResult ? aoResult.slice(aoResult.length - minLength) : null
  const disparityValues = disparityResult
    ? disparityResult.values.slice(disparityResult.values.length - minLength)
    : null
  const rtiValues = rtiResult ? rtiResult.rti.slice(rtiResult.rti.length - minLength) : null

  // 평균 및 표준편차 계산 (활성화된 지표만)
  const macdAvg = macdValues ? calculateAverage(macdValues) : 0
  const macdStd = macdValues ? calculateStdDevP(macdValues) : 1

  const rsiAvg = rsiValues ? calculateAverage(rsiValues) : 0
  const rsiStd = rsiValues ? calculateStdDevP(rsiValues) : 1

  const aoAvg = aoValues ? calculateAverage(aoValues) : 0
  const aoStd = aoValues ? calculateStdDevP(aoValues) : 1

  const disparityAvg = disparityValues ? calculateAverage(disparityValues) : 0
  const disparityStd = disparityValues ? calculateStdDevP(disparityValues) : 1

  const rtiAvg = rtiValues ? calculateAverage(rtiValues) : 0
  const rtiStd = rtiValues ? calculateStdDevP(rtiValues) : 1

  // Z-score 계산 및 랭킹 값 생성
  const rankings: RankingDataPoint[] = alignedCandles.map((candle, i) => {
    let rankingValue = 0

    if (macdValues) {
      rankingValue += calculateZScore(macdValues[i], macdAvg, macdStd)
    }
    if (rsiValues) {
      rankingValue += calculateZScore(rsiValues[i], rsiAvg, rsiStd)
    }
    if (aoValues) {
      rankingValue += calculateZScore(aoValues[i], aoAvg, aoStd)
    }
    if (disparityValues) {
      rankingValue += calculateZScore(disparityValues[i], disparityAvg, disparityStd)
    }
    if (rtiValues) {
      rankingValue += calculateZScore(rtiValues[i], rtiAvg, rtiStd)
    }

    return {
      timestamp: candle.timestamp,
      macd: macdValues ? macdValues[i] : null,
      rsi: rsiValues ? rsiValues[i] : null,
      ao: aoValues ? aoValues[i] : null,
      disparity: disparityValues ? disparityValues[i] : null,
      rti: rtiValues ? rtiValues[i] : null,
      rankingValue,
    }
  })

  return rankings
}

/**
 * Period를 일수로 변환
 */
export function periodToDays(period: string): number {
  switch (period) {
    case '1M':
      return 30
    case '3M':
      return 90
    case '6M':
      return 180
    case '1Y':
      return 365
    case '2Y':
      return 365 * 2
    case '3Y':
      return 365 * 3
    default:
      return 30
  }
}

/**
 * TimeFrame을 분 단위로 변환
 */
export function timeFrameToMinutes(timeFrame: string): number {
  switch (timeFrame) {
    case '30m':
      return 30
    case '1h':
      return 60
    case '2h':
      return 120
    case '4h':
      return 240
    case '1d':
      return 1440
    default:
      return 60
  }
}

/**
 * Period와 TimeFrame으로부터 필요한 캔들 개수 계산
 */
export function calculateRequiredCandles(period: string, timeFrame: string): number {
  const days = periodToDays(period)
  const minutesPerCandle = timeFrameToMinutes(timeFrame)
  const candlesPerDay = (24 * 60) / minutesPerCandle

  // 필요한 캔들 수 + 지표 계산을 위한 추가 캔들 (RTI는 100개 필요)
  return Math.ceil(days * candlesPerDay) + 150
}
