'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { Card } from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import { AnalysisSettings } from '@/components/common'
import type { TimeFrame, Period, Exchange, IndicatorConfig } from '@/types/chart'
import type { Phase1Grid, Phase1Result, SimulationCache, SimulationPhase, Phase2AGrid, Phase2BGrid } from '@/types/simulation'
import { calculateRequiredCandles, getSimulationTimeFrame, getSimulationMultiplier } from '@/lib/utils/ranking'
import type { Candle } from '@/lib/bithumb/types'
import { fetchMultipleCandles as fetchCandlesApi } from '@/lib/api/candleApi'
import Phase2AContent from './Phase2AContent'
import Phase2BContent from './Phase2BContent'
import Phase2CompareContent from './Phase2CompareContent'
import SavedConditionsModal from './SavedConditionsModal'
import TradeDetailModal from './TradeDetailModal'
import type { SavedCondition, TradeDetail, Trade } from '@/types/simulation'

interface ProgressiveSimulationContentProps {
  symbol: string
}

// 시뮬레이션 버전 (ranking value 계산 로직 변경 시 증가)
const SIMULATION_VERSION = 4 // v4: 매 1분마다 판단 + 동적 ranking value 계산

export default function ProgressiveSimulationContent({
  symbol
}: ProgressiveSimulationContentProps) {
  // localStorage 키 생성 및 값 불러오기
  const getStorageKey = useCallback((key: string) => `progressive_${symbol}_${key}`, [symbol])
  
  const getStoredValue = useCallback(<T,>(key: string, defaultValue: T): T => {
    if (typeof window === 'undefined') return defaultValue
    try {
      const stored = localStorage.getItem(`progressive_${symbol}_${key}`)
      return stored ? JSON.parse(stored) : defaultValue
    } catch {
      return defaultValue
    }
  }, [symbol])

  // 시뮬레이션 버전 확인 및 캐시 초기화
  useEffect(() => {
    if (typeof window === 'undefined') return
    
    const storedVersion = getStoredValue<number>('simulationVersion', 0)
    
    if (storedVersion !== SIMULATION_VERSION) {
      console.log(`🔄 시뮬레이션 로직 변경됨 (v${storedVersion} → v${SIMULATION_VERSION}). 캐시 초기화 중...`)
      
      // 시뮬레이션 결과 캐시 초기화
      const keysToRemove = [
        'phase1Results',
        'phase2aResults',
        'phase2bResults',
        'selectedCell',
      ]
      
      keysToRemove.forEach(key => {
        localStorage.removeItem(getStorageKey(key))
      })
      
      // 새 버전 저장
      localStorage.setItem(getStorageKey('simulationVersion'), JSON.stringify(SIMULATION_VERSION))
      
      console.log('✅ 캐시 초기화 완료')
    }
  }, [getStorageKey, getStoredValue])

  // 분석 설정 (빗썸 제외, 기본값: Binance)
  const [exchange, setExchange] = useState<Exchange>(() => getStoredValue('exchange', 'binance'))
  const [period, setPeriod] = useState<Period>(() => getStoredValue('period', '3M'))
  const [timeFrame, setTimeFrame] = useState<TimeFrame>(() => getStoredValue('timeFrame', '2h'))
  const [baseDate, setBaseDate] = useState<string>(new Date().toISOString().split('T')[0])
  const [indicators, setIndicators] = useState<IndicatorConfig>(() => getStoredValue('indicators', {
    macd: true,
    rsi: true,
    ao: true,
    DP: true,
    rti: true,
  }))

  // Phase 1 설정
  const [conditionMin, setConditionMin] = useState(() => getStoredValue('conditionMin', 1))
  const [conditionMax, setConditionMax] = useState(() => getStoredValue('conditionMax', 10))
  const [thresholdMin, setThresholdMin] = useState(() => getStoredValue('thresholdMin', 0.2))
  const [thresholdMax, setThresholdMax] = useState(() => getStoredValue('thresholdMax', 2.0))
  const [decimalPlaces] = useState<2 | 3>(2) // 소수점 2자리 표기, 0.01 단위 사용
  const [initialPosition, setInitialPosition] = useState<'cash' | 'coin'>(() => getStoredValue('initialPosition', 'cash'))
  const [decisionInterval, setDecisionInterval] = useState<1 | 2 | 5>(() => getStoredValue('decisionInterval', 1)) // 매매 판단 주기 (분)

  // Phase 상태 관리
  const [currentPhase, setCurrentPhase] = useState<SimulationPhase>('phase1')
  const [phase1Baseline, setPhase1Baseline] = useState<Phase1Result | null>(null)
  const [mainCandles, setMainCandles] = useState<Candle[]>([])
  const [simulationCandles, setSimulationCandles] = useState<Candle[]>([])

  // Phase 2 결과 저장
  const [phase2aResults, setPhase2aResults] = useState<Phase2AGrid | null>(() => {
    // localStorage에서 복원
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem(getStorageKey('phase2aResults'))
        return stored ? JSON.parse(stored) : null
      } catch {
        return null
      }
    }
    return null
  })
  const [phase2bResults, setPhase2bResults] = useState<Phase2BGrid | null>(() => {
    // localStorage에서 복원
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem(getStorageKey('phase2bResults'))
        return stored ? JSON.parse(stored) : null
      } catch {
        return null
      }
    }
    return null
  })

  // 시뮬레이션 상태
  const [isSimulating, setIsSimulating] = useState(false)
  const [progress, setProgress] = useState(0)
  const [progressMessage, setProgressMessage] = useState('')
  const [phase1Results, setPhase1Results] = useState<Phase1Grid | null>(() => {
    // localStorage에서 복원
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem(getStorageKey('phase1Results'))
        return stored ? JSON.parse(stored) : null
      } catch {
        return null
      }
    }
    return null
  })
  const [selectedCell, setSelectedCell] = useState<Phase1Result | null>(() => {
    // localStorage에서 복원
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem(getStorageKey('selectedCell'))
        return stored ? JSON.parse(stored) : null
      } catch {
        return null
      }
    }
    return null
  })
  const [simulationCache, setSimulationCache] = useState<SimulationCache | null>(null)

  // Worker 참조
  const workerRef = useRef<Worker | null>(null)
  const cancelRef = useRef(false)

  // 저장된 조건 모달
  const [showSavedConditions, setShowSavedConditions] = useState(false)

  // 상세 내역 모달
  const [showTradeDetail, setShowTradeDetail] = useState(false)
  const [tradeDetail, setTradeDetail] = useState<TradeDetail | null>(null)
  const [isLoadingDetail, setIsLoadingDetail] = useState(false)

  // localStorage 저장
  useEffect(() => {
    if (typeof window === 'undefined') return
    localStorage.setItem(getStorageKey('exchange'), JSON.stringify(exchange))
  }, [exchange, getStorageKey])

  useEffect(() => {
    if (typeof window === 'undefined') return
    localStorage.setItem(getStorageKey('period'), JSON.stringify(period))
  }, [period, getStorageKey])

  useEffect(() => {
    if (typeof window === 'undefined') return
    localStorage.setItem(getStorageKey('timeFrame'), JSON.stringify(timeFrame))
  }, [timeFrame, getStorageKey])

  useEffect(() => {
    if (typeof window === 'undefined') return
    localStorage.setItem(getStorageKey('indicators'), JSON.stringify(indicators))
  }, [indicators, getStorageKey])

  useEffect(() => {
    if (typeof window === 'undefined') return
    localStorage.setItem(getStorageKey('conditionMin'), JSON.stringify(conditionMin))
  }, [conditionMin, getStorageKey])

  useEffect(() => {
    if (typeof window === 'undefined') return
    localStorage.setItem(getStorageKey('conditionMax'), JSON.stringify(conditionMax))
  }, [conditionMax, getStorageKey])

  useEffect(() => {
    if (typeof window === 'undefined') return
    localStorage.setItem(getStorageKey('thresholdMin'), JSON.stringify(thresholdMin))
  }, [thresholdMin, getStorageKey])

  useEffect(() => {
    if (typeof window === 'undefined') return
    localStorage.setItem(getStorageKey('thresholdMax'), JSON.stringify(thresholdMax))
  }, [thresholdMax, getStorageKey])

  useEffect(() => {
    if (typeof window === 'undefined') return
    localStorage.setItem(getStorageKey('decimalPlaces'), JSON.stringify(decimalPlaces))
  }, [decimalPlaces, getStorageKey])

  useEffect(() => {
    if (typeof window === 'undefined') return
    localStorage.setItem(getStorageKey('initialPosition'), JSON.stringify(initialPosition))
  }, [initialPosition, getStorageKey])

  useEffect(() => {
    if (typeof window === 'undefined') return
    localStorage.setItem(getStorageKey('decisionInterval'), JSON.stringify(decisionInterval))
  }, [decisionInterval, getStorageKey])

  // Phase 결과 저장
  useEffect(() => {
    if (typeof window === 'undefined') return
    if (phase1Results) {
      try {
        localStorage.setItem(getStorageKey('phase1Results'), JSON.stringify(phase1Results))
      } catch (error) {
        console.warn('Phase 1 결과 저장 실패:', error)
      }
    }
  }, [phase1Results, getStorageKey])

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (phase2aResults) {
      try {
        localStorage.setItem(getStorageKey('phase2aResults'), JSON.stringify(phase2aResults))
      } catch (error) {
        console.warn('Phase 2A 결과 저장 실패:', error)
      }
    }
  }, [phase2aResults, getStorageKey])

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (phase2bResults) {
      try {
        localStorage.setItem(getStorageKey('phase2bResults'), JSON.stringify(phase2bResults))
      } catch (error) {
        console.warn('Phase 2B 결과 저장 실패:', error)
      }
    }
  }, [phase2bResults, getStorageKey])

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (selectedCell) {
      try {
        localStorage.setItem(getStorageKey('selectedCell'), JSON.stringify(selectedCell))
      } catch (error) {
        console.warn('선택된 셀 저장 실패:', error)
      }
    }
  }, [selectedCell, getStorageKey])

  const handleIndicatorToggle = (indicator: keyof IndicatorConfig) => {
    setIndicators((prev) => ({
      ...prev,
      [indicator]: !prev[indicator],
    }))
  }

  // Worker 메시지 핸들러 설정
  const setupWorkerHandlers = (worker: Worker) => {
    worker.onmessage = (e) => {
      const { type, progress: workerProgress, message, results, error } = e.data
      
      switch (type) {
        case 'PHASE1_PROGRESS':
          setProgress(workerProgress)
          setProgressMessage(message || '')
          break
          
        case 'PHASE1_COMPLETE':
          if (results) {
            setPhase1Results(results)
            setProgress(100)
            setProgressMessage('완료!')
          }
          setIsSimulating(false)
          break
        
        case 'PHASE2A_PROGRESS':
          setProgress(workerProgress)
          setProgressMessage(message || '')
          break
        
        case 'PHASE2B_PROGRESS':
          setProgress(workerProgress)
          setProgressMessage(message || '')
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
    workerRef.current = new Worker('/simulation-worker.js')
    setupWorkerHandlers(workerRef.current)
    
    return () => {
      if (workerRef.current) {
        workerRef.current.terminate()
      }
    }
  }, [])

  /**
   * 시뮬레이션용 캔들 데이터 로드
   */
  const fetchMultipleSimulationCandles = async (
    simulationTimeFrame: TimeFrame,
    requiredCount: number,
    baseDateTimestamp: number,
    onProgress?: (current: number, total: number) => void
  ): Promise<Candle[]> => {
    const timeFrameMinutes: Record<string, number> = {
      '1m': 1,
      '5m': 5,
      '10m': 10,
      '30m': 30,
      '1h': 60,
      '2h': 120,
      '4h': 240,
      '1d': 1440,
    }
    
    const minutes = timeFrameMinutes[simulationTimeFrame] || 5
    const candleMs = minutes * 60 * 1000
    const startTimestamp = baseDateTimestamp - (requiredCount * candleMs)

    const result = await fetchCandlesApi({
      symbol,
      exchange,
      timeFrame: simulationTimeFrame,
      startTimestamp,
      endTimestamp: baseDateTimestamp,
      maxIterations: 20,
      onProgress,
    })

    return result.slice(0, requiredCount)
  }

  const handleSimulate = async () => {
    // 범위 검증
    if (conditionMin >= conditionMax) {
      alert('조건 개수 최소값은 최대값보다 작아야 합니다.')
      return
    }

    if (thresholdMin >= thresholdMax) {
      alert('임계값 최소값은 최대값보다 작아야 합니다.')
      return
    }

    if (thresholdMin < 0.2 || thresholdMax > 2.0) {
      alert('임계값 범위는 0.2 ~ 2.0 사이여야 합니다.')
      return
    }

    setIsSimulating(true)
    setProgress(0)
    setProgressMessage('데이터 로드 중...')
    cancelRef.current = false
    
    try {
      // 1. 메인 캔들 데이터 로드
      const requiredCandles = calculateRequiredCandles(period, timeFrame)
      const apiPath = exchange === 'bithumb' ? 'market' : exchange
      
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

      // 캔들 데이터 저장 (Phase 2에서 재사용)
      setMainCandles(candles)

      // 2. 시뮬레이션용 캔들 데이터 로드
      const simulationTimeFrame = getSimulationTimeFrame(timeFrame)
      const simulationMultiplier = getSimulationMultiplier(timeFrame)
      
      setProgressMessage(`${simulationTimeFrame} 데이터 로드 중...`)
      const requiredSimulationCandles = requiredCandles * simulationMultiplier
      const baseDateTimestamp = new Date(baseDate + 'T23:59:59+09:00').getTime()
      
      const simCandles = await fetchMultipleSimulationCandles(
        simulationTimeFrame as TimeFrame,
        requiredSimulationCandles,
        baseDateTimestamp,
        (current, total) => {
          const loadProgress = (current / total) * 50 // 0-50% 진행률
          setProgress(loadProgress)
          setProgressMessage(`${simulationTimeFrame} 데이터 로드 중... (${current}/${total})`)
        }
      )

      // 3. Worker에 전달할 데이터 준비
      const mainCandles = candles.map(c => ({
        timestamp: c.timestamp,
        open: c.open,
        high: c.high,
        low: c.low,
        close: c.close
      }))

      const simulationCandleData = simCandles.map(c => ({
        timestamp: c.timestamp,
        open: c.open,
        high: c.high,
        low: c.low,
        close: c.close
      }))

      // 시뮬레이션 캔들 저장 (Phase 2에서 재사용)
      setSimulationCandles(simCandles)

      // 4. Web Worker에 Phase 1 시뮬레이션 작업 전달
      if (workerRef.current) {
        workerRef.current.postMessage({
          type: 'START_PHASE1_SIMULATION',
          data: {
            mainCandles,
            simulationCandles: simulationCandleData.length > 0 ? simulationCandleData : mainCandles,
            conditionRange: { min: conditionMin, max: conditionMax },
            thresholdRange: { min: thresholdMin, max: thresholdMax },
            indicators,
            initialPosition,
            decimalPlaces,
            baseDate: baseDateTimestamp, // 분석 시작 시간 (timestamp)
            timeFrame, // 메인 타임프레임 (1d, 4h, 2h, 1h, 30m)
            decisionInterval // 판단 주기 (1분, 2분, 5분)
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
      workerRef.current = new Worker('/simulation-worker.js')
      setupWorkerHandlers(workerRef.current)
    }
    setIsSimulating(false)
    setProgress(0)
    setProgressMessage('')
  }

  /**
   * 수익률에 따른 히트맵 색상 계산
   */
  const getCellColors = (returnValue: number, minReturn: number, maxReturn: number): { background: string; text: string } => {
    if (minReturn === maxReturn) {
      return { 
        background: 'rgba(200, 200, 200, 0.3)',
        text: '#ffffff'
      }
    }
    
    const normalized = (returnValue - minReturn) / (maxReturn - minReturn)
    
    let r: number, g: number, b: number
    
    if (normalized < 0.5) {
      // 파란색 -> 흰색
      const ratio = normalized * 2
      r = Math.round(0 + (255 - 0) * ratio)
      g = Math.round(0 + (255 - 0) * ratio)
      b = 255
    } else {
      // 흰색 -> 빨간색
      const ratio = (normalized - 0.5) * 2
      r = 255
      g = Math.round(255 - (255 - 0) * ratio)
      b = Math.round(255 - (255 - 0) * ratio)
    }
    
    const luminance = 0.299 * r + 0.587 * g + 0.114 * b
    const textColor = luminance > 128 ? '#000000' : '#ffffff'
    
    return {
      background: `rgb(${r}, ${g}, ${b})`,
      text: textColor
    }
  }

  /**
   * 셀 클릭 핸들러
   */
  const handleCellClick = (result: Phase1Result) => {
    setSelectedCell(result)
  }

  /**
   * 수익률 포맷
   */
  const formatReturn = (value: number): string => {
    return Math.round(value).toLocaleString('en-US')
  }

  /**
   * Phase 2A로 전환 (매수 미세 조정)
   */
  const handleGoToPhase2A = (baseline?: Phase1Result) => {
    if (baseline) {
      setPhase1Baseline(baseline)
    }
    setCurrentPhase('phase2a')
  }

  /**
   * Phase 2B로 전환 (매도 미세 조정)
   */
  const handleGoToPhase2B = (baseline?: Phase1Result) => {
    if (baseline) {
      setPhase1Baseline(baseline)
    }
    setCurrentPhase('phase2b')
  }

  /**
   * Phase 2 비교 뷰로 전환
   */
  const handleGoToCompare = () => {
    setCurrentPhase(null) // null을 비교 뷰로 사용
  }

  /**
   * Phase 1로 돌아가기
   */
  const handleBackToPhase1 = () => {
    setCurrentPhase('phase1')
    setPhase1Baseline(null)
  }

  /**
   * Phase 2A 결과 저장
   */
  const handlePhase2AComplete = (results: Phase2AGrid) => {
    setPhase2aResults(results)
  }

  /**
   * Phase 2B 결과 저장
   */
  const handlePhase2BComplete = (results: Phase2BGrid) => {
    setPhase2bResults(results)
  }

  /**
   * 결과 초기화
   */
  const handleClearResults = () => {
    if (!confirm('모든 시뮬레이션 결과를 초기화하시겠습니까?')) {
      return
    }

    // 상태 초기화
    setPhase1Results(null)
    setPhase2aResults(null)
    setPhase2bResults(null)
    setSelectedCell(null)
    setPhase1Baseline(null)
    setCurrentPhase('phase1')

    // localStorage 초기화
    if (typeof window !== 'undefined') {
      localStorage.removeItem(getStorageKey('phase1Results'))
      localStorage.removeItem(getStorageKey('phase2aResults'))
      localStorage.removeItem(getStorageKey('phase2bResults'))
      localStorage.removeItem(getStorageKey('selectedCell'))
    }
  }

  /**
   * 저장된 조건 불러오기
   */
  const handleLoadCondition = (condition: SavedCondition) => {
    // 고급 시뮬레이션으로 전환하여 조건 적용 (TODO: 고급 시뮬레이션 연동)
    alert(`조건 불러오기 완료!\n\n매수: ${condition.buyConditionCount}개, ${condition.buyThreshold.toFixed(3)}\n매도: ${condition.sellConditionCount}개, ${condition.sellThreshold.toFixed(3)}\n\n고급 시뮬레이션 탭에서 확인하세요.`)
    
    // localStorage에 조건 저장 (고급 시뮬레이션에서 읽을 수 있도록)
    if (typeof window !== 'undefined') {
      localStorage.setItem(`advanced_${symbol}_buyCondition`, JSON.stringify(condition.buyConditionCount))
      localStorage.setItem(`advanced_${symbol}_buyThreshold`, JSON.stringify(condition.buyThreshold))
      localStorage.setItem(`advanced_${symbol}_sellCondition`, JSON.stringify(condition.sellConditionCount))
      localStorage.setItem(`advanced_${symbol}_sellThreshold`, JSON.stringify(condition.sellThreshold))
    }
  }

  /**
   * 상세 거래 내역 조회
   */
  const handleShowTradeDetail = async (
    buyConditionCount: number,
    buyThreshold: number,
    sellConditionCount: number,
    sellThreshold: number
  ) => {
    if (!simulationCache || mainCandles.length === 0 || simulationCandles.length === 0) {
      alert('먼저 시뮬레이션을 실행해주세요.')
      return
    }

    setIsLoadingDetail(true)
    setShowTradeDetail(true)

    try {
      const worker = new Worker('/simulation-worker.js')

      worker.onmessage = (e) => {
        const { type } = e.data

        if (type === 'DETAIL_COMPLETE') {
          const { details } = e.data
          
          // details를 Trade[] 형식으로 변환
          const trades: Trade[] = []
          let currentBalance = 100 // 100%로 시작
          let position: 'cash' | 'coin' = initialPosition
          let lastBuyPrice = 0

          for (const detail of details) {
            if (detail.decision === 'buy' || detail.decision === 'sell') {
              const trade: Trade = {
                timestamp: detail.timestamp,
                type: detail.decision,
                price: detail.price,
                position: detail.decision === 'buy' ? 'coin' : 'cash',
                balance: detail.cumulativeReturn || 0,
                profit: undefined,
                profitRate: undefined
              }

              // 수익률 계산
              if (detail.decision === 'sell' && lastBuyPrice > 0) {
                trade.profitRate = ((detail.price - lastBuyPrice) / lastBuyPrice) * 100
              } else if (detail.decision === 'buy') {
                lastBuyPrice = detail.price
              }

              trades.push(trade)
              position = trade.position
              currentBalance = trade.balance
            }
          }

          // 가격 데이터 추출
          const priceData = details.map((d: { timestamp: number; price: number }) => ({
            timestamp: d.timestamp,
            price: d.price
          }))

          const tradeDetail: TradeDetail = {
            buyConditionCount,
            buyThreshold,
            sellConditionCount,
            sellThreshold,
            totalReturn: details[details.length - 1]?.cumulativeReturn || 0,
            tradeCount: trades.length,
            holdReturn: details[details.length - 1]?.holdReturn || 0,
            trades,
            priceData
          }

          setTradeDetail(tradeDetail)
          setIsLoadingDetail(false)
          worker.terminate()
        } else if (type === 'ERROR') {
          console.error('상세 내역 조회 실패:', e.data.error)
          alert('상세 내역 조회에 실패했습니다.')
          setIsLoadingDetail(false)
          setShowTradeDetail(false)
          worker.terminate()
        }
      }

      worker.postMessage({
        type: 'GET_DETAIL',
        data: {
          mainCandles,
          simulationCandles,
          buyConditionCount,
          sellConditionCount,
          buyThreshold,
          sellThreshold,
          indicators,
          initialPosition,
          baseDate,
          period,
          cachedIndicatorValues: simulationCache.phase1.indicatorValues
        }
      })
    } catch (error) {
      console.error('Worker 생성 실패:', error)
      alert('상세 내역 조회에 실패했습니다.')
      setIsLoadingDetail(false)
      setShowTradeDetail(false)
    }
  }

  // Phase 2 비교 뷰 렌더링
  if (currentPhase === null) {
    return (
      <>
        <Phase2CompareContent
          symbol={symbol}
          phase2aResults={phase2aResults}
          phase2bResults={phase2bResults}
          onGoToPhase2A={() => handleGoToPhase2A()}
          onGoToPhase2B={() => handleGoToPhase2B()}
          onBackToPhase1={handleBackToPhase1}
          onShowDetail={handleShowTradeDetail}
        />
        {showSavedConditions && (
          <SavedConditionsModal
            symbol={symbol}
            onClose={() => setShowSavedConditions(false)}
            onLoad={handleLoadCondition}
          />
        )}
        {showTradeDetail && tradeDetail && (
          <TradeDetailModal
            symbol={symbol}
            detail={tradeDetail}
            onClose={() => {
              setShowTradeDetail(false)
              setTradeDetail(null)
            }}
          />
        )}
        {isLoadingDetail && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <Card className="p-6">
              <div className="flex flex-col items-center gap-3">
                <div className="w-8 h-8 border-4 border-brand border-t-transparent rounded-full animate-spin" />
                <div className="text-sm">거래 내역을 불러오는 중...</div>
              </div>
            </Card>
          </div>
        )}
      </>
    )
  }

  // Phase 2A 렌더링
  if (currentPhase === 'phase2a' && phase1Baseline) {
    return (
      <Phase2AContent
        symbol={symbol}
        phase1Baseline={phase1Baseline}
        phase1Config={{
          exchange,
          period,
          timeFrame,
          baseDate,
          indicators,
          initialPosition,
          decimalPlaces,
          decisionInterval
        }}
        mainCandles={mainCandles}
        simulationCandles={simulationCandles}
        onBack={handleBackToPhase1}
        onResultsComplete={handlePhase2AComplete}
        onGoToCompare={handleGoToCompare}
        onShowDetail={handleShowTradeDetail}
      />
    )
  }

  // Phase 2B 렌더링
  if (currentPhase === 'phase2b' && phase1Baseline) {
    return (
      <Phase2BContent
        symbol={symbol}
        phase1Baseline={phase1Baseline}
        phase1Config={{
          exchange,
          period,
          timeFrame,
          baseDate,
          indicators,
          initialPosition,
          decimalPlaces,
          decisionInterval
        }}
        mainCandles={mainCandles}
        simulationCandles={simulationCandles}
        onBack={handleBackToPhase1}
        onResultsComplete={handlePhase2BComplete}
        onGoToCompare={handleGoToCompare}
        onShowDetail={handleShowTradeDetail}
      />
    )
  }

  // Phase 1 렌더링
  return (
    <div className="space-y-4">
      {/* 저장된 결과 복원 알림 */}
      {(phase1Results || phase2aResults || phase2bResults) && (
        <Card className="p-3 bg-brand/10 border-brand">
          <div className="flex items-start gap-2">
            <svg className="w-5 h-5 text-brand flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div className="flex-1">
              <div className="text-sm font-medium text-brand">저장된 결과를 불러왔습니다</div>
              <div className="text-xs text-foreground/70 mt-1">
                {phase1Results && '✓ Phase 1 결과 복원'}
                {phase1Results && (phase2aResults || phase2bResults) && ' | '}
                {phase2aResults && '✓ Phase 2A 결과 복원'}
                {phase2aResults && phase2bResults && ' | '}
                {phase2bResults && '✓ Phase 2B 결과 복원'}
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Phase 1: 대칭 탐색 설정 */}
      <Card className="p-3">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-bold">Phase 1: 대칭 탐색 (최적 기준점 찾기)</h2>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowSavedConditions(true)}
              className="text-xs text-foreground/60 hover:text-brand transition flex items-center gap-1"
              title="저장된 조건 보기"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 19a2 2 0 01-2-2V7a2 2 0 012-2h4l2 2h4a2 2 0 012 2v1M5 19h14a2 2 0 002-2v-5a2 2 0 00-2-2H9a2 2 0 00-2 2v5a2 2 0 01-2 2z" />
              </svg>
              <span className="hidden sm:inline">저장된 조건</span>
            </button>
            {(phase1Results || phase2aResults || phase2bResults) && (
              <button
                onClick={handleClearResults}
                className="text-xs text-foreground/60 hover:text-red-400 transition flex items-center gap-1"
                title="모든 결과 초기화"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                <span className="hidden sm:inline">결과 초기화</span>
              </button>
            )}
          </div>
        </div>
        
        <div className="grid md:grid-cols-[1fr,auto] gap-3">
          {/* 왼쪽: 설정 영역 */}
          <div className="space-y-3">
            {/* 분석 설정 */}
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
              initialPosition={initialPosition}
              onInitialPositionChange={setInitialPosition}
              decisionInterval={decisionInterval}
              onDecisionIntervalChange={setDecisionInterval}
            />

            {/* 대칭 조건 범위 설정 */}
            <div className="flex items-center gap-5 flex-wrap text-xs">
              {/* 조건 개수 범위 */}
              <div className="flex items-center gap-1.5">
                <span className="font-medium text-foreground/70 whitespace-nowrap">조건 개수</span>
                <input
                  type="number"
                  value={conditionMin}
                  onChange={(e) => setConditionMin(Number(e.target.value))}
                  min={1}
                  max={10}
                  className="px-2 py-0.5 bg-surface border border-border rounded text-foreground focus:outline-none focus:ring-1 focus:ring-brand text-xs h-7 w-16 text-center"
                />
                <span className="text-foreground/50">~</span>
                <input
                  type="number"
                  value={conditionMax}
                  onChange={(e) => setConditionMax(Number(e.target.value))}
                  min={1}
                  max={10}
                  className="px-2 py-0.5 bg-surface border border-border rounded text-foreground focus:outline-none focus:ring-1 focus:ring-brand text-xs h-7 w-16 text-center"
                />
              </div>

              {/* 구분선 */}
              <div className="w-px h-6 bg-border" />

              {/* 임계값 범위 */}
              <div className="flex items-center gap-1.5">
                <span className="font-medium text-foreground/70 whitespace-nowrap">임계값</span>
                <input
                  type="number"
                  value={thresholdMin}
                  onChange={(e) => setThresholdMin(Number(e.target.value))}
                  min={0.2}
                  max={2.0}
                  step={0.01}
                  className="px-2 py-0.5 bg-surface border border-border rounded text-foreground focus:outline-none focus:ring-1 focus:ring-brand text-xs h-7 w-16 text-center"
                />
                <span className="text-foreground/50">~</span>
                <input
                  type="number"
                  value={thresholdMax}
                  onChange={(e) => setThresholdMax(Number(e.target.value))}
                  min={0.2}
                  max={2.0}
                  step={0.01}
                  className="px-2 py-0.5 bg-surface border border-border rounded text-foreground focus:outline-none focus:ring-1 focus:ring-brand text-xs h-7 w-16 text-center"
                />
              </div>
            </div>
          </div>

          {/* 오른쪽: 시뮬레이션 버튼 */}
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
                {progressMessage || '시뮬레이션 진행 중...'}
              </span>
              <span className="font-medium text-brand">{progress.toFixed(1)}%</span>
            </div>
            <div className="w-full bg-surface-100 rounded-full h-2 overflow-hidden">
              <div
                className="h-full transition-all duration-300 rounded-full bg-brand"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        </Card>
      )}

      {/* Phase 1 결과 */}
      {phase1Results && (
        <Card className="p-3">
          <div className="mb-4">
            <h2 className="text-xl font-bold mb-2">시뮬레이션 결과</h2>
            <div className="text-sm text-foreground/70">
              <span className="mr-4">
                최소 수익률: <span className="font-bold text-blue-400">{formatReturn(phase1Results.minReturn)}%</span>
              </span>
              <span>
                최대 수익률: <span className="font-bold text-red-400">{formatReturn(phase1Results.maxReturn)}%</span>
              </span>
            </div>
            <div className="mt-2 text-sm text-foreground/70">
              <span className="font-bold text-brand">
                최고 조합: 조건 {phase1Results.bestResult.conditionCount}개, 임계값 {phase1Results.bestResult.thresholdValue.toFixed(decimalPlaces)} (수익률 {formatReturn(phase1Results.bestResult.totalReturn)}%)
              </span>
            </div>
          </div>

          {/* 색상 범례 */}
          <div className="flex items-center gap-4 mb-4 text-sm">
            <span className="text-foreground/70">수익률:</span>
            <div className="flex items-center gap-2">
              <div className="w-8 h-4 rounded" style={{ backgroundColor: getCellColors(phase1Results.minReturn, phase1Results.minReturn, phase1Results.maxReturn).background }} />
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
              <div className="w-8 h-4 rounded" style={{ backgroundColor: getCellColors(phase1Results.maxReturn, phase1Results.minReturn, phase1Results.maxReturn).background }} />
            </div>
          </div>

          {/* 모바일 최적값 요약 카드 */}
          <div className="md:hidden mb-4 p-4 bg-brand/20 border-2 border-brand rounded-lg">
            <div className="text-sm font-bold text-brand mb-2">🏆 최고 수익률</div>
            <div className="text-2xl font-bold mb-2">{formatReturn(phase1Results.bestResult.totalReturn)}%</div>
            <div className="text-xs text-foreground/70">
              조건 {phase1Results.bestResult.conditionCount}개 | 임계값 {phase1Results.bestResult.thresholdValue.toFixed(decimalPlaces)}
            </div>
            <div className="text-xs text-foreground/60 mt-2">
              💡 아래 표를 좌우로 스크롤하여 전체 결과를 확인하세요
            </div>
          </div>

          {/* 결과 테이블 */}
          <div className="relative">
            {/* 스크롤 힌트 (모바일) */}
            <div className="md:hidden absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-background to-transparent pointer-events-none z-10" />
            
            <div className="overflow-auto max-h-[60vh] scrollbar-thin scrollbar-thumb-brand/30 scrollbar-track-surface">
              <table className="w-full border-collapse text-xs">
              <thead className="sticky top-0 bg-surface z-10">
                <tr>
                  <th className="border border-border p-2 bg-surface-75 w-16 min-w-[64px]">
                    조건 \ 임계값
                  </th>
                  {phase1Results.thresholdValues.map((threshold) => (
                    <th key={threshold} className="border border-border p-2 bg-surface-75 whitespace-nowrap">
                      {threshold.toFixed(decimalPlaces)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {phase1Results.results.map((row, rowIdx) => (
                  <tr key={rowIdx}>
                    <td className="border border-border p-2 font-medium bg-surface-75 sticky left-0 w-16 min-w-[64px] text-center">
                      {phase1Results.conditionCounts[rowIdx]}
                    </td>
                    {row.map((cell, colIdx) => {
                      const colors = getCellColors(cell.totalReturn, phase1Results.minReturn, phase1Results.maxReturn)
                      const isBest = cell.conditionCount === phase1Results.bestResult.conditionCount && 
                                     cell.thresholdValue === phase1Results.bestResult.thresholdValue
                      
                      return (
                        <td
                          key={colIdx}
                          className={`border border-border p-2 text-center cursor-pointer hover:opacity-80 hover:ring-2 hover:ring-brand transition ${
                            isBest ? 'ring-2 ring-yellow-400 font-bold' : ''
                          } ${
                            selectedCell?.conditionCount === cell.conditionCount && selectedCell?.thresholdValue === cell.thresholdValue
                              ? 'ring-2 ring-brand'
                              : ''
                          }`}
                          style={{
                            backgroundColor: colors.background,
                            color: colors.text
                          }}
                          title={`조건 ${cell.conditionCount}개, 임계값 ${cell.thresholdValue.toFixed(decimalPlaces)}\n수익률: ${formatReturn(cell.totalReturn)}%\n거래 횟수: ${cell.tradeCount}\n클릭하여 선택`}
                          onClick={() => handleCellClick(cell)}
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
          </div>

          {/* Phase 2로 진행 버튼 */}
          {selectedCell && (
            <div className="mt-4 p-3 bg-surface-75 rounded border border-brand">
              <div className="flex items-start justify-between gap-3 mb-2">
                <div>
                  <div className="text-sm mb-1">
                    <span className="font-bold text-brand">선택된 조건:</span> 조건 {selectedCell.conditionCount}개, 임계값 {selectedCell.thresholdValue.toFixed(decimalPlaces)} (수익률 {formatReturn(selectedCell.totalReturn)}%)
                  </div>
                  <div className="text-xs text-foreground/70">
                    이 조건을 기준으로 매수 또는 매도를 미세 조정하여 최적값을 찾습니다.
                  </div>
                </div>
                <button
                  onClick={() => handleShowTradeDetail(
                    selectedCell.conditionCount,
                    selectedCell.thresholdValue,
                    selectedCell.conditionCount,
                    selectedCell.thresholdValue
                  )}
                  className="px-3 py-1.5 text-xs bg-brand/20 hover:bg-brand/30 text-brand rounded transition whitespace-nowrap"
                >
                  📊 상세 보기
                </button>
              </div>
              <div className="space-y-2">
                <div className="flex gap-2 flex-wrap">
                  <Button 
                    variant="primary" 
                    size="sm"
                    onClick={() => handleGoToPhase2A(selectedCell)}
                    className="flex-1 min-w-[150px]"
                  >
                    🔍 Phase 2A: 매수 미세 조정
                  </Button>
                  <Button 
                    variant="primary" 
                    size="sm"
                    onClick={() => handleGoToPhase2B(selectedCell)}
                    className="flex-1 min-w-[150px]"
                  >
                    🔍 Phase 2B: 매도 미세 조정
                  </Button>
                </div>
                {(phase2aResults || phase2bResults) && (
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={handleGoToCompare}
                    className="w-full"
                  >
                    📊 Phase 2 결과 비교하기
                  </Button>
                )}
              </div>
            </div>
          )}

          <div className="mt-4 text-xs text-foreground/60">
            <p>* 셀을 클릭하여 선택 후 Phase 2로 진행할 수 있습니다</p>
            <p>* 최고 수익률 셀은 노란색 테두리로 표시됩니다</p>
            <p>* 거래 내역 상세는 Phase 2에서 확인할 수 있습니다</p>
          </div>
        </Card>
      )}

      {/* 저장된 조건 모달 */}
      {showSavedConditions && (
        <SavedConditionsModal
          symbol={symbol}
          onClose={() => setShowSavedConditions(false)}
          onLoad={handleLoadCondition}
        />
      )}

      {/* 상세 내역 모달 */}
      {showTradeDetail && tradeDetail && (
        <TradeDetailModal
          symbol={symbol}
          detail={tradeDetail}
          onClose={() => {
            setShowTradeDetail(false)
            setTradeDetail(null)
          }}
        />
      )}

      {/* 로딩 오버레이 */}
      {isLoadingDetail && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="p-6">
            <div className="flex flex-col items-center gap-3">
              <div className="w-8 h-8 border-4 border-brand border-t-transparent rounded-full animate-spin" />
              <div className="text-sm">거래 내역을 불러오는 중...</div>
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}

