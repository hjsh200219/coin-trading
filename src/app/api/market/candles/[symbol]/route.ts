import { NextResponse } from 'next/server'
import type { TimeFrame, Candle } from '@/lib/bithumb/types'

// 빗썸 API 타임프레임 맵핑
const timeFrameMap: Record<TimeFrame, string> = {
  '1m': '1m',
  '5m': '5m',
  '10m': '10m',
  '30m': '30m',
  '1h': '1h',
  '2h': '12h', // 빗썸은 2시간봉 미지원, 12시간봉 사용
  '4h': '12h', // 빗썸은 4시간봉 미지원, 12시간봉 사용
  '1d': '24h',
  '1w': '24h', // 빗썸은 주봉 미지원, 일봉 사용
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ symbol: string }> }
) {
  try {
    const { searchParams } = new URL(request.url)
    const timeFrame = (searchParams.get('timeFrame') || '1h') as TimeFrame
    const limit = parseInt(searchParams.get('limit') || '200')
    const baseDate = searchParams.get('baseDate') // 기준 날짜 (YYYY-MM-DD)
    const endTime = searchParams.get('endTime') // 종료 시간 (밀리초 타임스탬프)

    const { symbol: symbolParam } = await params
    const symbol = symbolParam.toUpperCase()
    const interval = timeFrameMap[timeFrame]
    
    // 기준 날짜를 타임스탬프로 변환 (밀리초)
    let baseDateTimestamp: number
    if (endTime) {
      baseDateTimestamp = parseInt(endTime)
    } else if (baseDate) {
      baseDateTimestamp = new Date(baseDate + 'T23:59:59+09:00').getTime()
    } else {
      baseDateTimestamp = Date.now()
    }

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

    // 캔들 데이터 변환 및 기준 날짜 필터링
    const allCandles = result.data.map((item: any[]) => ({
      timestamp: item[0],
      open: parseFloat(item[1]),
      close: parseFloat(item[2]),
      high: parseFloat(item[3]),
      low: parseFloat(item[4]),
      volume: parseFloat(item[5]),
    }))

    const filteredCandles = allCandles.filter((candle: Candle) => candle.timestamp <= baseDateTimestamp)
    const candles = filteredCandles.slice(-limit)

    return NextResponse.json({
      success: true,
      data: candles,
      symbol,
      timeFrame,
      count: candles.length
    })
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다',
      },
      { status: 500 }
    )
  }
}

