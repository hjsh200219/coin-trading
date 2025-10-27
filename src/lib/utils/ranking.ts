// 시뮬레이션 Ranking Value 유틸리티

import type { Candle } from '@/lib/bithumb/types'
import type { RankingDataPoint, IndicatorConfig } from '@/types/chart'
import {
  calculateMACD,
  calculateRSI,
  calculateAO,
  calculateDP,
  calculateRTI,
} from '@/lib/indicators/calculator'
import { LOOKBACK_WINDOW, SIMULATION_TIMEFRAME_MAP, SIMULATION_MULTIPLIER_MAP } from '@/lib/simulation/constants'

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
 * Ranking Value 계산 (슬라이딩 윈도우 방식)
 * - 5개의 보조지표(MACD, RSI, AO, DP, RTI)를 기반으로 Z-score 합산
 * - 각 시점마다 이전 LOOKBACK_WINDOW(1000개) 데이터로 평균/표준편차 계산
 * - baseDate와 period를 기준으로 데이터 필터링
 * - indicatorConfig로 사용할 지표 선택
 * 
 * ⚠️ 중요: 미래 데이터를 사용하지 않음 (No Look-Ahead Bias)
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

  // 전체 기간의 지표 계산
  const macdResult = indicatorConfig.macd ? calculateMACD(filteredCandles) : null
  const rsiResult = indicatorConfig.rsi ? calculateRSI(filteredCandles) : null
  const aoResult = indicatorConfig.ao ? calculateAO(filteredCandles) : null
  const DPResult = indicatorConfig.DP
    ? calculateDP(filteredCandles, 20)
    : null
  const rtiResult = indicatorConfig.rti ? calculateRTI(filteredCandles) : null

  // 모든 지표가 null이면 빈 배열 반환
  if (!macdResult && !rsiResult && !aoResult && !DPResult && !rtiResult) {
    return []
  }

  // 각 지표의 길이 계산 (null이 아닌 것만)
  const lengths = [
    macdResult?.histogram.length,
    rsiResult?.length,
    aoResult?.length,
    DPResult?.values.length,
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
  const DPValues = DPResult
    ? DPResult.values.slice(DPResult.values.length - minLength)
    : null
  const rtiValues = rtiResult ? rtiResult.rti.slice(rtiResult.rti.length - minLength) : null

  // ⭐ 슬라이딩 윈도우 방식으로 Z-score 계산 및 랭킹 값 생성
  const rankings: RankingDataPoint[] = alignedCandles.map((candle, i) => {
    // 현재 시점의 이전 LOOKBACK_WINDOW개 데이터로 통계 계산
    const windowStart = Math.max(0, i - LOOKBACK_WINDOW)
    const windowSize = i - windowStart // 실제 윈도우 크기 (처음에는 1000개보다 작을 수 있음)

    // 최소 데이터 개수 확인 (통계 계산에 최소 10개 필요)
    if (windowSize < 10) {
      return {
        timestamp: candle.timestamp,
        macd: macdValues ? macdValues[i] : null,
        rsi: rsiValues ? rsiValues[i] : null,
        ao: aoValues ? aoValues[i] : null,
        DP: DPValues ? DPValues[i] : null,
        rti: rtiValues ? rtiValues[i] : null,
        rankingValue: 0, // 데이터가 부족하면 0
      }
    }

    // 각 지표의 슬라이딩 윈도우 데이터로 평균/표준편차 계산
    const macdWindow = macdValues ? macdValues.slice(windowStart, i) : null
    const rsiWindow = rsiValues ? rsiValues.slice(windowStart, i) : null
    const aoWindow = aoValues ? aoValues.slice(windowStart, i) : null
    const DPWindow = DPValues ? DPValues.slice(windowStart, i) : null
    const rtiWindow = rtiValues ? rtiValues.slice(windowStart, i) : null

    const macdAvg = macdWindow ? calculateAverage(macdWindow) : 0
    const macdStd = macdWindow ? calculateStdDevP(macdWindow) : 1

    const rsiAvg = rsiWindow ? calculateAverage(rsiWindow) : 0
    const rsiStd = rsiWindow ? calculateStdDevP(rsiWindow) : 1

    const aoAvg = aoWindow ? calculateAverage(aoWindow) : 0
    const aoStd = aoWindow ? calculateStdDevP(aoWindow) : 1

    const DPAvg = DPWindow ? calculateAverage(DPWindow) : 0
    const DPStd = DPWindow ? calculateStdDevP(DPWindow) : 1

    const rtiAvg = rtiWindow ? calculateAverage(rtiWindow) : 0
    const rtiStd = rtiWindow ? calculateStdDevP(rtiWindow) : 1

    // 현재 시점의 Z-Score 계산
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
    if (DPValues) {
      rankingValue += calculateZScore(DPValues[i], DPAvg, DPStd)
    }
    if (rtiValues) {
      rankingValue += calculateZScore(rtiValues[i], rtiAvg, rtiStd)
    }

    return {
      timestamp: candle.timestamp,
      macd: macdValues ? macdValues[i] : null,
      rsi: rsiValues ? rsiValues[i] : null,
      ao: aoValues ? aoValues[i] : null,
      DP: DPValues ? DPValues[i] : null,
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
 * 타임프레임에 따른 시뮬레이션 간격 가져오기
 * 
 * @param mainTimeFrame - 메인 타임프레임 (1d, 4h, 2h, 1h, 30m, etc.)
 * @returns 시뮬레이션에 사용할 세부 타임프레임
 * 
 * @example
 * getSimulationTimeFrame('1d') // '5m' (5분봉)
 * getSimulationTimeFrame('4h') // '1m' (1분봉)
 */
export function getSimulationTimeFrame(mainTimeFrame: string): string {
  return SIMULATION_TIMEFRAME_MAP[mainTimeFrame] || '5m' // 기본값 5분
}

/**
 * 타임프레임에 따른 시뮬레이션 배수 가져오기
 * 
 * @param mainTimeFrame - 메인 타임프레임
 * @returns 시뮬레이션 캔들 개수 배수
 * 
 * @example
 * getSimulationMultiplier('1d') // 288 (1일 = 5분 × 288)
 * getSimulationMultiplier('4h') // 240 (4시간 = 1분 × 240)
 */
export function getSimulationMultiplier(mainTimeFrame: string): number {
  return SIMULATION_MULTIPLIER_MAP[mainTimeFrame] || 24 // 기본값 24배
}

/**
 * Period와 TimeFrame으로부터 필요한 캔들 개수 계산
 * 
 * ⭐ 슬라이딩 윈도우 방식: 시뮬레이션 시작 전 LOOKBACK_WINDOW(1000개) 추가 필요
 */
export function calculateRequiredCandles(period: string, timeFrame: string): number {
  const days = periodToDays(period)
  const minutesPerCandle = timeFrameToMinutes(timeFrame)
  const candlesPerDay = (24 * 60) / minutesPerCandle

  // 필요한 캔들 수 계산
  const periodCandles = Math.ceil(days * candlesPerDay)
  
  // 지표 계산용 추가 캔들 (RTI는 100개 필요)
  const indicatorBuffer = 150
  
  // 슬라이딩 윈도우용 추가 캔들 (LOOKBACK_WINDOW = 1000개)
  const slidingWindowBuffer = LOOKBACK_WINDOW
  
  // 총 필요한 캔들 = 분석 기간 + 지표 계산용 + 슬라이딩 윈도우용
  return periodCandles + indicatorBuffer + slidingWindowBuffer
}
