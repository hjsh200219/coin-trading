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
    const endTime = searchParams.get('endTime') // 종료 시간 (밀리초 타임스탬프)

    const interval = timeFrameToInterval(timeFrame)
    
    // 기준 날짜를 타임스탬프로 변환 (밀리초)
    let baseDateTimestamp: number
    if (endTime) {
      baseDateTimestamp = parseInt(endTime)
    } else if (baseDate) {
      baseDateTimestamp = new Date(baseDate + 'T23:59:59+09:00').getTime()
    } else {
      baseDateTimestamp = Date.now()
    }
    
    // Binance API 호출 (endTime 파라미터 포함)
    const klines = await getKlines(
      symbol.toUpperCase(), 
      interval, 
      limit, 
      baseDateTimestamp // endTime 파라미터 전달
    )

    // 바이낸스 Kline을 Candle 형식으로 변환
    const candles: Candle[] = klines
      .map((kline: BinanceKline) => ({
        timestamp: kline[0], // Open time
        open: parseFloat(kline[1]),
        high: parseFloat(kline[2]),
        low: parseFloat(kline[3]),
        close: parseFloat(kline[4]),
        volume: parseFloat(kline[5]),
      }))
      // 기준 날짜 이전 데이터만 필터링 (안전장치)
      .filter((candle: Candle) => candle.timestamp <= baseDateTimestamp)

    return NextResponse.json({
      success: true,
      data: candles,
      source: 'binance',
      symbol: symbol.toUpperCase(),
      timeFrame,
      count: candles.length,
    })
  } catch (error) {
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

