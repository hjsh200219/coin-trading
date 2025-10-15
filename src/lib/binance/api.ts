// 바이낸스 API 클라이언트

import type { BinanceTicker, BinanceKline } from './types'
import { toBinanceSymbol } from './types'

const BINANCE_API_BASE = 'https://api.binance.com/api/v3'

/**
 * 모든 티커 정보 가져오기 (24시간 통계)
 */
export async function getAllTickers(): Promise<BinanceTicker[]> {
  const response = await fetch(`${BINANCE_API_BASE}/ticker/24hr`, {
    next: { revalidate: 10 }, // 10초 캐시
  })

  if (!response.ok) {
    throw new Error('Failed to fetch Binance tickers')
  }

  return response.json()
}

/**
 * 특정 코인의 티커 정보 가져오기
 */
export async function getTicker(coin: string): Promise<BinanceTicker> {
  const symbol = toBinanceSymbol(coin)
  const response = await fetch(
    `${BINANCE_API_BASE}/ticker/24hr?symbol=${symbol}`,
    {
      next: { revalidate: 10 },
    }
  )

  if (!response.ok) {
    throw new Error(`Failed to fetch Binance ticker for ${symbol}`)
  }

  return response.json()
}

/**
 * 캔들스틱 데이터 가져오기
 * @param symbol 바이낸스 심볼 (예: BTCUSDT)
 * @param interval 시간 간격 (1m, 5m, 15m, 1h, 4h, 1d 등)
 * @param limit 가져올 개수 (기본 500, 최대 1000)
 */
export async function getKlines(
  coin: string,
  interval: string = '1h',
  limit: number = 500
): Promise<BinanceKline[]> {
  const symbol = toBinanceSymbol(coin)
  const response = await fetch(
    `${BINANCE_API_BASE}/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`,
    {
      next: { revalidate: 60 }, // 1분 캐시
    }
  )

  if (!response.ok) {
    throw new Error(`Failed to fetch Binance klines for ${symbol}`)
  }

  return response.json()
}

/**
 * 바이낸스 타임프레임을 인터벌로 변환
 */
export function timeFrameToInterval(timeFrame: string): string {
  const mapping: Record<string, string> = {
    '30m': '30m',
    '1h': '1h',
    '2h': '2h',
    '4h': '4h',
    '1d': '1d',
  }
  return mapping[timeFrame] || '1h'
}

