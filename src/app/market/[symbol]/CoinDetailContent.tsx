'use client'

import { useState, useEffect, useCallback } from 'react'
import { CoinDisplayInfo, Candle } from '@/lib/bithumb/types'
import type { TimeFrame, Period, Exchange } from '@/types/chart'
import TickerInfoSection from './TickerInfoSection'
import ChartControls from '@/components/common/ChartControls'
import CandlestickChart from './CandlestickChart'
import IndicatorSection from './IndicatorSection'
import { fetchMultipleCandles, getAvailablePeriods, PERIOD_DAYS } from '@/lib/api/candleApi'

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

  // 다중 호출로 캔들 데이터 가져오기
  const fetchData = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const endTimestamp = new Date(baseDate).setHours(23, 59, 59, 999)
      const days = PERIOD_DAYS[period]
      const startTimestamp = endTimestamp - (days * 24 * 60 * 60 * 1000)

      const result = await fetchMultipleCandles({
        symbol: coin.symbol,
        exchange,
        timeFrame,
        startTimestamp,
        endTimestamp,
      })

      setCandles(result)
    } catch (err) {
      setError(err instanceof Error ? err : new Error('알 수 없는 오류'))
    } finally {
      setIsLoading(false)
    }
  }, [exchange, timeFrame, period, baseDate, coin.symbol])

  useEffect(() => {
    fetchData()
  }, [fetchData])

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

