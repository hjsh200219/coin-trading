import { NextResponse } from 'next/server'
import { getAllTickers } from '@/lib/binance/api'
import { MAJOR_COINS } from '@/lib/bithumb/types'
import { toBinanceSymbol, fromBinanceSymbol } from '@/lib/binance/types'

export async function GET() {
  try {
    const allTickers = await getAllTickers()
    
    // MAJOR_COINS에 해당하는 티커만 필터링
    const majorCoinSymbols = MAJOR_COINS.map(coin => toBinanceSymbol(coin.symbol))
    const filteredTickers = allTickers.filter(ticker => 
      majorCoinSymbols.includes(ticker.symbol)
    )

    // 응답 포맷을 symbol을 key로 하는 객체로 변환
    const data: Record<string, typeof filteredTickers[0]> = {}
    filteredTickers.forEach(ticker => {
      const coinSymbol = fromBinanceSymbol(ticker.symbol)
      data[coinSymbol] = ticker
    })

    return NextResponse.json({
      status: '0000',
      data,
      source: 'binance',
    })
  } catch (error) {
    return NextResponse.json(
      { 
        status: 'error', 
        message: 'Failed to fetch Binance data',
        source: 'binance',
      },
      { status: 500 }
    )
  }
}

