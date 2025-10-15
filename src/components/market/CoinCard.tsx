// 개별 코인 정보 카드 컴포넌트

import Link from 'next/link'
import { Card } from '@/components/ui/Card'
import StatCard from '@/components/ui/StatCard'
import { BithumbTicker, CoinDisplayInfo } from '@/lib/bithumb/types'
import type { BinanceTicker } from '@/lib/binance/types'
import type { UpbitTicker } from '@/lib/upbit/types'
import { formatPrice, formatRate } from '@/lib/utils/format'

interface CoinCardProps {
  coin: CoinDisplayInfo
  ticker?: BithumbTicker | BinanceTicker | UpbitTicker
  href?: string
}

/**
 * 티커가 Binance 형식인지 확인
 */
function isBinanceTicker(ticker: BithumbTicker | BinanceTicker | UpbitTicker): ticker is BinanceTicker {
  return 'lastPrice' in ticker
}

/**
 * 티커가 Upbit 형식인지 확인
 */
function isUpbitTicker(ticker: BithumbTicker | BinanceTicker | UpbitTicker): ticker is UpbitTicker {
  return 'trade_price' in ticker && 'market' in ticker
}

/**
 * 티커 데이터를 통합 형식으로 변환
 */
function normalizeTicker(ticker: BithumbTicker | BinanceTicker | UpbitTicker) {
  if (isBinanceTicker(ticker)) {
    return {
      price: ticker.lastPrice,
      changeRate: ticker.priceChangePercent,
      highPrice: ticker.highPrice,
      lowPrice: ticker.lowPrice,
      volume: ticker.volume,
    }
  }
  if (isUpbitTicker(ticker)) {
    return {
      price: String(ticker.trade_price),
      changeRate: String(ticker.signed_change_rate * 100), // 업비트는 소수로 오므로 100 곱하기
      highPrice: String(ticker.high_price),
      lowPrice: String(ticker.low_price),
      volume: String(ticker.acc_trade_volume_24h),
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
  const isUpbit = isUpbitTicker(ticker)
  const currencySymbol = isBinance ? '$' : '₩'

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
        <StatCard
          label="현재가"
          value={`${currencySymbol}${formatPrice(normalizedData.price)}`}
          size="lg"
        />

        <div className="grid grid-cols-2 gap-3">
          <StatCard
            label="24h 최고"
            value={`${currencySymbol}${formatPrice(normalizedData.highPrice)}`}
            valueColor="text-red-500"
            size="sm"
          />
          <StatCard
            label="24h 최저"
            value={`${currencySymbol}${formatPrice(normalizedData.lowPrice)}`}
            valueColor="text-blue-500"
            size="sm"
          />
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
