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

    const interval = timeFrameToInterval(timeFrame)
    const klines = await getKlines(symbol.toUpperCase(), interval, limit)

    // 바이낸스 Kline을 Candle 형식으로 변환
    const candles: Candle[] = klines.map((kline: BinanceKline) => ({
      timestamp: kline[0], // Open time
      open: parseFloat(kline[1]),
      high: parseFloat(kline[2]),
      low: parseFloat(kline[3]),
      close: parseFloat(kline[4]),
      volume: parseFloat(kline[5]),
    }))

    return NextResponse.json({
      status: '0000',
      data: candles,
      source: 'binance',
    })
  } catch (error) {
    console.error('Binance candles API error:', error)
    return NextResponse.json(
      { 
        status: 'error', 
        message: 'Failed to fetch Binance candles',
        source: 'binance',
      },
      { status: 500 }
    )
  }
}

