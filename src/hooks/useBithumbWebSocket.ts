// 빗썸 실시간 시세 훅 (Polling 기반)
// 참고: 빗썸은 공식 WebSocket API를 제공하지 않아 Polling 방식 사용

import { useEffect, useRef, useState } from 'react'
import { BithumbTicker } from '@/lib/bithumb/types'

export type ConnectionStatus = 'connecting' | 'connected' | 'disconnected' | 'error'

interface UseBithumbWebSocketOptions {
  symbols?: string[] // 구독할 코인 심볼 (예: ['BTC', 'ETH'])
  enabled?: boolean // 자동 갱신 활성화 여부
  onError?: (error: Error) => void
  refreshInterval?: number // 갱신 간격 (ms)
}

interface UseBithumbWebSocketReturn {
  data: Record<string, BithumbTicker>
  status: ConnectionStatus
  reconnect: () => void
  disconnect: () => void
  setRefreshInterval: (interval: number) => void
}

export function useBithumbWebSocket(
  options: UseBithumbWebSocketOptions = {}
): UseBithumbWebSocketReturn {
  const {
    symbols = ['BTC', 'ETH', 'XRP', 'ADA', 'SOL', 'DOGE', 'TRX', 'MATIC', 'DOT', 'AVAX'],
    enabled = true,
    onError,
    refreshInterval: initialRefreshInterval = 5000, // 기본 5초
  } = options

  const [data, setData] = useState<Record<string, BithumbTicker>>({})
  const [status, setStatus] = useState<ConnectionStatus>('disconnected')
  const [refreshInterval, setRefreshInterval] = useState(initialRefreshInterval)

  const intervalRef = useRef<NodeJS.Timeout>()
  const mountedRef = useRef(true)

  // 시세 데이터 가져오기
  const fetchTicker = async () => {
    if (!mountedRef.current) return

    try {
      const response = await fetch('/api/market/ticker')

      if (!response.ok) {
        throw new Error(`API 요청 실패: ${response.status}`)
      }

      const result = await response.json()

      if (result.data && mountedRef.current) {
        // symbols에 해당하는 데이터만 필터링
        const filteredData: Record<string, BithumbTicker> = {}
        symbols.forEach((symbol) => {
          if (result.data[symbol]) {
            filteredData[symbol] = result.data[symbol]
          }
        })

        setData(filteredData)
        setStatus('connected')
      }
    } catch (error) {
      if (mountedRef.current) {
        console.error('❌ 시세 조회 오류:', error)
        setStatus('error')
        onError?.(error instanceof Error ? error : new Error('시세 조회 실패'))
      }
    }
  }

  // Polling 시작
  const startPolling = () => {
    // 기존 interval 정리
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
    }

    setStatus('connecting')

    // 즉시 첫 호출
    fetchTicker()

    // 주기적 호출 설정
    intervalRef.current = setInterval(() => {
      fetchTicker()
    }, refreshInterval)
  }

  // Polling 중지
  const stopPolling = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = undefined
    }
    setStatus('disconnected')
  }

  // 수동 재연결
  const reconnect = () => {
    stopPolling()
    if (enabled) {
      startPolling()
    }
  }

  // enabled 변경 시 시작/중지
  useEffect(() => {
    if (enabled) {
      startPolling()
    } else {
      stopPolling()
    }

    // cleanup
    return () => {
      stopPolling()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled])

  // refreshInterval 변경 시 재시작
  useEffect(() => {
    if (enabled && intervalRef.current) {
      startPolling()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshInterval])

  // unmount 시 cleanup
  useEffect(() => {
    return () => {
      mountedRef.current = false
      stopPolling()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return {
    data,
    status,
    reconnect,
    disconnect: stopPolling,
    setRefreshInterval,
  }
}
