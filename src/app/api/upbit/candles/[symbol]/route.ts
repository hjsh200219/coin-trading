import { NextResponse } from 'next/server'
import { getMinuteCandles, getDayCandles, convertToCommonCandles } from '@/lib/upbit/api'
import { getUpbitMarketCode } from '@/lib/upbit/types'

interface RouteParams {
  params: Promise<{
    symbol: string
  }>
}

/**
 * 업비트 캔들 데이터 조회 API
 * GET /api/upbit/candles/[symbol]?timeframe=1m&period=200
 * 
 * @param symbol 코인 심볼 (BTC, ETH 등)
 * @param timeframe 타임프레임 (1m, 3m, 5m, 15m, 30m, 1h, 4h, 1d)
 * @param period 조회할 캔들 개수 (기본값: 200, 최대: 200)
 */
export async function GET(request: Request, { params }: RouteParams) {
  try {
    const { symbol } = await params
    const { searchParams } = new URL(request.url)

    const timeframe = searchParams.get('timeframe') || '1d'
    const period = parseInt(searchParams.get('period') || '200', 10)

    // 최대 200개로 제한
    const count = Math.min(period, 200)

    const marketCode = getUpbitMarketCode(symbol)

    let candles

    // 타임프레임에 따라 적절한 API 호출
    switch (timeframe) {
      case '1m':
        candles = await getMinuteCandles(marketCode, 1, count)
        break
      case '3m':
        candles = await getMinuteCandles(marketCode, 3, count)
        break
      case '5m':
        candles = await getMinuteCandles(marketCode, 5, count)
        break
      case '15m':
        candles = await getMinuteCandles(marketCode, 15, count)
        break
      case '30m':
        candles = await getMinuteCandles(marketCode, 30, count)
        break
      case '1h':
        candles = await getMinuteCandles(marketCode, 60, count)
        break
      case '4h':
        candles = await getMinuteCandles(marketCode, 240, count)
        break
      case '1d':
        candles = await getDayCandles(marketCode, count)
        break
      default:
        return NextResponse.json(
          {
            success: false,
            error: '지원하지 않는 타임프레임입니다',
          },
          { status: 400 }
        )
    }

    // 공통 Candle 타입으로 변환
    const commonCandles = convertToCommonCandles(candles)

    return NextResponse.json({
      success: true,
      data: commonCandles,
    })
  } catch (error) {
    console.error('업비트 캔들 조회 에러:', error)

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : '업비트 캔들 조회 중 오류가 발생했습니다',
      },
      { status: 500 }
    )
  }
}

