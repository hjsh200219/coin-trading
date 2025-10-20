import { NextResponse } from 'next/server'
import { getTickers } from '@/lib/upbit/api'
import { UPBIT_MAJOR_MARKETS } from '@/lib/upbit/types'
import { MAJOR_COINS } from '@/lib/bithumb/types'

/**
 * 업비트 → 빗썸 심볼 역매핑
 * 업비트의 POL을 빗썸의 MATIC으로 변환
 */
const UPBIT_TO_BITHUMB_SYMBOL: Record<string, string> = {
  POL: 'MATIC', // Polygon 리브랜딩
}

/**
 * 업비트 시세 정보 조회 API
 * GET /api/upbit/ticker
 * 
 * 빗썸 MAJOR_COINS에 해당하는 업비트 마켓의 시세 정보를 반환합니다.
 */
export async function GET() {
  try {
    const tickers = await getTickers(UPBIT_MAJOR_MARKETS)

    // 마켓 코드를 빗썸 심볼로 변환하여 키로 사용
    const tickerData = tickers.reduce(
      (acc, ticker) => {
        // KRW-POL -> POL -> MATIC
        const upbitSymbol = ticker.market.replace('KRW-', '')
        const bithumbSymbol = UPBIT_TO_BITHUMB_SYMBOL[upbitSymbol] || upbitSymbol
        acc[bithumbSymbol] = ticker
        return acc
      },
      {} as Record<string, typeof tickers[0]>
    )

    return NextResponse.json({
      success: true,
      data: tickerData,
    })
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : '업비트 시세 조회 중 오류가 발생했습니다',
      },
      { status: 500 }
    )
  }
}

