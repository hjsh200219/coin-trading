'use client'

// 코인 목록 표시 컴포넌트

import { useState, useEffect } from 'react'
import { BithumbTicker, MAJOR_COINS } from '@/lib/bithumb/types'
import CoinCard from './CoinCard'
import Button from '@/components/ui/Button'

interface CoinListProps {
  initialData: Record<string, BithumbTicker>
}

export default function CoinList({ initialData }: CoinListProps) {
  const [data, setData] = useState(initialData)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setLastUpdate(new Date())
  }, [])

  const handleRefresh = async () => {
    setIsRefreshing(true)
    setError(null)

    try {
      const response = await fetch('/api/market/ticker')
      if (!response.ok) {
        throw new Error('서버에서 데이터를 불러올 수 없습니다')
      }
      const result = await response.json()
      setData(result.data)
      setLastUpdate(new Date())
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '시세 업데이트에 실패했습니다'
      console.error('시세 업데이트 실패:', err)
      setError(errorMessage)
    } finally {
      setIsRefreshing(false)
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          {lastUpdate && (
            <p className="text-sm text-foreground/60">
              마지막 업데이트: {lastUpdate.toLocaleTimeString('ko-KR')}
            </p>
          )}
          {error && (
            <p className="text-sm text-red-500 mt-1">
              {error}
            </p>
          )}
        </div>
        <Button
          onClick={handleRefresh}
          disabled={isRefreshing}
          variant="outline"
          size="sm"
        >
          {isRefreshing ? '업데이트 중...' : '새로고침'}
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {MAJOR_COINS.map((coin) => {
          const ticker = data[coin.symbol]
          if (!ticker) return null

          return <CoinCard key={coin.symbol} coin={coin} ticker={ticker} />
        })}
      </div>
    </div>
  )
}
