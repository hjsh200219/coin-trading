// 개별 코인 정보 카드 컴포넌트

import Link from 'next/link'
import { Card } from '@/components/ui/Card'
import { BithumbTicker, CoinDisplayInfo } from '@/lib/bithumb/types'
import type { BinanceTicker } from '@/lib/binance/types'

interface CoinCardProps {
  coin: CoinDisplayInfo
  ticker?: BithumbTicker | BinanceTicker
  href?: string
}

/**
 * 숫자를 천 단위 콤마로 포맷팅
 */
function formatPrice(price: string): string {
  const num = parseFloat(price)
  return num.toLocaleString('ko-KR', {
    maximumFractionDigits: 0,
  })
}

/**
 * 변동률 포맷팅
 */
function formatRate(rate: string): string {
  const num = parseFloat(rate)
  return num >= 0 ? `+${num.toFixed(2)}%` : `${num.toFixed(2)}%`
}

/**
 * 티커가 Binance 형식인지 확인
 */
function isBinanceTicker(ticker: BithumbTicker | BinanceTicker): ticker is BinanceTicker {
  return 'lastPrice' in ticker
}

/**
 * 티커 데이터를 통합 형식으로 변환
 */
function normalizeTicker(ticker: BithumbTicker | BinanceTicker) {
  if (isBinanceTicker(ticker)) {
    return {
      price: ticker.lastPrice,
      changeRate: ticker.priceChangePercent,
      highPrice: ticker.highPrice,
      lowPrice: ticker.lowPrice,
      volume: ticker.volume,
    }
  }
  return {
    price: ticker.closing_price,
    changeRate: ticker.fluctate_rate_24H,
    highPrice: ticker.max_price,
    lowPrice: ticker.min_price,
    volume: ticker.units_traded_24H,
  }
}

export default function CoinCard({ coin, ticker, href }: CoinCardProps) {
  const linkHref = href || `/market/${coin.symbol}`
  
  // ticker가 없으면 간단한 버전 렌더링
  if (!ticker) {
    return (
      <Link href={linkHref}>
        <Card className="p-4 hover:border-brand/30 transition-all duration-200 cursor-pointer">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <div
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: coin.color }}
                />
                <h3 className="text-lg font-bold text-foreground">{coin.name}</h3>
              </div>
              <p className="text-sm text-foreground/60">{coin.symbol}</p>
            </div>
          </div>
        </Card>
      </Link>
    )
  }

  const normalizedData = normalizeTicker(ticker)
  const changeRate = parseFloat(normalizedData.changeRate)
  const isPositive = changeRate >= 0
  const isBinance = isBinanceTicker(ticker)

  return (
    <Link href={linkHref}>
      <Card className="p-4 hover:border-brand/30 transition-all duration-200 cursor-pointer">
      <div className="flex items-start justify-between mb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: coin.color }}
            />
            <h3 className="text-lg font-bold text-foreground">{coin.name}</h3>
          </div>
          <p className="text-sm text-foreground/60">{coin.symbol}</p>
        </div>
        <div
          className={`px-2 py-1 rounded text-sm font-semibold ${
            isPositive
              ? 'bg-red-500/10 text-red-500'
              : 'bg-blue-500/10 text-blue-500'
          }`}
        >
          {formatRate(normalizedData.changeRate)}
        </div>
      </div>

      <div className="space-y-3">
        <div>
          <p className="text-xs text-foreground/60 mb-1">현재가</p>
          <p className="text-2xl font-bold text-foreground">
            {isBinance ? '$' : '₩'}{formatPrice(normalizedData.price)}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <p className="text-xs text-foreground/60 mb-1">24h 최고</p>
            <p className="text-sm font-semibold text-red-500">
              {isBinance ? '$' : '₩'}{formatPrice(normalizedData.highPrice)}
            </p>
          </div>
          <div>
            <p className="text-xs text-foreground/60 mb-1">24h 최저</p>
            <p className="text-sm font-semibold text-blue-500">
              {isBinance ? '$' : '₩'}{formatPrice(normalizedData.lowPrice)}
            </p>
          </div>
        </div>

        <div className="pt-3 border-t border-border">
          <div className="flex justify-between text-xs">
            <span className="text-foreground/60">거래량 (24h)</span>
            <span className="font-medium text-foreground">
              {parseFloat(normalizedData.volume).toFixed(2)} {coin.symbol}
            </span>
          </div>
        </div>
      </div>
    </Card>
    </Link>
  )
}
