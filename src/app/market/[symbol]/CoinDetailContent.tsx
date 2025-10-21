'use client'

import { useState, useEffect, useCallback } from 'react'
import { CoinDisplayInfo, Candle } from '@/lib/bithumb/types'
import type { TimeFrame, Period, Exchange } from '@/types/chart'
import TickerInfoSection from './TickerInfoSection'
import ChartControls from '@/components/common/ChartControls'
import CandlestickChart from './CandlestickChart'
import IndicatorSection from './IndicatorSection'

interface CoinDetailContentProps {
  coin: CoinDisplayInfo
}

export default function CoinDetailContent({ coin }: CoinDetailContentProps) {
  const [exchange, setExchange] = useState<Exchange>('bithumb')
  const [timeFrame, setTimeFrame] = useState<TimeFrame>('1h')
  const [period, setPeriod] = useState<Period>('1M')
  const [baseDate, setBaseDate] = useState<Date>(new Date())
  const [candles, setCandles] = useState<Candle[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  // 거래소별 API 제한
  const API_LIMITS = {
    bithumb: 200,   // 빗썸: endTime 미지원, 최근 데이터만
    upbit: 200,     // 업비트: 최대 200개
    binance: 1000,  // 바이낸스: 최대 1000개
  }

  // 거래소별 사용 가능한 기간 계산
  const getAvailablePeriods = useCallback((exchange: Exchange, timeFrame: TimeFrame): Period[] => {
    const limit = API_LIMITS[exchange]
    
    // 타임프레임별 시간(시간 단위)
    const timeFrameHours: Record<TimeFrame, number> = {
      '1m': 1 / 60,
      '5m': 5 / 60,
      '10m': 10 / 60,
      '30m': 0.5,
      '1h': 1,
      '2h': 2,
      '4h': 4,
      '1d': 24,
      '1w': 168,
    }
    
    // Bithumb은 항상 제한적
    if (exchange === 'bithumb') {
      const hours = limit * timeFrameHours[timeFrame]
      const days = hours / 24
      
      if (days < 7) return []
      if (days < 30) return ['1M']
      if (days < 90) return ['1M', '3M']
      return ['1M', '3M']
    }
    
    // Binance, Upbit은 다중 호출 가능하므로 모든 기간 지원
    return ['1M', '3M', '6M', '1Y', '2Y', '3Y']
  }, [])

  // 다중 호출로 캔들 데이터 가져오기
  const fetchMultipleCandles = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const baseDateTimestamp = new Date(baseDate).setHours(23, 59, 59, 999)
      const periodDays: Record<Period, number> = {
        '1M': 30,
        '3M': 90,
        '6M': 180,
        '1Y': 365,
        '2Y': 730,
        '3Y': 1095,
      }
      
      const days = periodDays[period]
      const startTimestamp = baseDateTimestamp - (days * 24 * 60 * 60 * 1000)
      
      // Bithumb은 다중 호출 불가능, 단일 호출
      if (exchange === 'bithumb') {
        const apiPath = 'market'
        const url = `/api/${apiPath}/candles/${coin.symbol}?timeFrame=${timeFrame}&limit=${API_LIMITS.bithumb}`
        const response = await fetch(url)
        
        if (!response.ok) throw new Error('데이터를 불러올 수 없습니다')
        
        const result = await response.json()
        if (!result.success) throw new Error(result.error || '데이터 조회 실패')
        
        setCandles(result.data.filter((c: Candle) => 
          c.timestamp >= startTimestamp && c.timestamp <= baseDateTimestamp
        ))
        return
      }
      
      // Binance, Upbit: 다중 호출
      const apiPath = exchange
      const limit = API_LIMITS[exchange]
      const allCandles: Candle[] = []
      let currentEndTime = baseDateTimestamp
      let iterations = 0
      const maxIterations = 20 // 최대 20회 호출
      
      while (allCandles.length < days * 24 && iterations < maxIterations) {
        const url = `/api/${apiPath}/candles/${coin.symbol}?timeFrame=${timeFrame}&limit=${limit}&endTime=${currentEndTime}`
        const response = await fetch(url)
        
        if (!response.ok) throw new Error('데이터를 불러올 수 없습니다')
        
        const result = await response.json()
        if (!result.success) throw new Error(result.error || '데이터 조회 실패')
        
        const newCandles: Candle[] = result.data
        
        if (newCandles.length === 0) break
        
        // 시작 시간보다 이전 데이터는 제외
        const validCandles = newCandles.filter((c: Candle) => c.timestamp >= startTimestamp)
        allCandles.unshift(...validCandles)
        
        // 가장 오래된 캔들의 timestamp를 다음 endTime으로
        const oldestTimestamp = newCandles[0]?.timestamp
        if (!oldestTimestamp || oldestTimestamp <= startTimestamp) break
        
        currentEndTime = oldestTimestamp - 1
        iterations++
      }
      
      // 중복 제거 및 정렬
      const uniqueCandles = Array.from(
        new Map(allCandles.map(c => [c.timestamp, c])).values()
      ).sort((a, b) => a.timestamp - b.timestamp)
      
      setCandles(uniqueCandles.filter(c => 
        c.timestamp >= startTimestamp && c.timestamp <= baseDateTimestamp
      ))
    } catch (err) {
      setError(err instanceof Error ? err : new Error('알 수 없는 오류'))
    } finally {
      setIsLoading(false)
    }
  }, [exchange, timeFrame, period, baseDate, coin.symbol])

  useEffect(() => {
    fetchMultipleCandles()
  }, [fetchMultipleCandles])

  return (
    <div className="space-y-6">
      {/* 시세 정보 섹션 */}
      <TickerInfoSection coin={coin} />

      {/* 차트 컨트롤 (거래소, 타임프레임 및 기간 선택) */}
      <ChartControls
        onExchangeChange={setExchange}
        onTimeFrameChange={setTimeFrame}
        onPeriodChange={setPeriod}
        onBaseDateChange={setBaseDate}
        showExchange={true}
        availablePeriods={getAvailablePeriods(exchange, timeFrame)}
        currentPeriod={period}
      />

      {/* 에러 표시 */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
          <p className="text-red-500">{error.message}</p>
        </div>
      )}

      {/* 캔들스틱 차트 */}
      <CandlestickChart
        data={candles}
        isLoading={isLoading}
        symbol={coin.symbol}
        exchange={exchange}
      />

      {/* 기술적 지표 */}
      {candles && candles.length > 0 && (
        <IndicatorSection candles={candles} />
      )}
    </div>
  )
}

