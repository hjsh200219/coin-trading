'use client'

import Button from '@/components/ui/Button'
import type { Exchange } from '@/hooks/useExchangeData'

interface ExchangeSelectorProps {
  exchange: Exchange
  useAutoRefresh: boolean
  isRefreshing: boolean
  lastUpdate: Date | null
  error: string | null
  status?: 'connecting' | 'connected' | 'disconnected' | 'error'
  onExchangeChange: (exchange: Exchange) => void
  onToggleAutoRefresh: () => void
  onRefresh: () => void
  onIntervalChange: (interval: number) => void
  onReconnect?: () => void
}

export default function ExchangeSelector({
  exchange,
  useAutoRefresh,
  isRefreshing,
  lastUpdate,
  error,
  status = 'disconnected',
  onExchangeChange,
  onToggleAutoRefresh,
  onRefresh,
  onIntervalChange,
  onReconnect,
}: ExchangeSelectorProps) {
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
    <div className="mb-6">
      {/* 거래소 선택 */}
      <div className="mb-4 flex gap-2">
        <Button
          onClick={() => onExchangeChange('bithumb')}
          variant={exchange === 'bithumb' ? 'primary' : 'outline'}
          size="sm"
        >
          빗썸 (Bithumb)
        </Button>
        <Button
          onClick={() => onExchangeChange('upbit')}
          variant={exchange === 'upbit' ? 'primary' : 'outline'}
          size="sm"
        >
          업비트 (Upbit)
        </Button>
        <Button
          onClick={() => onExchangeChange('binance')}
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

            {useAutoRefresh && status === 'error' && onReconnect && (
              <Button onClick={onReconnect} variant="ghost" size="sm">
                재연결
              </Button>
            )}
          </div>
        </div>

        <div className="flex gap-2 items-center">
          {/* 갱신 간격 선택 또는 새로고침 버튼 영역 */}
          <div className="min-w-[120px]">
            {useAutoRefresh && exchange === 'bithumb' ? (
              <select
                onChange={(e) => onIntervalChange(Number(e.target.value))}
                defaultValue={5000}
                className="w-full h-[34px] px-3 py-1.5 text-sm bg-surface border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-brand"
              >
                <option value={1000}>1초</option>
                <option value={3000}>3초</option>
                <option value={5000}>5초</option>
                <option value={10000}>10초</option>
              </select>
            ) : (
              <Button 
                onClick={onRefresh} 
                disabled={isRefreshing} 
                variant="outline" 
                size="sm" 
                className="w-full h-[34px]"
              >
                {isRefreshing ? '업데이트 중...' : '새로고침'}
              </Button>
            )}
          </div>

          {exchange === 'bithumb' && (
            <Button onClick={onToggleAutoRefresh} variant="outline" size="sm">
              {useAutoRefresh ? '🔴 자동 갱신 OFF' : '🟢 자동 갱신 ON'}
            </Button>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 mt-2">
        {lastUpdate && (
          <p className="text-xs text-foreground/60">
            마지막 업데이트: {lastUpdate.toLocaleTimeString('ko-KR', { timeZone: 'Asia/Seoul' })} KST
          </p>
        )}
        {error && <p className="text-sm text-red-500">{error}</p>}
      </div>
    </div>
  )
}

