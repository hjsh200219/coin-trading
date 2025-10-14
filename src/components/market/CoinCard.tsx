// 개별 코인 정보 카드 컴포넌트

import { Card } from '@/components/ui/Card'
import { BithumbTicker, CoinDisplayInfo } from '@/lib/bithumb/types'

interface CoinCardProps {
  coin: CoinDisplayInfo
  ticker: BithumbTicker
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

export default function CoinCard({ coin, ticker }: CoinCardProps) {
  const currentPrice = parseFloat(ticker.closing_price)
  const prevPrice = parseFloat(ticker.prev_closing_price)
  const changeRate = parseFloat(ticker.fluctate_rate_24H)
  const isPositive = changeRate >= 0

  return (
    <Card className="p-4 hover:border-brand/30 transition-all duration-200">
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
          {formatRate(ticker.fluctate_rate_24H)}
        </div>
      </div>

      <div className="space-y-3">
        <div>
          <p className="text-xs text-foreground/60 mb-1">현재가</p>
          <p className="text-2xl font-bold text-foreground">
            ₩{formatPrice(ticker.closing_price)}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <p className="text-xs text-foreground/60 mb-1">24h 최고</p>
            <p className="text-sm font-semibold text-red-500">
              ₩{formatPrice(ticker.max_price)}
            </p>
          </div>
          <div>
            <p className="text-xs text-foreground/60 mb-1">24h 최저</p>
            <p className="text-sm font-semibold text-blue-500">
              ₩{formatPrice(ticker.min_price)}
            </p>
          </div>
        </div>

        <div className="pt-3 border-t border-border">
          <div className="flex justify-between text-xs">
            <span className="text-foreground/60">거래량 (24h)</span>
            <span className="font-medium text-foreground">
              {parseFloat(ticker.units_traded_24H).toFixed(2)} {coin.symbol}
            </span>
          </div>
        </div>
      </div>
    </Card>
  )
}
