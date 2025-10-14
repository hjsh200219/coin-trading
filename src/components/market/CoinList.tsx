'use client'

// 코인 목록 표시 컴포넌트

import { useState, useEffect } from 'react'
import { BithumbTicker, MAJOR_COINS } from '@/lib/bithumb/types'
import CoinCard from './CoinCard'
import Button from '@/components/ui/Button'
import { useBithumbWebSocket } from '@/hooks/useBithumbWebSocket'

interface CoinListProps {
  initialData: Record<string, BithumbTicker>
}

export default function CoinList({ initialData }: CoinListProps) {
  const [useAutoRefresh, setUseAutoRefresh] = useState(true)
  const [manualData, setManualData] = useState(initialData)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null)
  const [error, setError] = useState<string | null>(null)

  // 자동 갱신 훅
  const { data: autoData, status, reconnect, setRefreshInterval } = useBithumbWebSocket({
    symbols: MAJOR_COINS.map((c) => c.symbol),
    enabled: useAutoRefresh,
    refreshInterval: 5000, // 5초
    onError: (err) => {
      console.error('자동 갱신 오류:', err)
      setError(err.message)
    },
  })

  // 표시할 데이터 선택
  const displayData = useAutoRefresh && Object.keys(autoData).length > 0 ? autoData : manualData

  useEffect(() => {
    setLastUpdate(new Date())
  }, [])

  // 자동 갱신 데이터 변경 시 lastUpdate 갱신
  useEffect(() => {
    if (useAutoRefresh && Object.keys(autoData).length > 0) {
      setLastUpdate(new Date())
    }
  }, [autoData, useAutoRefresh])

  const handleRefresh = async () => {
    setIsRefreshing(true)
    setError(null)

    try {
      const response = await fetch('/api/market/ticker')
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

  const handleToggleAutoRefresh = () => {
    setUseAutoRefresh((prev) => !prev)
    setError(null)
  }

  const handleIntervalChange = (interval: number) => {
    setRefreshInterval(interval)
  }

  // 연결 상태 텍스트
  const getStatusText = () => {
    switch (status) {
      case 'connecting':
        return '연결 중...'
      case 'connected':
        return '자동 갱신 중'
      case 'disconnected':
        return '일시 중지'
      case 'error':
        return '오류 발생'
      default:
        return ''
    }
  }

  // 연결 상태 색상
  const getStatusColor = () => {
    switch (status) {
      case 'connecting':
        return 'text-yellow-500'
      case 'connected':
        return 'text-brand'
      case 'disconnected':
        return 'text-foreground/40'
      case 'error':
        return 'text-red-500'
      default:
        return ''
    }
  }

  return (
    <div>
      <div className="mb-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <div
                className={`w-2 h-2 rounded-full ${
                  status === 'connected'
                    ? 'bg-brand animate-pulse'
                    : status === 'error'
                      ? 'bg-red-500'
                      : 'bg-foreground/20'
                }`}
              />
              <span className={`text-sm font-medium ${getStatusColor()}`}>
                {useAutoRefresh ? getStatusText() : '수동 모드'}
              </span>
            </div>

            {useAutoRefresh && status === 'error' && (
              <Button onClick={reconnect} variant="ghost" size="sm">
                재연결
              </Button>
            )}
          </div>

        </div>

        <div className="flex gap-2 items-center">
          {useAutoRefresh && (
            <select
              onChange={(e) => handleIntervalChange(Number(e.target.value))}
              defaultValue={5000}
              className="px-3 py-1.5 text-sm bg-surface border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-brand"
            >
              <option value={1000}>1초</option>
              <option value={3000}>3초</option>
              <option value={5000}>5초</option>
              <option value={10000}>10초</option>
            </select>
          )}

          {!useAutoRefresh && (
            <Button onClick={handleRefresh} disabled={isRefreshing} variant="outline" size="sm">
              {isRefreshing ? '업데이트 중...' : '새로고침'}
            </Button>
          )}

          <Button onClick={handleToggleAutoRefresh} variant="outline" size="sm">
            {useAutoRefresh ? '🔴 자동 갱신 OFF' : '🟢 자동 갱신 ON'}
          </Button>


        </div>
      </div>
      <div className="flex items-center gap-2">
        {lastUpdate && (
            <p className="text-xs text-foreground/60">
              마지막 업데이트: {lastUpdate.toLocaleTimeString('ko-KR')}
            </p>
          )}
          {error && <p className="text-sm text-red-500 mt-1">{error}</p>}
      </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {MAJOR_COINS.map((coin) => {
          const ticker = displayData[coin.symbol]
          if (!ticker) return null

          return <CoinCard key={coin.symbol} coin={coin} ticker={ticker} />
        })}
      </div>
    </div>
  )
}
