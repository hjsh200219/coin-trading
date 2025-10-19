'use client'

import { useState } from 'react'
import { CoinDisplayInfo } from '@/lib/bithumb/types'
import type { TimeFrame, Period, Exchange } from '@/types/chart'
import TickerInfoSection from './TickerInfoSection'
import ChartControls from '@/components/common/ChartControls'
import CandlestickChart from './CandlestickChart'
import IndicatorSection from './IndicatorSection'
import { useCandleData } from '@/hooks/useCandleData'

interface CoinDetailContentProps {
  coin: CoinDisplayInfo
}

export default function CoinDetailContent({ coin }: CoinDetailContentProps) {
  const [exchange, setExchange] = useState<Exchange>('bithumb')
  const [timeFrame, setTimeFrame] = useState<TimeFrame>('1h')
  const [period, setPeriod] = useState<Period>('1M')
  const [baseDate, setBaseDate] = useState<Date>(new Date())

  // 기간에 따른 캔들 개수 계산
  const getLimitByPeriod = (period: Period): number => {
    const periodMap: Record<Period, number> = {
      '1M': 30 * 24,   // 1개월
      '3M': 90 * 24,   // 3개월
      '6M': 180 * 24,  // 6개월
      '1Y': 365 * 24,  // 1년
      '2Y': 730 * 24,  // 2년
      '3Y': 1095 * 24, // 3년
    }
    
    // 타임프레임에 따라 조정
    const multiplier = timeFrame === '1d' ? 1 : timeFrame === '4h' ? 6 : timeFrame === '2h' ? 12 : timeFrame === '1h' ? 24 : 48
    return Math.min(periodMap[period] * multiplier / 24, 500) // 최대 500개로 제한
  }

  const { data: rawCandles, isLoading, error } = useCandleData({
    symbol: coin.symbol,
    timeFrame,
    exchange,
    limit: getLimitByPeriod(period),
    enabled: true,
  })

  // 기준 날짜와 기간에 따라 캔들 데이터 필터링
  const candles = (() => {
    const now = new Date()
    
    // 기준 날짜가 현재보다 미래인 경우, 필터링하지 않고 모든 데이터 반환
    if (baseDate.getTime() > now.getTime()) {
      return rawCandles
    }
    
    return rawCandles.filter((candle) => {
      const candleDate = new Date(candle.timestamp)
      
      // 기준 날짜의 끝 시간 (23:59:59)으로 설정하여 해당 날짜의 모든 데이터 포함
      const endDate = new Date(baseDate)
      endDate.setHours(23, 59, 59, 999)
      
      // 기준 날짜(당일 포함) 이후의 데이터 제외
      if (candleDate.getTime() > endDate.getTime()) {
        return false
      }
      
      // 기간에 따른 시작 날짜 계산
      const periodDays: Record<Period, number> = {
        '1M': 30,
        '3M': 90,
        '6M': 180,
        '1Y': 365,
        '2Y': 730,
        '3Y': 1095,
      }
      
      const startDate = new Date(baseDate)
      startDate.setDate(startDate.getDate() - periodDays[period])
      startDate.setHours(0, 0, 0, 0)
      
      // 시작 날짜와 기준 날짜 사이의 데이터만 포함
      return candleDate.getTime() >= startDate.getTime()
    })
  })()

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
      />

      {/* 기술적 지표 */}
      {candles && candles.length > 0 && (
        <IndicatorSection candles={candles} />
      )}
    </div>
  )
}

