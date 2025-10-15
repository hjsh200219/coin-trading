// 업비트 API 클라이언트

import type {
  UpbitTicker,
  UpbitMarket,
  UpbitMinuteCandle,
  UpbitDayCandle,
  Candle,
} from './types'

const UPBIT_API_BASE_URL = 'https://api.upbit.com/v1'

/**
 * 업비트 API 에러
 */
export class UpbitAPIError extends Error {
  constructor(
    message: string,
    public statusCode?: number
  ) {
    super(message)
    this.name = 'UpbitAPIError'
  }
}

/**
 * 공통 fetch 로직
 */
async function fetchUpbitAPI<T>(url: string): Promise<T> {
  try {
    const response = await fetch(url, {
      next: { revalidate: 10 }, // 10초마다 재검증
      headers: {
        Accept: 'application/json',
      },
    })

    if (!response.ok) {
      throw new UpbitAPIError(
        `API 요청 실패: ${response.status} ${response.statusText}`,
        response.status
      )
    }

    const data: T = await response.json()
    return data
  } catch (error) {
    if (error instanceof UpbitAPIError) {
      throw error
    }
    throw new UpbitAPIError('업비트 API 호출 중 오류가 발생했습니다')
  }
}

/**
 * 마켓 코드 조회
 * @returns 업비트에서 거래 가능한 마켓 정보 목록
 */
export async function getMarkets(): Promise<UpbitMarket[]> {
  return fetchUpbitAPI<UpbitMarket[]>(`${UPBIT_API_BASE_URL}/market/all`)
}

/**
 * 현재가 정보 조회
 * @param markets 마켓 코드 배열 (예: ['KRW-BTC', 'KRW-ETH'])
 * @returns 해당 마켓들의 현재가 정보
 */
export async function getTickers(markets: string[]): Promise<UpbitTicker[]> {
  const marketsParam = markets.join(',')
  return fetchUpbitAPI<UpbitTicker[]>(
    `${UPBIT_API_BASE_URL}/ticker?markets=${marketsParam}`
  )
}

/**
 * 분봉 캔들 조회
 * @param market 마켓 코드 (예: KRW-BTC)
 * @param unit 분 단위 (1, 3, 5, 10, 15, 30, 60, 240)
 * @param count 캔들 개수 (최대 200)
 * @returns 분봉 캔들 데이터
 */
export async function getMinuteCandles(
  market: string,
  unit: 1 | 3 | 5 | 10 | 15 | 30 | 60 | 240 = 1,
  count: number = 200
): Promise<UpbitMinuteCandle[]> {
  return fetchUpbitAPI<UpbitMinuteCandle[]>(
    `${UPBIT_API_BASE_URL}/candles/minutes/${unit}?market=${market}&count=${count}`
  )
}

/**
 * 일봉 캔들 조회
 * @param market 마켓 코드 (예: KRW-BTC)
 * @param count 캔들 개수 (최대 200)
 * @returns 일봉 캔들 데이터
 */
export async function getDayCandles(
  market: string,
  count: number = 200
): Promise<UpbitDayCandle[]> {
  return fetchUpbitAPI<UpbitDayCandle[]>(
    `${UPBIT_API_BASE_URL}/candles/days?market=${market}&count=${count}`
  )
}

/**
 * 업비트 캔들 데이터를 공통 Candle 타입으로 변환
 * @param candles 업비트 캔들 데이터 (분봉 또는 일봉)
 * @returns 공통 Candle 타입 배열
 */
export function convertToCommonCandles(
  candles: UpbitMinuteCandle[] | UpbitDayCandle[]
): Candle[] {
  return candles.map((candle) => ({
    timestamp: candle.timestamp,
    open: candle.opening_price,
    close: candle.trade_price,
    high: candle.high_price,
    low: candle.low_price,
    volume: candle.candle_acc_trade_volume,
  })).reverse() // 업비트는 최신순으로 오므로 오래된 순으로 정렬
}

