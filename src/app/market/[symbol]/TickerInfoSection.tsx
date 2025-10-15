'use client'

import { useEffect, useState, useCallback } from 'react'
import { Card } from '@/components/ui/Card'
import { BithumbTicker, CoinDisplayInfo } from '@/lib/bithumb/types'

interface TickerInfoSectionProps {
  coin: CoinDisplayInfo
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
 * 변동가 포맷팅
 */
function formatChange(change: string, isPositive: boolean): string {
  const num = parseFloat(change)
  const formatted = num.toLocaleString('ko-KR', { maximumFractionDigits: 0 })
  return isPositive ? `▲ ₩${formatted}` : `▼ ₩${Math.abs(num).toLocaleString('ko-KR', { maximumFractionDigits: 0 })}`
}

export default function TickerInfoSection({ coin }: TickerInfoSectionProps) {
  const [ticker, setTicker] = useState<BithumbTicker | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date())
  const [showDetails, setShowDetails] = useState(false)
  const [autoRefresh, setAutoRefresh] = useState(false)

  const fetchTicker = useCallback(async () => {
    try {
      setIsLoading(true)
      const response = await fetch('/api/market/ticker')
      if (!response.ok) {
        throw new Error('시세 정보를 불러올 수 없습니다')
      }
      const result = await response.json()
      setTicker(result.data[coin.symbol])
      setLastUpdate(new Date())
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다')
    } finally {
      setIsLoading(false)
    }
  }, [coin.symbol])

  useEffect(() => {
    fetchTicker()
  }, [fetchTicker])

  useEffect(() => {
    if (!autoRefresh) return

    const interval = setInterval(fetchTicker, 5000)
    return () => clearInterval(interval)
  }, [autoRefresh, fetchTicker])

  if (isLoading) {
    return (
      <Card className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-surface-75 rounded w-1/3"></div>
          <div className="h-12 bg-surface-75 rounded w-1/2"></div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="h-16 bg-surface-75 rounded"></div>
            ))}
          </div>
        </div>
      </Card>
    )
  }

  if (error || !ticker) {
    return (
      <Card className="p-6">
        <p className="text-red-500">{error || '시세 정보를 불러올 수 없습니다'}</p>
      </Card>
    )
  }

  const changeRate = parseFloat(ticker.fluctate_rate_24H)
  const isPositive = changeRate >= 0

  return (
    <Card className="p-6">
      <div className="space-y-6">
        {/* 현재가 및 변동률 */}
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-bold text-foreground">
              ₩{formatPrice(ticker.closing_price)}
            </h2>
            <div
              className={`text-base font-medium ${
                isPositive ? 'text-red-500' : 'text-blue-500'
              }`}
            >
              {formatChange(ticker.fluctate_24H, isPositive)} ({formatRate(ticker.fluctate_rate_24H)})
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={`px-2.5 py-1 text-xs rounded transition ${
                autoRefresh
                  ? 'bg-brand text-background'
                  : 'bg-surface border border-border text-foreground/60'
              }`}
            >
              {autoRefresh ? '자동 갱신 ON' : '자동 갱신 OFF'}
            </button>
            {!autoRefresh && (
              <button
                onClick={() => fetchTicker()}
                className="px-2.5 py-1 text-xs rounded bg-surface border border-border text-foreground/60 hover:text-brand transition"
              >
                새로고침
              </button>
            )}
            <button
              onClick={() => setShowDetails(!showDetails)}
              className="text-xs text-foreground/60 hover:text-brand transition whitespace-nowrap"
            >
              {showDetails ? '상세 정보 숨김 ▲' : '상세 정보 보기 ▼'}
            </button>
          </div>
        </div>

        {/* 주요 지표 그리드 */}
        {showDetails && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {/* 24시간 최고가 */}
          <div className="space-y-1">
            <p className="text-xs text-foreground/60">24h 최고</p>
            <p className="text-lg font-semibold text-red-500">
              ₩{formatPrice(ticker.max_price)}
            </p>
          </div>

          {/* 24시간 최저가 */}
          <div className="space-y-1">
            <p className="text-xs text-foreground/60">24h 최저</p>
            <p className="text-lg font-semibold text-blue-500">
              ₩{formatPrice(ticker.min_price)}
            </p>
          </div>

          {/* 24시간 거래량 */}
          <div className="space-y-1">
            <p className="text-xs text-foreground/60">24h 거래량</p>
            <p className="text-lg font-semibold text-foreground">
              {parseFloat(ticker.units_traded_24H).toLocaleString('ko-KR', {
                maximumFractionDigits: 2,
              })}{' '}
              {coin.symbol}
            </p>
          </div>

          {/* 24시간 거래대금 */}
          <div className="space-y-1">
            <p className="text-xs text-foreground/60">24h 거래대금</p>
            <p className="text-lg font-semibold text-foreground">
              ₩{formatPrice(ticker.acc_trade_value_24H)}
            </p>
          </div>

          {/* 시가 */}
          <div className="space-y-1">
            <p className="text-xs text-foreground/60">시가 (00:00)</p>
            <p className="text-base font-medium text-foreground">
              ₩{formatPrice(ticker.opening_price)}
            </p>
          </div>

          {/* 전일 종가 */}
          <div className="space-y-1">
            <p className="text-xs text-foreground/60">전일 종가</p>
            <p className="text-base font-medium text-foreground">
              ₩{formatPrice(ticker.prev_closing_price)}
            </p>
          </div>

          {/* 거래량 (00:00 기준) */}
          <div className="space-y-1">
            <p className="text-xs text-foreground/60">거래량 (00:00)</p>
            <p className="text-base font-medium text-foreground">
              {parseFloat(ticker.units_traded).toLocaleString('ko-KR', {
                maximumFractionDigits: 2,
              })}{' '}
              {coin.symbol}
            </p>
          </div>

          {/* 거래대금 (00:00 기준) */}
          <div className="space-y-1">
            <p className="text-xs text-foreground/60">거래대금 (00:00)</p>
            <p className="text-base font-medium text-foreground">
              ₩{formatPrice(ticker.acc_trade_value)}
            </p>
          </div>
        </div>
        )}

        {/* 업데이트 시간 */}
        <div className="pt-4 border-t border-border">
          <p className="text-xs text-foreground/60">
            마지막 업데이트: {lastUpdate.toLocaleString('ko-KR', {
              year: 'numeric',
              month: '2-digit',
              day: '2-digit',
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit',
            })}
          </p>
        </div>
      </div>
    </Card>
  )
}

