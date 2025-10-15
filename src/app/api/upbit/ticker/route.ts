import { NextResponse } from 'next/server'
import { getTickers } from '@/lib/upbit/api'
import { UPBIT_MAJOR_MARKETS } from '@/lib/upbit/types'

/**
 * 업비트 시세 정보 조회 API
 * GET /api/upbit/ticker
 * 
 * 빗썸 MAJOR_COINS에 해당하는 업비트 마켓의 시세 정보를 반환합니다.
 */
export async function GET() {
  try {
    const tickers = await getTickers(UPBIT_MAJOR_MARKETS)

    // 마켓 코드를 키로 하는 객체로 변환
    const tickerData = tickers.reduce(
      (acc, ticker) => {
        // KRW-BTC -> BTC
        const symbol = ticker.market.replace('KRW-', '')
        acc[symbol] = ticker
        return acc
      },
      {} as Record<string, typeof tickers[0]>
    )

    return NextResponse.json({
      success: true,
      data: tickerData,
    })
  } catch (error) {
    console.error('업비트 시세 조회 에러:', error)

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : '업비트 시세 조회 중 오류가 발생했습니다',
      },
      { status: 500 }
    )
  }
}

