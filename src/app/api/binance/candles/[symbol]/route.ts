import { NextRequest, NextResponse } from 'next/server'
import { getKlines, timeFrameToInterval } from '@/lib/binance/api'
import type { Candle } from '@/lib/bithumb/types'
import type { BinanceKline } from '@/lib/binance/types'

interface RouteParams {
  params: Promise<{
    symbol: string
  }>
}

export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { symbol } = await params
    const searchParams = request.nextUrl.searchParams
    const timeFrame = searchParams.get('timeFrame') || '1h'
    const limit = parseInt(searchParams.get('limit') || '500')
    const baseDate = searchParams.get('baseDate') // 기준 날짜 (YYYY-MM-DD)

    const interval = timeFrameToInterval(timeFrame)
    const klines = await getKlines(symbol.toUpperCase(), interval, limit)
    
    // 기준 날짜를 타임스탬프로 변환 (밀리초)
    const baseDateTimestamp = baseDate ? new Date(baseDate + 'T23:59:59+09:00').getTime() : Date.now()

    // 바이낸스 Kline을 Candle 형식으로 변환 및 기준 날짜 필터링
    const candles: Candle[] = klines
      .map((kline: BinanceKline) => ({
        timestamp: kline[0], // Open time
        open: parseFloat(kline[1]),
        high: parseFloat(kline[2]),
        low: parseFloat(kline[3]),
        close: parseFloat(kline[4]),
        volume: parseFloat(kline[5]),
      }))
      // 기준 날짜 이전 데이터만 필터링
      .filter((candle: Candle) => candle.timestamp <= baseDateTimestamp)
      // 최신 limit개 선택
      .slice(-limit)

    return NextResponse.json({
      success: true,
      data: candles,
      source: 'binance',
      symbol: symbol.toUpperCase(),
      timeFrame,
      count: candles.length,
    })
  } catch (error) {
    console.error('Binance candles API error:', error)
    return NextResponse.json(
      { 
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch Binance candles',
        source: 'binance',
      },
      { status: 500 }
    )
  }
}

