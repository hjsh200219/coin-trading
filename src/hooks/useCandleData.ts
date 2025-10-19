import { useState, useEffect, useCallback } from 'react'
import type { Candle } from '@/lib/bithumb/types'
import type { TimeFrame, Exchange } from '@/types/chart'

interface UseCandleDataOptions {
  symbol: string
  timeFrame: TimeFrame
  exchange?: Exchange
  limit?: number
  enabled?: boolean
}

interface UseCandleDataReturn {
  data: Candle[]
  isLoading: boolean
  error: Error | null
  refetch: () => void
}

export function useCandleData({
  symbol,
  timeFrame,
  exchange = 'bithumb',
  limit = 200,
  enabled = true,
}: UseCandleDataOptions): UseCandleDataReturn {
  const [data, setData] = useState<Candle[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const fetchData = useCallback(async () => {
    if (!enabled) return

    try {
      setIsLoading(true)
      setError(null)

      // 거래소별 API 엔드포인트 선택
      const apiPath = exchange === 'bithumb' ? 'market' : exchange
      const url = `/api/${apiPath}/candles/${symbol}?timeFrame=${timeFrame}&limit=${limit}`
      const response = await fetch(url)

      if (!response.ok) {
        throw new Error('캔들 데이터를 불러올 수 없습니다')
      }

      const result = await response.json()

      if (!result.success) {
        throw new Error(result.error || '데이터 조회 실패')
      }

      setData(result.data)
    } catch (err) {
      console.error('캔들 데이터 조회 오류:', err)
      setError(err instanceof Error ? err : new Error('알 수 없는 오류'))
    } finally {
      setIsLoading(false)
    }
  }, [symbol, timeFrame, exchange, limit, enabled])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  return {
    data,
    isLoading,
    error,
    refetch: fetchData,
  }
}

