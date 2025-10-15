import { NextResponse } from 'next/server'
import type { TimeFrame, Candle } from '@/lib/bithumb/types'

// 빗썸 API 타임프레임 맵핑
const timeFrameMap: Record<TimeFrame, string> = {
  '30m': '30m',
  '1h': '1h',
  '2h': '12h', // 빗썸은 2시간봉 미지원, 12시간봉 사용
  '4h': '12h', // 빗썸은 4시간봉 미지원, 12시간봉 사용
  '1d': '24h',
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ symbol: string }> }
) {
  try {
    const { searchParams } = new URL(request.url)
    const timeFrame = (searchParams.get('timeFrame') || '1h') as TimeFrame
    const limit = parseInt(searchParams.get('limit') || '200')

    const { symbol: symbolParam } = await params
    const symbol = symbolParam.toUpperCase()
    const interval = timeFrameMap[timeFrame]

    // 빗썸 캔들 API 호출
    const url = `https://api.bithumb.com/public/candlestick/${symbol}_KRW/${interval}`
    
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      throw new Error(`빗썸 API 오류: ${response.status}`)
    }

    const result = await response.json()

    if (result.status !== '0000') {
      throw new Error('빗썸 API에서 데이터를 가져올 수 없습니다')
    }

    // 캔들 데이터 변환
    // slice(-limit): 마지막 N개 (최신 데이터)를 가져옴
    const candles: Candle[] = result.data
      .slice(-limit) // 최신 500개 선택
      .map((item: any[]) => ({
        timestamp: item[0],
        open: parseFloat(item[1]),
        close: parseFloat(item[2]),
        high: parseFloat(item[3]),
        low: parseFloat(item[4]),
        volume: parseFloat(item[5]),
      }))
      // 빗썸 API는 오래된 것부터 반환하므로 reverse 불필요

    return NextResponse.json({
      success: true,
      data: candles,
      symbol,
      timeFrame,
      count: candles.length,
    })
  } catch (error) {
    console.error('캔들 데이터 조회 오류:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다',
      },
      { status: 500 }
    )
  }
}

