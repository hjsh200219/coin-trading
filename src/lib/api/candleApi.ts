/**
 * 캔들 데이터 API 공통 유틸리티
 */

import type { Candle } from '@/lib/bithumb/types'
import type { Exchange, TimeFrame, Period } from '@/types/chart'

/**
 * 거래소별 API 제한
 */
export const API_LIMITS: Record<Exchange, number> = {
  bithumb: 200,   // 빗썸: endTime 미지원, 최근 데이터만
  upbit: 200,     // 업비트: 최대 200개
  binance: 1000,  // 바이낸스: 최대 1000개
}

/**
 * 기간별 일수
 */
export const PERIOD_DAYS: Record<Period, number> = {
  '1M': 30,
  '3M': 90,
  '6M': 180,
  '1Y': 365,
  '2Y': 730,
  '3Y': 1095,
}

/**
 * 타임프레임별 시간(시간 단위)
 */
export const TIMEFRAME_HOURS: Record<TimeFrame, number> = {
  '1m': 1 / 60,
  '5m': 5 / 60,
  '10m': 10 / 60,
  '30m': 0.5,
  '1h': 1,
  '2h': 2,
  '4h': 4,
  '1d': 24,
  '1w': 168,
}

/**
 * 거래소별 API 경로
 */
export const getApiPath = (exchange: Exchange): string => {
  return exchange === 'bithumb' ? 'market' : exchange
}

/**
 * 거래소별 사용 가능한 기간 계산
 */
export const getAvailablePeriods = (
  exchange: Exchange,
  timeFrame: TimeFrame
): Period[] => {
  const limit = API_LIMITS[exchange]

  // Bithumb은 항상 제한적
  if (exchange === 'bithumb') {
    const hours = limit * TIMEFRAME_HOURS[timeFrame]
    const days = hours / 24

    if (days < 7) return []
    if (days < 30) return ['1M']
    if (days < 90) return ['1M', '3M']
    return ['1M', '3M']
  }

  // Binance, Upbit은 다중 호출 가능하므로 모든 기간 지원
  return ['1M', '3M', '6M', '1Y', '2Y', '3Y']
}

/**
 * 다중 호출로 캔들 데이터 가져오기
 */
export interface FetchCandlesOptions {
  symbol: string
  exchange: Exchange
  timeFrame: TimeFrame
  startTimestamp: number
  endTimestamp: number
  maxIterations?: number
  onProgress?: (current: number, total: number) => void
}

export const fetchMultipleCandles = async ({
  symbol,
  exchange,
  timeFrame,
  startTimestamp,
  endTimestamp,
  maxIterations = 20,
  onProgress,
}: FetchCandlesOptions): Promise<Candle[]> => {
  const apiPath = getApiPath(exchange)
  const limit = API_LIMITS[exchange]
  const allCandles: Candle[] = []
  let currentEndTime = endTimestamp
  let iterations = 0

  // Bithumb은 다중 호출 불가능
  if (exchange === 'bithumb') {
    const url = `/api/${apiPath}/candles/${symbol}?timeFrame=${timeFrame}&limit=${limit}`
    const response = await fetch(url)

    if (!response.ok) {
      throw new Error('데이터를 불러올 수 없습니다')
    }

    const result = await response.json()
    if (!result.success) {
      throw new Error(result.error || '데이터 조회 실패')
    }

    return result.data.filter(
      (c: Candle) => c.timestamp >= startTimestamp && c.timestamp <= endTimestamp
    )
  }

  // Binance, Upbit: 다중 호출
  while (iterations < maxIterations) {
    const url = `/api/${apiPath}/candles/${symbol}?timeFrame=${timeFrame}&limit=${limit}&endTime=${currentEndTime}`
    const response = await fetch(url)

    if (!response.ok) {
      throw new Error('데이터를 불러올 수 없습니다')
    }

    const result = await response.json()
    if (!result.success) {
      throw new Error(result.error || '데이터 조회 실패')
    }

    const newCandles: Candle[] = result.data

    if (newCandles.length === 0) break

    // 시작 시간보다 이전 데이터는 제외
    const validCandles = newCandles.filter((c: Candle) => c.timestamp >= startTimestamp)
    allCandles.unshift(...validCandles)

    // 진행률 콜백
    if (onProgress) {
      const estimatedTotal = Math.ceil(
        (endTimestamp - startTimestamp) / (TIMEFRAME_HOURS[timeFrame] * 60 * 60 * 1000)
      )
      onProgress(allCandles.length, Math.max(estimatedTotal, allCandles.length))
    }

    // 가장 오래된 캔들의 timestamp를 다음 endTime으로
    const oldestTimestamp = newCandles[0]?.timestamp
    if (!oldestTimestamp || oldestTimestamp <= startTimestamp) break

    currentEndTime = oldestTimestamp - 1
    iterations++
  }

  // 중복 제거 및 정렬
  const uniqueCandles = Array.from(
    new Map(allCandles.map((c) => [c.timestamp, c])).values()
  ).sort((a, b) => a.timestamp - b.timestamp)

  return uniqueCandles.filter(
    (c) => c.timestamp >= startTimestamp && c.timestamp <= endTimestamp
  )
}

/**
 * 필요한 캔들 개수 계산 (기간과 타임프레임 기준)
 */
export const calculateRequiredCandles = (period: Period, timeFrame: TimeFrame): number => {
  const days = PERIOD_DAYS[period]
  const hoursPerCandle = TIMEFRAME_HOURS[timeFrame]
  return Math.ceil((days * 24) / hoursPerCandle)
}

