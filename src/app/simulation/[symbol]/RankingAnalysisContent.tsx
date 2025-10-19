'use client'

import { useState } from 'react'
import { RankingControls, RankingResultTable } from '@/components/common'
import type { TimeFrame, Period, RankingDataPoint, Exchange, IndicatorConfig } from '@/types/chart'
import { calculateRankingValues, calculateRequiredCandles } from '@/lib/utils/ranking'
import type { Candle } from '@/lib/bithumb/types'

interface RankingAnalysisContentProps {
  symbol: string
}

export default function RankingAnalysisContent({ symbol }: RankingAnalysisContentProps) {
  const [exchange, setExchange] = useState<Exchange>('bithumb')
  const [period, setPeriod] = useState<Period>('3M')
  const [timeFrame, setTimeFrame] = useState<TimeFrame>('1h')
  const [baseDate, setBaseDate] = useState<string>(new Date().toISOString().split('T')[0])
  const [indicators, setIndicators] = useState<IndicatorConfig>({
    macd: true,
    rsi: true,
    ao: true,
    disparity: true,
    rti: true,
  })
  const [rankingData, setRankingData] = useState<RankingDataPoint[]>([])
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleIndicatorToggle = (indicator: keyof IndicatorConfig) => {
    setIndicators((prev) => ({
      ...prev,
      [indicator]: !prev[indicator],
    }))
  }

  const handleAnalyze = async () => {
    setIsAnalyzing(true)
    setError(null)

    try {
      // 필요한 캔들 개수 계산 (기준 날짜 고려하여 충분한 데이터 요청)
      const requiredCandles = calculateRequiredCandles(period, timeFrame)

      // 거래소별 API 엔드포인트 선택
      const apiPath = exchange === 'bithumb' ? 'market' : exchange
      const url = `/api/${apiPath}/candles/${symbol}?timeFrame=${timeFrame}&limit=${requiredCandles}`
      
      const response = await fetch(url)

      if (!response.ok) {
        throw new Error('캔들 데이터를 불러올 수 없습니다')
      }

      const result = await response.json()

      if (!result.success) {
        throw new Error(result.error || '데이터 조회 실패')
      }

      const candles: Candle[] = result.data

      if (candles.length === 0) {
        throw new Error('데이터가 없습니다')
      }

      // 선택된 지표가 하나도 없으면 에러
      const hasActiveIndicator = Object.values(indicators).some((v) => v)
      if (!hasActiveIndicator) {
        throw new Error('최소 하나의 지표를 선택해야 합니다.')
      }

      // 기준 날짜 객체 생성 (23:59:59로 설정하여 해당 날짜 포함)
      const baseDateObj = new Date(baseDate)
      baseDateObj.setHours(23, 59, 59, 999)

      // 랭킹 값 계산 (지표 설정, 기준 날짜와 분석 기간 전달)
      const rankings = calculateRankingValues(candles, indicators, baseDateObj, period)

      if (rankings.length === 0) {
        throw new Error(
          '랭킹 계산에 실패했습니다. 선택한 기간에 충분한 데이터가 없거나 지표 계산을 위한 데이터가 부족합니다.'
        )
      }

      setRankingData(rankings)
    } catch (err) {
      console.error('Ranking Value 오류:', err)
      setError(err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다')
    } finally {
      setIsAnalyzing(false)
    }
  }

  return (
    <div className="space-y-4">
      {/* 분석 설정 */}
      <RankingControls
        exchange={exchange}
        period={period}
        timeFrame={timeFrame}
        baseDate={baseDate}
        indicators={indicators}
        onExchangeChange={setExchange}
        onPeriodChange={setPeriod}
        onTimeFrameChange={setTimeFrame}
        onBaseDateChange={setBaseDate}
        onIndicatorToggle={handleIndicatorToggle}
        onAnalyze={handleAnalyze}
        isAnalyzing={isAnalyzing}
      />

      {/* 에러 메시지 */}
      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
          <p className="text-red-500 text-sm">{error}</p>
        </div>
      )}

      {/* Ranking Value Calculation */}
      {!isAnalyzing && rankingData.length > 0 && (
        <div>
          <div className="mb-3 flex items-center justify-between flex-wrap gap-2">
            <h3 className="text-lg font-semibold text-foreground">Ranking Value Calculation</h3>
            <div className="text-sm text-foreground/60">
              기준: <span className="text-foreground font-medium">{baseDate}</span> / 기간:{' '}
              <span className="text-foreground font-medium">{period}</span> / 단위:{' '}
              <span className="text-foreground font-medium">{timeFrame}</span>
            </div>
          </div>
          <RankingResultTable data={rankingData} symbol={symbol} />
        </div>
      )}

      {/* 초기 안내 메시지 */}
      {!isAnalyzing && rankingData.length === 0 && !error && (
        <div className="p-6 text-center border border-border rounded-lg bg-surface">
          <p className="text-foreground/60 text-sm">
            조회 조건을 선택하고 &quot;분석 시작&quot; 버튼을 클릭하세요
          </p>
        </div>
      )}

      {/* 로딩 상태 */}
      {isAnalyzing && (
        <div className="p-8 text-center border border-border rounded-lg bg-surface">
          <div className="flex items-center justify-center gap-3">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-brand"></div>
            <p className="text-foreground/80">데이터를 분석하고 있습니다...</p>
          </div>
        </div>
      )}
    </div>
  )
}

