'use client'

// 코인 목록 표시 컴포넌트

import { useState, useEffect } from 'react'
import { BithumbTicker, MAJOR_COINS } from '@/lib/bithumb/types'
import CoinCard from './CoinCard'
import Button from '@/components/ui/Button'
import { useBithumbWebSocket } from '@/hooks/useBithumbWebSocket'

type Exchange = 'bithumb' | 'binance' | 'upbit'

interface CoinListProps {
  initialData: Record<string, BithumbTicker>
}

export default function CoinList({ initialData }: CoinListProps) {
  const [exchange, setExchange] = useState<Exchange>('bithumb')
  const [useAutoRefresh, setUseAutoRefresh] = useState(true)
  const [manualData, setManualData] = useState(initialData)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null)
  const [error, setError] = useState<string | null>(null)

  // 자동 갱신 훅 (빗썸만 지원)
  const { data: autoData, status, reconnect, setRefreshInterval } = useBithumbWebSocket({
    symbols: MAJOR_COINS.map((c) => c.symbol),
    enabled: useAutoRefresh && exchange === 'bithumb',
    refreshInterval: 5000, // 5초
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
    setUseAutoRefresh(newExchange === 'bithumb') // 업비트, 바이낸스는 자동 갱신 비활성화
    setError(null)
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
      {/* 거래소 선택 */}
      <div className="mb-4 flex gap-2">
        <Button
          onClick={() => handleExchangeChange('bithumb')}
          variant={exchange === 'bithumb' ? 'primary' : 'outline'}
          size="sm"
        >
          빗썸 (Bithumb)
        </Button>
        <Button
          onClick={() => handleExchangeChange('upbit')}
          variant={exchange === 'upbit' ? 'primary' : 'outline'}
          size="sm"
        >
          업비트 (Upbit)
        </Button>
        <Button
          onClick={() => handleExchangeChange('binance')}
          variant={exchange === 'binance' ? 'primary' : 'outline'}
          size="sm"
        >
          바이낸스 (Binance)
        </Button>
      </div>

      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <div
                className={`w-2 h-2 rounded-full ${
                  status === 'connected' && exchange === 'bithumb'
                    ? 'bg-brand animate-pulse'
                    : status === 'error'
                      ? 'bg-red-500'
                      : 'bg-foreground/20'
                }`}
              />
              <span className={`text-sm font-medium ${getStatusColor()}`}>
                {exchange === 'binance' 
                  ? '수동 모드 (바이낸스)' 
                  : exchange === 'upbit'
                    ? '수동 모드 (업비트)'
                    : useAutoRefresh 
                      ? getStatusText() 
                      : '수동 모드'}
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
          {/* 갱신 간격 선택 또는 새로고침 버튼 영역 (고정 높이) */}
          <div className="min-w-[120px]">
            {useAutoRefresh && exchange === 'bithumb' ? (
              <select
                onChange={(e) => handleIntervalChange(Number(e.target.value))}
                defaultValue={5000}
                className="w-full h-[34px] px-3 py-1.5 text-sm bg-surface border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-brand"
              >
                <option value={1000}>1초</option>
                <option value={3000}>3초</option>
                <option value={5000}>5초</option>
                <option value={10000}>10초</option>
              </select>
            ) : (
              <Button onClick={handleRefresh} disabled={isRefreshing} variant="outline" size="sm" className="w-full h-[34px]">
                {isRefreshing ? '업데이트 중...' : '새로고침'}
              </Button>
            )}
          </div>

          {exchange === 'bithumb' && (
            <Button onClick={handleToggleAutoRefresh} variant="outline" size="sm">
              {useAutoRefresh ? '🔴 자동 갱신 OFF' : '🟢 자동 갱신 ON'}
            </Button>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2">
        {lastUpdate && (
            <p className="text-xs text-foreground/60">
              마지막 업데이트: {lastUpdate.toLocaleTimeString('ko-KR', { timeZone: 'Asia/Seoul' })} KST
            </p>
          )}
          {error && <p className="text-sm text-red-500 mt-1">{error}</p>}
      </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        {MAJOR_COINS.map((coin) => {
          const ticker = displayData[coin.symbol]
          if (!ticker) return null

          return <CoinCard key={coin.symbol} coin={coin} ticker={ticker} />
        })}
      </div>
    </div>
  )
}
