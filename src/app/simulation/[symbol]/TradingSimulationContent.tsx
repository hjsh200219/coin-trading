'use client'

import { useState, useRef, useEffect } from 'react'
import { Card } from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import { AnalysisSettings } from '@/components/common'
import type { GridSimulationResult } from '@/lib/simulation/tradingSimulation'
import type { TimeFrame, Period, Exchange, IndicatorConfig } from '@/types/chart'
import { calculateRequiredCandles } from '@/lib/utils/ranking'
import type { Candle } from '@/lib/bithumb/types'
import { formatChartTime } from '@/lib/utils/format'

interface TradingSimulationContentProps {
  symbol: string
}

interface TradeDetail {
  timestamp: number
  rankingValue: number
  decision: 'buy' | 'sell' | 'hold'
  price: number
  cumulativeReturn: number
  holdReturn: number
}

export default function TradingSimulationContent({
  symbol
}: TradingSimulationContentProps) {
  // 분석 설정 (시뮬레이션은 빗썸 제외, 기본값: Binance)
  const [exchange, setExchange] = useState<Exchange>('binance')
  const [period, setPeriod] = useState<Period>('3M')
  const [timeFrame, setTimeFrame] = useState<TimeFrame>('2h')
  const [baseDate, setBaseDate] = useState<string>(new Date().toISOString().split('T')[0])
  const [indicators, setIndicators] = useState<IndicatorConfig>({
    macd: true,
    rsi: true,
    ao: true,
    DP: true,
    rti: true,
  })
  
  // Trading Simulation 설정
  const [buyConditionCount, setBuyConditionCount] = useState(3)
  const [sellConditionCount, setSellConditionCount] = useState(3)
  const [buyThresholdMin, setBuyThresholdMin] = useState(0.0)
  const [buyThresholdMax, setBuyThresholdMax] = useState(1.0)
  const [sellThresholdMin, setSellThresholdMin] = useState(0.0)
  const [sellThresholdMax, setSellThresholdMax] = useState(1.0)
  const [isSimulating, setIsSimulating] = useState(false)
  const [progress, setProgress] = useState(0)
  const [results, setResults] = useState<GridSimulationResult[][] | null>(null)
  const [buyThresholds, setBuyThresholds] = useState<number[]>([])
  const [sellThresholds, setSellThresholds] = useState<number[]>([])
  const [minReturn, setMinReturn] = useState(0)
  const [maxReturn, setMaxReturn] = useState(0)
  const [using5Min, setUsing5Min] = useState<boolean | null>(null)
  const [progressMessage, setProgressMessage] = useState<string>('')
  const [decimalPlaces, setDecimalPlaces] = useState<2 | 3>(2) // 임계값 소수점 자릿수 (기본값: 2)
  const [initialPosition, setInitialPosition] = useState<'cash' | 'coin'>('cash') // 초기 포지션 (기본값: 현금)
  
  // 상세 내역 모달
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false)
  const [selectedDetail, setSelectedDetail] = useState<{
    buyThreshold: number
    sellThreshold: number
    details: TradeDetail[]
  } | null>(null)
  const [detailsCache, setDetailsCache] = useState<Map<string, TradeDetail[]>>(new Map())
  
  // 모달 로딩 상태
  const [isDetailLoading, setIsDetailLoading] = useState(false)
  const [detailLoadingProgress, setDetailLoadingProgress] = useState(0)
  const [detailLoadingMessage, setDetailLoadingMessage] = useState('')
  
  // 모달 필터 옵션 (기본값: 매수/매도만 보기)
  const [showAllTrades, setShowAllTrades] = useState(false)
  
  // Web Worker 참조
  const workerRef = useRef<Worker | null>(null)
  const cancelRef = useRef(false)

  // ESC 키로 모달 닫기 및 필터 초기화
  useEffect(() => {
    if (!isDetailModalOpen) {
      // 모달이 닫힐 때 필터 초기화
      setShowAllTrades(false)
      return
    }

    const handleEscKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsDetailModalOpen(false)
      }
    }

    window.addEventListener('keydown', handleEscKey)
    return () => window.removeEventListener('keydown', handleEscKey)
  }, [isDetailModalOpen])

  // Worker 메시지 핸들러 설정
  const setupWorkerHandlers = (worker: Worker) => {
    worker.onmessage = (e) => {
      const { type, progress, message, results, buyThresholds: workerBuyThresholds, sellThresholds: workerSellThresholds, error } = e.data
      
      switch (type) {
        case 'PROGRESS':
          setProgress(progress)
          setProgressMessage(message || '')
          break
          
        case 'COMPLETE':
          // 시뮬레이션 완료
          if (results && results.length > 0) {
            let min = Infinity
            let max = -Infinity
            
            results.forEach((row: GridSimulationResult[]) => {
              row.forEach((cell) => {
                if (cell.totalReturn < min) min = cell.totalReturn
                if (cell.totalReturn > max) max = cell.totalReturn
              })
            })
            
            setMinReturn(min)
            setMaxReturn(max)
            setResults(results)
            
            // 임계값 배열 업데이트
            if (workerBuyThresholds && workerSellThresholds) {
              setBuyThresholds(workerBuyThresholds)
              setSellThresholds(workerSellThresholds)
            }
          }
          setIsSimulating(false)
          setProgress(100)
          setProgressMessage('완료!')
          break
          
        case 'ERROR':
          console.error('Worker error:', error)
          alert(error || '시뮬레이션 중 오류가 발생했습니다.')
          setIsSimulating(false)
          break
      }
    }
    
    worker.onerror = (error) => {
      console.error('Worker error:', error)
      alert('시뮬레이션 중 오류가 발생했습니다.')
      setIsSimulating(false)
    }
  }

  // Worker 초기화 및 정리
  useEffect(() => {
    // Worker 생성
    workerRef.current = new Worker('/simulation-worker.js')
    setupWorkerHandlers(workerRef.current)
    
    // 컴포넌트 언마운트 시 Worker 종료
    return () => {
      if (workerRef.current) {
        workerRef.current.terminate()
      }
    }
  }, [])

  const handleIndicatorToggle = (indicator: keyof IndicatorConfig) => {
    setIndicators((prev) => ({
      ...prev,
      [indicator]: !prev[indicator],
    }))
  }

  /**
   * 수익률을 천단위 콤마가 있는 정수로 포맷
   */
  const formatReturn = (value: number): string => {
    const rounded = Math.round(value)
    return rounded.toLocaleString('en-US')
  }

  /**
   * 5분봉 데이터를 여러 번 호출하여 전체 기간 데이터 수집
   */
  const fetchMultiple5MinCandles = async (
    requiredCount: number,
    baseDateTimestamp: number,
    onProgress?: (current: number, total: number) => void
  ): Promise<Candle[]> => {
    const allCandles: Candle[] = []
    
    // 거래소별 API 제한
    const batchSize = exchange === 'binance' ? 1000 : 200  // Binance: 1000, Bithumb/Upbit: 200
    const totalBatches = Math.ceil(requiredCount / batchSize)
    let currentEndTime = baseDateTimestamp
    
    const apiPrefix = exchange === 'bithumb' ? 'market' : exchange

    for (let batchIndex = 0; batchIndex < totalBatches && allCandles.length < requiredCount; batchIndex++) {
      try {
        const url = `/api/${apiPrefix}/candles/${symbol}?timeFrame=5m&limit=${batchSize}&endTime=${currentEndTime}`
        
        const response = await fetch(url)
        if (!response.ok) {
          break
        }

        const result = await response.json()
        
        if (!result.success || !result.data || result.data.length === 0) {
          break
        }

        // 중복 제거하며 데이터 추가
        const newCandles = result.data.filter(
          (candle: Candle) => !allCandles.some(c => c.timestamp === candle.timestamp)
        )
        
        allCandles.push(...newCandles)

        // 다음 배치를 위한 endTime 업데이트 (가장 오래된 캔들 - 1ms)
        if (result.data.length > 0) {
          const oldestCandle = result.data.reduce((oldest: Candle, current: Candle) => 
            current.timestamp < oldest.timestamp ? current : oldest
          )
          currentEndTime = oldestCandle.timestamp - 1
        }

        // 진행률 보고
        if (onProgress) {
          onProgress(batchIndex + 1, totalBatches)
        }

        // Rate Limit 방지 (100ms 딜레이)
        if (batchIndex < totalBatches - 1) {
          await new Promise(resolve => setTimeout(resolve, 100))
        }

      } catch (error) {
        break
      }
    }

    // 시간순 정렬 (오래된 것부터)
    const sortedCandles = allCandles.sort((a, b) => a.timestamp - b.timestamp)
    
    return sortedCandles
  }

  const handleSimulate = async () => {
    // 매수 임계값 범위 검증
    if (buyThresholdMin >= buyThresholdMax) {
      alert('매수 최소 임계값은 최대 임계값보다 작아야 합니다.')
      return
    }

    if (buyThresholdMin < 0.0 || buyThresholdMax > 1.0) {
      alert('매수 임계값 범위는 0.0 ~ 1.0 사이여야 합니다.')
      return
    }

    // 소수점 3자리일 때 최대 구간 0.2로 제한
    if (decimalPlaces === 3 && (buyThresholdMax - buyThresholdMin) > 0.2) {
      alert('소수점 3자리 분석 시 매수 임계값 구간은 최대 0.2 범위로 제한됩니다.')
      return
    }

    // 매도 임계값 범위 검증
    if (sellThresholdMin >= sellThresholdMax) {
      alert('매도 최소 임계값은 최대 임계값보다 작아야 합니다.')
      return
    }

    if (sellThresholdMin < 0.0 || sellThresholdMax > 1.0) {
      alert('매도 임계값 범위는 0.0 ~ 1.0 사이여야 합니다.')
      return
    }

    // 소수점 3자리일 때 최대 구간 0.2로 제한
    if (decimalPlaces === 3 && (sellThresholdMax - sellThresholdMin) > 0.2) {
      alert('소수점 3자리 분석 시 매도 임계값 구간은 최대 0.2 범위로 제한됩니다.')
      return
    }

    setIsSimulating(true)
    setProgress(0)
    setProgressMessage('데이터 로드 중...')
    cancelRef.current = false
    
    try {
      // 1. 선택한 timeFrame의 캔들 데이터 로드
      const requiredCandles = calculateRequiredCandles(period, timeFrame)
      const apiPath = exchange === 'bithumb' ? 'market' : exchange
      
      // baseDate 파라미터 추가
      const url = `/api/${apiPath}/candles/${symbol}?timeFrame=${timeFrame}&limit=${requiredCandles}&baseDate=${baseDate}`

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

      // 2. 5분봉 데이터 로드 (다중 호출)
      setProgressMessage('5분봉 데이터 로드 중...')
      const required5MinCandles = requiredCandles * 24 // 2시간 = 24 × 5분
      const baseDateTimestamp = new Date(baseDate + 'T23:59:59+09:00').getTime()
      
      const fiveMinCandles = await fetchMultiple5MinCandles(
        required5MinCandles,
        baseDateTimestamp,
        (current, total) => {
          const progress = (current / total) * 50 // 0-50% 진행률
          setProgress(progress)
          setProgressMessage(`5분봉 데이터 로드 중... (${current}/${total})`)
        }
      )

      // 3. 간단한 객체로 변환 (Worker에 전달용)
      const mainCandles = candles.map(c => ({
        timestamp: c.timestamp,
        open: c.open,
        high: c.high,
        low: c.low,
        close: c.close
      }))

      const fiveMinCandleData = fiveMinCandles.map(c => ({
        timestamp: c.timestamp,
        open: c.open,
        high: c.high,
        low: c.low,
        close: c.close
      }))

      const is5MinAvailable = fiveMinCandleData.length > 0
      setUsing5Min(is5MinAvailable)

      // 4. Web Worker에 시뮬레이션 작업 전달 ⚡
      if (workerRef.current) {
        workerRef.current.postMessage({
          type: 'START_SIMULATION',
          data: {
            mainCandles,
            fiveMinCandles: fiveMinCandleData.length > 0 ? fiveMinCandleData : mainCandles,
            buyConditionCount,
            sellConditionCount,
            buyThresholdMin,
            buyThresholdMax,
            sellThresholdMin,
            sellThresholdMax,
            indicators, // 지표 설정 추가 ✨
            decimalPlaces, // 소수점 자릿수 추가 ✨
            initialPosition // 초기 포지션 추가 ✨
          }
        })
      } else {
        throw new Error('Worker가 초기화되지 않았습니다.')
      }
      
    } catch (error) {
      console.error('Simulation error:', error)
      alert(error instanceof Error ? error.message : '시뮬레이션 중 오류가 발생했습니다.')
      setIsSimulating(false)
    }
  }

  const handleCancel = () => {
    cancelRef.current = true
    if (workerRef.current) {
      workerRef.current.terminate()
      // 새로운 Worker 재생성
      workerRef.current = new Worker('/simulation-worker.js')
      setupWorkerHandlers(workerRef.current)
    }
    setIsSimulating(false)
    setProgress(0)
    setProgressMessage('')
  }

  /**
   * 수익률에 따른 배경색 및 텍스트 색상 계산
   * 낮은 수익: 진한 파란색, 중간: 흰색, 높은 수익: 진한 빨간색
   */
  const getCellColors = (returnValue: number): { background: string; text: string } => {
    if (minReturn === maxReturn) {
      return { 
        background: 'rgba(200, 200, 200, 0.3)',
        text: '#ffffff'
      }
    }
    
    // 0.0 (최저) ~ 1.0 (최고)
    const normalized = (returnValue - minReturn) / (maxReturn - minReturn)
    
    let r: number, g: number, b: number
    
    if (normalized < 0.5) {
      // 진한 파란색 -> 흰색 (0.0 ~ 0.5)
      const ratio = normalized * 2 // 0.0 -> 1.0
      r = Math.round(0 + (255 - 0) * ratio)
      g = Math.round(0 + (255 - 0) * ratio)
      b = 255 // 파란색 유지
    } else {
      // 흰색 -> 진한 빨간색 (0.5 ~ 1.0)
      const ratio = (normalized - 0.5) * 2 // 0.0 -> 1.0
      r = 255 // 빨간색 유지
      g = Math.round(255 - (255 - 0) * ratio)
      b = Math.round(255 - (255 - 0) * ratio)
    }
    
    // 명도 계산 (0-255): 밝기 기준
    const luminance = 0.299 * r + 0.587 * g + 0.114 * b
    
    // 밝은 배경(명도 > 128)에는 검은 텍스트, 어두운 배경에는 흰 텍스트
    const textColor = luminance > 128 ? '#000000' : '#ffffff'
    
    return {
      background: `rgb(${r}, ${g}, ${b})`,
      text: textColor
    }
  }

  /**
   * 셀 클릭 시 상세 내역 표시
   */
  const handleCellClick = async (buyThreshold: number, sellThreshold: number) => {
    const cacheKey = `${buyThreshold}-${sellThreshold}`
    
    // 캐시에 있으면 바로 표시
    if (detailsCache.has(cacheKey)) {
      setSelectedDetail({
        buyThreshold,
        sellThreshold,
        details: detailsCache.get(cacheKey)!
      })
      setIsDetailModalOpen(true)
      return
    }

    // Worker에 상세 내역 요청
    if (!workerRef.current) {
      alert('시뮬레이션이 준비되지 않았습니다.')
      return
    }

    // 로딩 시작
    setIsDetailLoading(true)
    setDetailLoadingProgress(0)
    setDetailLoadingMessage('데이터 로드 준비 중...')

    // 일회성 메시지 핸들러 설정
    const handleDetailMessage = (e: MessageEvent) => {
      const { type, details, error } = e.data

      if (type === 'DETAIL_COMPLETE') {
        // 캐시에 저장
        const newCache = new Map(detailsCache)
        newCache.set(cacheKey, details)
        setDetailsCache(newCache)

        // 모달 표시
        setSelectedDetail({
          buyThreshold,
          sellThreshold,
          details
        })
        setIsDetailModalOpen(true)
        setIsDetailLoading(false)

        // 핸들러 제거
        workerRef.current?.removeEventListener('message', handleDetailMessage)
      } else if (type === 'ERROR') {
        alert(`상세 내역 생성 중 오류가 발생했습니다: ${error}`)
        setIsDetailLoading(false)
        workerRef.current?.removeEventListener('message', handleDetailMessage)
      }
    }

    workerRef.current.addEventListener('message', handleDetailMessage)

    // 거래소별 API 경로 설정
    const apiPrefix = exchange === 'bithumb' ? 'market' : exchange

    // 필요한 캔들 개수 계산 (handleSimulate와 동일하게)
    const requiredCandles = calculateRequiredCandles(period, timeFrame)
    const required5MinCandles = requiredCandles * 24
    const baseDateTimestamp = new Date(baseDate + 'T23:59:59+09:00').getTime()

    try {
      // 메인 캔들 가져오기
      setDetailLoadingMessage('메인 캔들 데이터 로드 중...')
      setDetailLoadingProgress(10)
      
      const mainCandlesUrl = `/api/${apiPrefix}/candles/${symbol}?timeFrame=${timeFrame}&limit=${requiredCandles}&baseDate=${baseDate}`
      const mainRes = await fetch(mainCandlesUrl)
      
      if (!mainRes.ok) {
        throw new Error(`API 오류: ${mainRes.status}`)
      }

      const mainResult = await mainRes.json()
      if (!mainResult.success || !mainResult.data) {
        throw new Error('메인 캔들 데이터를 불러올 수 없습니다.')
      }

      const mainCandles = mainResult.data.map((c: Candle) => ({
        timestamp: c.timestamp,
        open: c.open,
        high: c.high,
        low: c.low,
        close: c.close
      }))

      // 5분봉 데이터 다중 호출로 가져오기
      setDetailLoadingMessage('5분봉 데이터 로드 중...')
      const fiveMinCandles = await fetchMultiple5MinCandles(
        required5MinCandles,
        baseDateTimestamp,
        (current, total) => {
          // 10% ~ 80% 진행률 (데이터 로딩)
          const progress = 10 + (current / total) * 70
          setDetailLoadingProgress(progress)
          setDetailLoadingMessage(`5분봉 데이터 로드 중... (${current}/${total})`)
        }
      )

      setDetailLoadingMessage('상세 내역 생성 중...')
      setDetailLoadingProgress(85)

      // Worker에 메시지 전송
      workerRef.current.postMessage({
        type: 'GET_DETAIL',
        data: {
          mainCandles,
          fiveMinCandles: fiveMinCandles.length > 0 ? fiveMinCandles : mainCandles,
          buyConditionCount,
          sellConditionCount,
          buyThreshold,
          sellThreshold,
          indicators,
          initialPosition
        }
      })
    } catch (error) {
      alert('데이터를 불러오는 중 오류가 발생했습니다.')
      console.error(error)
      setIsDetailLoading(false)
      workerRef.current.removeEventListener('message', handleDetailMessage)
    }
  }

  // buyThresholds와 sellThresholds는 Worker 결과에서 state로 관리됨

  return (
    <div className="space-y-4">
      {/* 분석 및 시뮬레이션 설정 */}
      <Card className="p-3">
        <div className="grid md:grid-cols-[1fr,auto] gap-3">
          {/* 왼쪽 영역: 조회 설정 */}
          <div className="space-y-3">
            {/* 1~2행: 공통 분석 설정 */}
            <AnalysisSettings
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
              disabledExchanges={['bithumb']}
            />

            {/* 3행: 시뮬레이션 설정 */}
            <div className="space-y-2 md:space-y-0">
              {/* 모바일: 매수 조건 */}
              <div className="md:hidden flex items-center gap-1.5">
                <span className="text-xs font-medium text-foreground/70 whitespace-nowrap">매수 조건</span>
                <input
                  type="number"
                  value={buyConditionCount}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setBuyConditionCount(Number(e.target.value))}
                  min={1}
                  max={10}
                  className="px-2 py-0.5 bg-surface border border-border rounded text-foreground focus:outline-none focus:ring-1 focus:ring-brand text-xs h-7 w-16 text-center"
                />
              </div>

              {/* 모바일: 매수 임계값 범위 */}
              <div className="md:hidden flex items-center gap-1.5">
                <span className="text-xs font-medium text-foreground/70 whitespace-nowrap">매수 임계값</span>
                <input
                  type="number"
                  value={buyThresholdMin}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setBuyThresholdMin(Number(e.target.value))}
                  min={0.0}
                  max={1.0}
                  step={0.1}
                  className="px-2 py-0.5 bg-surface border border-border rounded text-foreground focus:outline-none focus:ring-1 focus:ring-brand text-xs h-7 w-16 text-center"
                />
                <span className="text-xs text-foreground/50">~</span>
                <input
                  type="number"
                  value={buyThresholdMax}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setBuyThresholdMax(Number(e.target.value))}
                  min={0.0}
                  max={1.0}
                  step={0.1}
                  className="px-2 py-0.5 bg-surface border border-border rounded text-foreground focus:outline-none focus:ring-1 focus:ring-brand text-xs h-7 w-16 text-center"
                />
              </div>

              {/* 모바일: 매도 조건 */}
              <div className="md:hidden flex items-center gap-1.5">
                <span className="text-xs font-medium text-foreground/70 whitespace-nowrap">매도 조건</span>
                <input
                  type="number"
                  value={sellConditionCount}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSellConditionCount(Number(e.target.value))}
                  min={1}
                  max={10}
                  className="px-2 py-0.5 bg-surface border border-border rounded text-foreground focus:outline-none focus:ring-1 focus:ring-brand text-xs h-7 w-16 text-center"
                />
              </div>

              {/* 모바일: 매도 임계값 범위 */}
              <div className="md:hidden flex items-center gap-1.5">
                <span className="text-xs font-medium text-foreground/70 whitespace-nowrap">매도 임계값</span>
                <input
                  type="number"
                  value={sellThresholdMin}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSellThresholdMin(Number(e.target.value))}
                  min={0.0}
                  max={1.0}
                  step={0.1}
                  className="px-2 py-0.5 bg-surface border border-border rounded text-foreground focus:outline-none focus:ring-1 focus:ring-brand text-xs h-7 w-16 text-center"
                />
                <span className="text-xs text-foreground/50">~</span>
                <input
                  type="number"
                  value={sellThresholdMax}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSellThresholdMax(Number(e.target.value))}
                  min={0.0}
                  max={1.0}
                  step={0.1}
                  className="px-2 py-0.5 bg-surface border border-border rounded text-foreground focus:outline-none focus:ring-1 focus:ring-brand text-xs h-7 w-16 text-center"
                />
              </div>

              {/* 모바일: 초기 포지션 */}
              <div className="md:hidden flex items-center gap-2 text-xs">
                <span className="font-medium text-foreground/70 whitespace-nowrap">초기 포지션</span>
                <div className="flex gap-1">
                  <button
                    onClick={() => setInitialPosition('cash')}
                    className={`px-3 py-1 rounded transition ${
                      initialPosition === 'cash'
                        ? 'bg-brand text-background font-medium'
                        : 'bg-surface-75 text-foreground/70 hover:bg-surface-100'
                    }`}
                  >
                    현금
                  </button>
                  <button
                    onClick={() => setInitialPosition('coin')}
                    className={`px-3 py-1 rounded transition ${
                      initialPosition === 'coin'
                        ? 'bg-brand text-background font-medium'
                        : 'bg-surface-75 text-foreground/70 hover:bg-surface-100'
                    }`}
                  >
                    코인
                  </button>
                </div>
              </div>

              {/* 모바일: 임계값 표시 */}
              <div className="md:hidden space-y-1">
                <div className="flex items-center gap-2 text-xs">
                  <span className="font-medium text-foreground/70 whitespace-nowrap">임계값 표시</span>
                  <div className="flex gap-1">
                    <button
                      onClick={() => setDecimalPlaces(2)}
                      className={`px-3 py-1 rounded transition ${
                        decimalPlaces === 2
                          ? 'bg-brand text-background font-medium'
                          : 'bg-surface-75 text-foreground/70 hover:bg-surface-100'
                      }`}
                    >
                      소수점 2자리
                    </button>
                    <button
                      onClick={() => setDecimalPlaces(3)}
                      className={`px-3 py-1 rounded transition ${
                        decimalPlaces === 3
                          ? 'bg-brand text-background font-medium'
                          : 'bg-surface-75 text-foreground/70 hover:bg-surface-100'
                      }`}
                    >
                      소수점 3자리
                    </button>
                  </div>
                </div>
                {decimalPlaces === 3 && (
                  <p className="text-[10px] text-foreground/50 pl-1">
                    * 소수점 3자리는 최대 0.2 구간으로 제한됩니다
                  </p>
                )}
              </div>

              {/* 데스크톱: 한 줄로 표시 */}
              <div className="hidden md:flex items-center gap-5 flex-wrap">
                {/* 매수 조건 */}
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-medium text-foreground/70 whitespace-nowrap">매수 조건</span>
                  <input
                    type="number"
                    value={buyConditionCount}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setBuyConditionCount(Number(e.target.value))}
                    min={1}
                    max={10}
                    className="px-2 py-0.5 bg-surface border border-border rounded text-foreground focus:outline-none focus:ring-1 focus:ring-brand text-xs h-7 w-16 text-center"
                  />
                </div>

                {/* 구분선 */}
                <div className="w-px h-6 bg-border" />

                {/* 매수 임계값 범위 */}
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-medium text-foreground/70 whitespace-nowrap">매수 임계값</span>
                  <input
                    type="number"
                    value={buyThresholdMin}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setBuyThresholdMin(Number(e.target.value))}
                    min={0.0}
                    max={1.0}
                    step={0.1}
                    className="px-2 py-0.5 bg-surface border border-border rounded text-foreground focus:outline-none focus:ring-1 focus:ring-brand text-xs h-7 w-16 text-center"
                  />
                  <span className="text-xs text-foreground/50">~</span>
                  <input
                    type="number"
                    value={buyThresholdMax}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setBuyThresholdMax(Number(e.target.value))}
                    min={0.0}
                    max={1.0}
                    step={0.1}
                    className="px-2 py-0.5 bg-surface border border-border rounded text-foreground focus:outline-none focus:ring-1 focus:ring-brand text-xs h-7 w-16 text-center"
                  />
                </div>

                {/* 구분선 */}
                <div className="w-px h-6 bg-border" />

                {/* 매도 조건 */}
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-medium text-foreground/70 whitespace-nowrap">매도 조건</span>
                  <input
                    type="number"
                    value={sellConditionCount}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSellConditionCount(Number(e.target.value))}
                    min={1}
                    max={10}
                    className="px-2 py-0.5 bg-surface border border-border rounded text-foreground focus:outline-none focus:ring-1 focus:ring-brand text-xs h-7 w-16 text-center"
                  />
                </div>

                {/* 구분선 */}
                <div className="w-px h-6 bg-border" />

                {/* 매도 임계값 범위 */}
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-medium text-foreground/70 whitespace-nowrap">매도 임계값</span>
                  <input
                    type="number"
                    value={sellThresholdMin}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSellThresholdMin(Number(e.target.value))}
                    min={0.0}
                    max={1.0}
                    step={0.1}
                    className="px-2 py-0.5 bg-surface border border-border rounded text-foreground focus:outline-none focus:ring-1 focus:ring-brand text-xs h-7 w-16 text-center"
                  />
                  <span className="text-xs text-foreground/50">~</span>
                  <input
                    type="number"
                    value={sellThresholdMax}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSellThresholdMax(Number(e.target.value))}
                    min={0.0}
                    max={1.0}
                    step={0.1}
                    className="px-2 py-0.5 bg-surface border border-border rounded text-foreground focus:outline-none focus:ring-1 focus:ring-brand text-xs h-7 w-16 text-center"
                  />
                </div>

                {/* 구분선 */}
                <div className="w-px h-6 bg-border" />

                {/* 초기 포지션 */}
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-medium text-foreground/70 whitespace-nowrap">초기 포지션</span>
                  <div className="flex gap-1">
                    <button
                      onClick={() => setInitialPosition('cash')}
                      className={`px-2 py-1 rounded transition text-xs ${
                        initialPosition === 'cash'
                          ? 'bg-brand text-background font-medium'
                          : 'bg-surface-75 text-foreground/70 hover:bg-surface-100'
                      }`}
                    >
                      현금
                    </button>
                    <button
                      onClick={() => setInitialPosition('coin')}
                      className={`px-2 py-1 rounded transition text-xs ${
                        initialPosition === 'coin'
                          ? 'bg-brand text-background font-medium'
                          : 'bg-surface-75 text-foreground/70 hover:bg-surface-100'
                      }`}
                    >
                      코인
                    </button>
                  </div>
                </div>

                {/* 구분선 */}
                <div className="w-px h-6 bg-border" />

                {/* 임계값 표시 */}
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-medium text-foreground/70 whitespace-nowrap">임계값 표시</span>
                  <div className="flex gap-1">
                    <button
                      onClick={() => setDecimalPlaces(2)}
                      className={`px-2 py-1 rounded transition text-xs ${
                        decimalPlaces === 2
                          ? 'bg-brand text-background font-medium'
                          : 'bg-surface-75 text-foreground/70 hover:bg-surface-100'
                      }`}
                    >
                      소수점 2자리
                    </button>
                    <button
                      onClick={() => setDecimalPlaces(3)}
                      className={`px-2 py-1 rounded transition text-xs ${
                        decimalPlaces === 3
                          ? 'bg-brand text-background font-medium'
                          : 'bg-surface-75 text-foreground/70 hover:bg-surface-100'
                      }`}
                    >
                      소수점 3자리
                    </button>
                  </div>
                </div>
              </div>

              {/* 소수점 3자리 안내 (데스크톱) */}
              {decimalPlaces === 3 && (
                <div className="hidden md:block">
                  <p className="text-[10px] text-foreground/50 pl-1">
                    * 소수점 3자리는 최대 0.2 구간으로 제한됩니다
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* 오른쪽 영역: 분석 버튼 (데스크톱에서 3행에 걸쳐 표시) */}
          <div className="flex items-center md:items-stretch">
            {!isSimulating ? (
              <Button
                variant="primary"
                onClick={handleSimulate}
                size="sm"
                className="px-6 w-full md:w-28 md:h-full"
              >
                시뮬레이션
              </Button>
            ) : (
              <Button
                variant="secondary"
                onClick={handleCancel}
                size="sm"
                className="px-6 w-full md:w-28 md:h-full bg-red-500/20 hover:bg-red-500/30 text-red-400 border-red-500/30"
              >
                중지
              </Button>
            )}
          </div>
        </div>
      </Card>

      {/* 진행률 표시 */}
      {isSimulating && (
        <Card className="p-4">
          <div className="space-y-2">
            <div className="flex justify-between items-center text-sm">
              <span className="text-foreground/70">
                {progressMessage || (cancelRef.current ? '시뮬레이션 중지 중...' : '시뮬레이션 진행 중...')}
              </span>
              <span className="font-medium text-brand">{progress.toFixed(1)}%</span>
            </div>
            <div className="w-full bg-surface-100 rounded-full h-2 overflow-hidden">
              <div
                className={`h-full transition-all duration-300 rounded-full ${
                  cancelRef.current ? 'bg-red-500' : 'bg-brand'
                }`}
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-xs text-foreground/60 text-center">
              {cancelRef.current 
                ? '취소 중입니다...' 
                : `약 ${Math.ceil((100 - progress) * 0.5)} 초 남음`
              }
            </p>
          </div>
        </Card>
      )}

      {/* 결과 테이블 */}
      {results && (
        <Card className="p-3">
          <div className="mb-4 flex flex-wrap justify-between items-center gap-4">
            <h2 className="text-xl font-bold">시뮬레이션 결과</h2>
            <div className="text-sm text-foreground/70">
              <span className="mr-4">
                최소 수익률: <span className="font-bold text-blue-400">{formatReturn(minReturn)}%</span>
              </span>
              <span>
                최대 수익률: <span className="font-bold text-red-400">{formatReturn(maxReturn)}%</span>
              </span>
            </div>
          </div>

          {/* 색상 범례 */}
          <div className="flex items-center gap-4 mb-4 text-sm">
            <span className="text-foreground/70">수익률:</span>
            <div className="flex items-center gap-2">
              <div className="w-8 h-4 rounded" style={{ backgroundColor: getCellColors(minReturn).background }} />
              <span className="text-xs">낮음</span>
            </div>
            <div 
              className="flex-1 h-4 rounded" 
              style={{ 
                background: 'linear-gradient(to right, rgb(0, 0, 255), rgb(255, 255, 255), rgb(255, 0, 0))' 
              }} 
            />
            <div className="flex items-center gap-2">
              <span className="text-xs">높음</span>
              <div className="w-8 h-4 rounded" style={{ backgroundColor: getCellColors(maxReturn).background }} />
            </div>
          </div>

          {/* 테이블 (스크롤 가능) */}
          <div className="overflow-auto max-h-[70vh]">
            <table className="w-full border-collapse text-xs">
              <thead className="sticky top-0 bg-surface z-10">
                <tr>
                  <th className="border border-border p-2 bg-surface-75 w-20 min-w-[80px]">
                    매수 \ 매도
                  </th>
                  {sellThresholds.map((threshold) => (
                    <th key={threshold} className="border border-border p-2 bg-surface-75">
                      {threshold.toFixed(decimalPlaces)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {results.map((row, rowIdx) => (
                  <tr key={rowIdx}>
                    <td className="border border-border p-2 font-medium bg-surface-75 sticky left-0 w-20 min-w-[80px]">
                      {buyThresholds[rowIdx]?.toFixed(decimalPlaces) || '-'}
                    </td>
                    {row.map((cell, colIdx) => {
                      const colors = getCellColors(cell.totalReturn)
                      return (
                        <td
                          key={colIdx}
                          className="border border-border p-2 text-center cursor-pointer hover:opacity-80 hover:ring-2 hover:ring-brand transition"
                          style={{
                            backgroundColor: colors.background,
                            color: colors.text
                          }}
                          title={`매수: ${cell.buyThreshold.toFixed(decimalPlaces)}, 매도: ${cell.sellThreshold.toFixed(decimalPlaces)}\n수익률: ${formatReturn(cell.totalReturn)}%\n거래 횟수: ${cell.tradeCount}\n클릭하여 상세 내역 보기`}
                          onClick={() => handleCellClick(cell.buyThreshold, cell.sellThreshold)}
                        >
                          {formatReturn(cell.totalReturn)}%
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-4 space-y-1">
            <p className="text-xs text-foreground/60">
              * 표는 0.010 간격으로 표시됩니다. 셀에 마우스를 올리면 상세 정보를 볼 수 있습니다.
            </p>
            {using5Min !== null && (
              <p className="text-xs text-foreground/60">
                * 데이터: {using5Min ? '5분봉 기반 시뮬레이션' : `${timeFrame} 봉 기반 시뮬레이션 (5분봉 미제공)`}
              </p>
            )}
          </div>
        </Card>
      )}

      {/* 상세 내역 로딩 */}
      {isDetailLoading && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md p-6">
            <div className="space-y-4">
              <div className="text-center">
                <h3 className="text-lg font-bold text-foreground mb-2">
                  상세 내역 생성 중
                </h3>
                <p className="text-sm text-foreground/70">
                  {detailLoadingMessage}
                </p>
              </div>
              
              {/* Progress Bar */}
              <div className="space-y-2">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-foreground/70">진행률</span>
                  <span className="font-medium text-brand">
                    {detailLoadingProgress.toFixed(0)}%
                  </span>
                </div>
                <div className="w-full bg-surface-100 rounded-full h-2 overflow-hidden">
                  <div
                    className="h-full transition-all duration-300 rounded-full bg-brand"
                    style={{ width: `${detailLoadingProgress}%` }}
                  />
                </div>
              </div>

              {/* 애니메이션 */}
              <div className="flex justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand" />
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* 상세 내역 모달 */}
      {isDetailModalOpen && selectedDetail && (
        <div 
          className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4"
          onClick={() => setIsDetailModalOpen(false)}
        >
          <Card 
            className="w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col"
            onClick={(e: React.MouseEvent) => e.stopPropagation()}
          >
            {/* 헤더 */}
            <div className="p-4 border-b border-border">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h2 className="text-xl font-bold">거래 상세 내역</h2>
                  <p className="text-sm text-foreground/70 mt-1">
                    매수 임계값: {selectedDetail.buyThreshold.toFixed(decimalPlaces)} | 
                    매도 임계값: {selectedDetail.sellThreshold.toFixed(decimalPlaces)}
                  </p>
                </div>
                <button
                  onClick={() => setIsDetailModalOpen(false)}
                  className="p-2 hover:bg-surface-100 rounded transition"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              {/* 필터 토글 */}
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-foreground/70">표시 옵션:</span>
                <div className="flex gap-1">
                  <button
                    onClick={() => setShowAllTrades(false)}
                    className={`px-3 py-1 rounded text-xs transition ${
                      !showAllTrades
                        ? 'bg-brand text-background font-medium'
                        : 'bg-surface-75 text-foreground/70 hover:bg-surface-100'
                    }`}
                  >
                    매수/매도만
                  </button>
                  <button
                    onClick={() => setShowAllTrades(true)}
                    className={`px-3 py-1 rounded text-xs transition ${
                      showAllTrades
                        ? 'bg-brand text-background font-medium'
                        : 'bg-surface-75 text-foreground/70 hover:bg-surface-100'
                    }`}
                  >
                    전체 보기
                  </button>
                </div>
              </div>
            </div>

            {/* 내용 */}
            <div className="flex-1 overflow-auto p-4">
              <table className="w-full border-collapse text-xs">
                <thead className="sticky top-0 bg-surface z-10">
                  <tr>
                    <th className="border border-border p-2 bg-surface-75 text-left whitespace-nowrap">시간</th>
                    <th className="border border-border p-2 bg-surface-75 text-right">Ranking Value</th>
                    <th className="border border-border p-2 bg-surface-75 text-center">판단</th>
                    <th className="border border-border p-2 bg-surface-75 text-right">가격</th>
                    <th className="border border-border p-2 bg-surface-75 text-right">누적 수익률</th>
                    <th className="border border-border p-2 bg-surface-75 text-right">홀드 수익률</th>
                  </tr>
                </thead>
                  <tbody>
                    {selectedDetail.details
                      .filter(detail => showAllTrades || detail.decision !== 'hold')
                      .map((detail, idx) => (
                      <tr 
                        key={idx}
                        className={detail.decision !== 'hold' ? 'bg-surface-75/50' : ''}
                      >
                        <td className="border border-border p-2 whitespace-nowrap">
                          {formatChartTime(detail.timestamp)}
                        </td>
                        <td className="border border-border p-2 text-right">
                          {detail.rankingValue.toFixed(3)}
                        </td>
                        <td className="border border-border p-2 text-center">
                          {detail.decision === 'buy' && (
                            <span className="text-xs px-2 py-0.5 rounded bg-blue-500/20 text-blue-400 font-medium">매수</span>
                          )}
                          {detail.decision === 'sell' && (
                            <span className="text-xs px-2 py-0.5 rounded bg-red-500/20 text-red-400 font-medium">매도</span>
                          )}
                          {detail.decision === 'hold' && (
                            <span className="text-xs px-2 py-0.5 rounded bg-surface-100 text-foreground/50">-</span>
                          )}
                        </td>
                        <td className="border border-border p-2 text-right">
                          {detail.price.toLocaleString()}
                        </td>
                        <td className={`border border-border p-2 text-right font-medium ${
                          detail.cumulativeReturn > 0 ? 'text-red-400' : 
                          detail.cumulativeReturn < 0 ? 'text-blue-400' : 
                          'text-foreground/70'
                        }`}>
                          {detail.cumulativeReturn.toFixed(2)}%
                        </td>
                        <td className={`border border-border p-2 text-right font-medium ${
                          detail.holdReturn > 0 ? 'text-red-400' : 
                          detail.holdReturn < 0 ? 'text-blue-400' : 
                          'text-foreground/70'
                        }`}>
                          {detail.holdReturn.toFixed(2)}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
            </div>

            {/* 푸터 */}
            <div className="p-4 border-t border-border flex justify-end gap-2">
              <Button
                variant="secondary"
                onClick={() => setIsDetailModalOpen(false)}
                size="sm"
              >
                닫기
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}

