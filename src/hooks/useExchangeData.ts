'use client'

import { useState, useEffect } from 'react'
import { BithumbTicker, MAJOR_COINS } from '@/lib/bithumb/types'
import { useBithumbWebSocket } from './useBithumbWebSocket'

export type Exchange = 'bithumb' | 'binance' | 'upbit'

interface UseExchangeDataOptions {
  initialExchange?: Exchange
  enableAutoRefresh?: boolean
  initialData?: Record<string, BithumbTicker>
}

export function useExchangeData(options: UseExchangeDataOptions = {}) {
  const {
    initialExchange = 'bithumb',
    enableAutoRefresh = true,
    initialData = {},
  } = options

  const [exchange, setExchange] = useState<Exchange>(initialExchange)
  const [useAutoRefresh, setUseAutoRefresh] = useState(enableAutoRefresh)
  const [manualData, setManualData] = useState<Record<string, BithumbTicker>>(initialData)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null)
  const [error, setError] = useState<string | null>(null)

  // 자동 갱신 훅 (빗썸만 지원)
  const { data: autoData, status, reconnect, setRefreshInterval } = useBithumbWebSocket({
    symbols: MAJOR_COINS.map((c) => c.symbol),
    enabled: useAutoRefresh && exchange === 'bithumb',
    refreshInterval: 5000,
    onError: (err) => {
      console.error('자동 갱신 오류:', err)
      setError(err.message)
    },
  })

  // 표시할 데이터 선택
  const displayData = 
    useAutoRefresh && exchange === 'bithumb' && Object.keys(autoData).length > 0 
      ? autoData 
      : manualData

  useEffect(() => {
    setLastUpdate(new Date())
  }, [])

  // 자동 갱신 데이터 변경 시 lastUpdate 갱신
  useEffect(() => {
    if (useAutoRefresh && Object.keys(autoData).length > 0) {
      setLastUpdate(new Date())
    }
  }, [autoData, useAutoRefresh])

  // 거래소 변경 시 데이터 새로고침
  useEffect(() => {
    handleRefresh()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [exchange])

  const handleRefresh = async () => {
    setIsRefreshing(true)
    setError(null)

    try {
      let apiEndpoint: string
      if (exchange === 'bithumb') {
        apiEndpoint = '/api/market/ticker'
      } else if (exchange === 'upbit') {
        apiEndpoint = '/api/upbit/ticker'
      } else {
        apiEndpoint = '/api/binance/ticker'
      }
      
      const response = await fetch(apiEndpoint)
      if (!response.ok) {
        throw new Error('서버에서 데이터를 불러올 수 없습니다')
      }
      const result = await response.json()
      setManualData(result.data)
      setLastUpdate(new Date())
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '시세 업데이트에 실패했습니다'
      console.error('시세 업데이트 실패:', err)
      setError(errorMessage)
    } finally {
      setIsRefreshing(false)
    }
  }

  const handleExchangeChange = (newExchange: Exchange) => {
    setExchange(newExchange)
    setUseAutoRefresh(newExchange === 'bithumb')
    setError(null)
  }

  const handleToggleAutoRefresh = () => {
    setUseAutoRefresh((prev) => !prev)
    setError(null)
  }

  const handleIntervalChange = (interval: number) => {
    setRefreshInterval(interval)
  }

  return {
    exchange,
    useAutoRefresh,
    displayData,
    isRefreshing,
    lastUpdate,
    error,
    status,
    handleExchangeChange,
    handleToggleAutoRefresh,
    handleRefresh,
    handleIntervalChange,
    reconnect,
  }
}

