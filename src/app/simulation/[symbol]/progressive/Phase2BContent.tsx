'use client'

import { useState, useRef, useEffect } from 'react'
import { Card } from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import type { Phase1Result, Phase2BGrid } from '@/types/simulation'
import type { TimeFrame, Period, Exchange, IndicatorConfig } from '@/types/chart'
import type { Candle } from '@/lib/bithumb/types'

interface Phase2BContentProps {
  symbol: string
  phase1Baseline: Phase1Result
  phase1Config: {
    exchange: Exchange
    period: Period
    timeFrame: TimeFrame
    baseDate: string
    indicators: IndicatorConfig
    initialPosition: 'cash' | 'coin'
    decimalPlaces: 2 | 3
    decisionInterval: 1 | 2 | 5
  }
  mainCandles: Candle[]
  simulationCandles: Candle[]
  onBack: () => void
  onResultsComplete?: (results: Phase2BGrid) => void
  onGoToCompare?: () => void
  onShowDetail?: (buyConditionCount: number, buyThreshold: number, sellConditionCount: number, sellThreshold: number) => void
}

export default function Phase2BContent({
  symbol,
  phase1Baseline,
  phase1Config,
  mainCandles,
  simulationCandles,
  onBack,
  onResultsComplete,
  onGoToCompare,
  onShowDetail
}: Phase2BContentProps) {
  // Phase 2B 설정 (매도 조건/임계값 범위)
  const defaultSellConditionMin = Math.max(1, phase1Baseline.conditionCount - 3)
  const defaultSellConditionMax = Math.min(10, phase1Baseline.conditionCount + 3)
  const defaultSellThresholdMin = Math.max(-2.0, phase1Baseline.sellThreshold - 0.5)
  const defaultSellThresholdMax = Math.min(0.0, phase1Baseline.sellThreshold + 0.5)

  const [sellConditionMin, setSellConditionMin] = useState(defaultSellConditionMin)
  const [sellConditionMax, setSellConditionMax] = useState(defaultSellConditionMax)
  const [sellThresholdMin, setSellThresholdMin] = useState(defaultSellThresholdMin)
  const [sellThresholdMax, setSellThresholdMax] = useState(defaultSellThresholdMax)

  // 시뮬레이션 상태
  const [isSimulating, setIsSimulating] = useState(false)
  const [progress, setProgress] = useState(0)
  const [progressMessage, setProgressMessage] = useState('')
  const [phase2bResults, setPhase2bResults] = useState<Phase2BGrid | null>(null)
  const [selectedCell, setSelectedCell] = useState<{ sellConditionCount: number; sellThreshold: number } | null>(null)

  // Worker 참조
  const workerRef = useRef<Worker | null>(null)

  // Worker 메시지 핸들러
  const setupWorkerHandlers = (worker: Worker) => {
    worker.onmessage = (e) => {
      const { type, progress: workerProgress, message, results, error } = e.data
      
      switch (type) {
        case 'PHASE2B_PROGRESS':
          setProgress(workerProgress)
          setProgressMessage(message || '')
          break
          
        case 'PHASE2B_COMPLETE':
          if (results) {
            setPhase2bResults(results)
            setProgress(100)
            setProgressMessage('완료!')
            // 부모 컴포넌트에 결과 전달
            if (onResultsComplete) {
              onResultsComplete(results)
            }
          }
          setIsSimulating(false)
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

  // Worker 초기화
  useEffect(() => {
    workerRef.current = new Worker('/simulation-worker.js')
    setupWorkerHandlers(workerRef.current)
    
    return () => {
      if (workerRef.current) {
        workerRef.current.terminate()
      }
    }
  }, [])

  const handleSimulate = () => {
    // 범위 검증
    if (sellConditionMin >= sellConditionMax) {
      alert('매도 조건 최소값은 최대값보다 작아야 합니다.')
      return
    }

    if (sellThresholdMin >= sellThresholdMax) {
      alert('매도 임계값 최소값은 최대값보다 작아야 합니다.')
      return
    }

    setIsSimulating(true)
    setProgress(0)
    setProgressMessage('Phase 2B 시뮬레이션 시작...')

    if (workerRef.current) {
      // baseDate를 timestamp로 변환
      const baseDateTimestamp = new Date(phase1Config.baseDate + 'T23:59:59+09:00').getTime()
      
      workerRef.current.postMessage({
        type: 'START_PHASE2B_SIMULATION',
        data: {
          mainCandles: mainCandles.map(c => ({
            timestamp: c.timestamp,
            open: c.open,
            high: c.high,
            low: c.low,
            close: c.close
          })),
          simulationCandles: simulationCandles.map(c => ({
            timestamp: c.timestamp,
            open: c.open,
            high: c.high,
            low: c.low,
            close: c.close
          })),
          // 고정값 (Phase 1 선택)
          fixedBuyCondition: phase1Baseline.conditionCount,
          fixedBuyThreshold: phase1Baseline.buyThreshold,
          // 탐색 범위
          sellConditionRange: { min: sellConditionMin, max: sellConditionMax },
          sellThresholdRange: { min: sellThresholdMin, max: sellThresholdMax },
          indicators: phase1Config.indicators,
          initialPosition: phase1Config.initialPosition,
          decimalPlaces: phase1Config.decimalPlaces,
          baseDate: baseDateTimestamp, // 분석 시작 시간 (timestamp)
          timeFrame: phase1Config.timeFrame, // 메인 타임프레임
          decisionInterval: phase1Config.decisionInterval // 판단 주기 (1분, 2분, 5분)
        }
      })
    }
  }

  const handleCancel = () => {
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
      const ratio = normalized * 2
      r = Math.round(0 + (255 - 0) * ratio)
      g = Math.round(0 + (255 - 0) * ratio)
      b = 255
    } else {
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

  const formatReturn = (value: number): string => {
    return Math.round(value).toLocaleString('en-US')
  }

  const handleCellClick = (sellConditionCount: number, sellThreshold: number) => {
    setSelectedCell({ sellConditionCount, sellThreshold })
  }

  return (
    <div className="space-y-4">
      {/* 뒤로가기 버튼 */}
      <div>
        <button
          onClick={onBack}
          className="inline-flex items-center gap-2 text-sm text-foreground/60 hover:text-brand transition"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Phase 1로 돌아가기
        </button>
      </div>

      {/* Phase 2B 설정 */}
      <Card className="p-3">
        <h2 className="text-lg font-bold mb-3">Phase 2B: 매도 미세 조정</h2>
        
        <div className="grid md:grid-cols-[1fr,auto] gap-3">
          <div className="space-y-3">
            {/* 고정 조건 표시 */}
            <div className="p-2 bg-surface-75 rounded border border-border">
              <div className="text-xs text-foreground/70 mb-1">고정 조건 (Phase 1 선택)</div>
              <div className="text-sm font-medium">
                매수 조건: {phase1Baseline.conditionCount}개 | 
                매수 임계값: {phase1Baseline.buyThreshold.toFixed(phase1Config.decimalPlaces)} | 
                기준 수익률: {formatReturn(phase1Baseline.totalReturn)}%
              </div>
            </div>

            {/* 탐색 범위 설정 */}
            <div className="flex items-center gap-3 flex-wrap text-xs">
              {/* 매도 조건 범위 */}
              <div className="flex items-center gap-1.5">
                <span className="font-medium text-foreground/70 whitespace-nowrap">매도 조건</span>
                <input
                  type="number"
                  value={sellConditionMin}
                  onChange={(e) => setSellConditionMin(Number(e.target.value))}
                  min={1}
                  max={10}
                  className="px-2 py-0.5 bg-surface border border-border rounded text-foreground focus:outline-none focus:ring-1 focus:ring-brand text-xs h-7 w-16 text-center"
                />
                <span className="text-foreground/50">~</span>
                <input
                  type="number"
                  value={sellConditionMax}
                  onChange={(e) => setSellConditionMax(Number(e.target.value))}
                  min={1}
                  max={10}
                  className="px-2 py-0.5 bg-surface border border-border rounded text-foreground focus:outline-none focus:ring-1 focus:ring-brand text-xs h-7 w-16 text-center"
                />
              </div>

              {/* 구분선 */}
              <div className="w-px h-6 bg-border" />

              {/* 매도 임계값 범위 */}
              <div className="flex items-center gap-1.5">
                <span className="font-medium text-foreground/70 whitespace-nowrap">매도 임계값</span>
                <input
                  type="number"
                  value={sellThresholdMin}
                  onChange={(e) => setSellThresholdMin(Number(e.target.value))}
                  min={-2.0}
                  max={0.0}
                  step={0.01}
                  className="px-2 py-0.5 bg-surface border border-border rounded text-foreground focus:outline-none focus:ring-1 focus:ring-brand text-xs h-7 w-16 text-center"
                />
                <span className="text-foreground/50">~</span>
                <input
                  type="number"
                  value={sellThresholdMax}
                  onChange={(e) => setSellThresholdMax(Number(e.target.value))}
                  min={-2.0}
                  max={0.0}
                  step={0.01}
                  className="px-2 py-0.5 bg-surface border border-border rounded text-foreground focus:outline-none focus:ring-1 focus:ring-brand text-xs h-7 w-16 text-center"
                />
              </div>

              <div className="text-xs text-foreground/50">
                (권장: ±3 조건, ±0.5 임계값)
              </div>
            </div>
          </div>

          {/* 시뮬레이션 버튼 */}
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
              <span className="text-foreground/70">{progressMessage}</span>
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

      {/* Phase 2B 결과 */}
      {phase2bResults && (
        <Card className="p-3">
          <div className="mb-4">
            <h2 className="text-xl font-bold mb-2">시뮬레이션 결과</h2>
            <div className="text-sm text-foreground/70">
              <span className="mr-4">
                최소 수익률: <span className="font-bold text-blue-400">{formatReturn(phase2bResults.minReturn)}%</span>
              </span>
              <span>
                최대 수익률: <span className="font-bold text-red-400">{formatReturn(phase2bResults.maxReturn)}%</span>
              </span>
            </div>
            <div className="mt-2 text-sm">
              <span className="font-bold text-brand">
                최적 조합: 매수 {phase2bResults.bestResult.buyConditionCount}개/{phase2bResults.bestResult.buyThreshold.toFixed(phase1Config.decimalPlaces)}, 
                매도 {phase2bResults.bestResult.sellConditionCount}개/{phase2bResults.bestResult.sellThreshold.toFixed(phase1Config.decimalPlaces)} 
                (수익률 {formatReturn(phase2bResults.bestResult.totalReturn)}%)
              </span>
            </div>
            <div className="mt-1 text-sm text-foreground/70">
              Phase 1 대비 수익률 개선: {formatReturn(phase2bResults.bestResult.totalReturn - phase1Baseline.totalReturn)}%p
            </div>
          </div>

          {/* 색상 범례 */}
          <div className="flex items-center gap-4 mb-4 text-sm">
            <span className="text-foreground/70">수익률:</span>
            <div className="flex items-center gap-2">
              <div className="w-8 h-4 rounded" style={{ backgroundColor: getCellColors(phase2bResults.minReturn, phase2bResults.minReturn, phase2bResults.maxReturn).background }} />
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
              <div className="w-8 h-4 rounded" style={{ backgroundColor: getCellColors(phase2bResults.maxReturn, phase2bResults.minReturn, phase2bResults.maxReturn).background }} />
            </div>
          </div>

          {/* 모바일 최적값 요약 카드 */}
          <div className="md:hidden mb-4 p-4 bg-brand/20 border-2 border-brand rounded-lg">
            <div className="text-sm font-bold text-brand mb-2">🏆 최고 수익률</div>
            <div className="text-2xl font-bold mb-2">{formatReturn(phase2bResults.bestResult.totalReturn)}%</div>
            <div className="text-xs text-foreground/70 mb-2">
              매수: {phase2bResults.bestResult.buyConditionCount}개, {phase2bResults.bestResult.buyThreshold.toFixed(phase1Config.decimalPlaces)} | 
              매도: {phase2bResults.bestResult.sellConditionCount}개, {phase2bResults.bestResult.sellThreshold.toFixed(phase1Config.decimalPlaces)}
            </div>
            {onShowDetail && (
              <button
                onClick={() => onShowDetail(
                  phase2bResults.bestResult.buyConditionCount,
                  phase2bResults.bestResult.buyThreshold,
                  phase2bResults.bestResult.sellConditionCount,
                  phase2bResults.bestResult.sellThreshold
                )}
                className="w-full mt-2 px-3 py-1.5 text-xs bg-brand hover:bg-brand/80 text-background rounded transition"
              >
                📊 거래 내역 상세보기
              </button>
            )}
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
                  <th className="border border-border p-2 bg-surface-75 w-16">
                    매도조건 \ 임계값
                  </th>
                  {phase2bResults.sellThresholds.map((threshold) => (
                    <th key={threshold} className="border border-border p-2 bg-surface-75 whitespace-nowrap">
                      {threshold.toFixed(phase1Config.decimalPlaces)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {phase2bResults.results.map((row, rowIdx) => (
                  <tr key={rowIdx}>
                    <td className="border border-border p-2 font-medium bg-surface-75 sticky left-0 w-16 text-center">
                      {phase2bResults.sellConditionCounts[rowIdx]}
                    </td>
                    {row.map((cell, colIdx) => {
                      const colors = getCellColors(cell.totalReturn, phase2bResults.minReturn, phase2bResults.maxReturn)
                      const isBest = cell.sellConditionCount === phase2bResults.bestResult.sellConditionCount && 
                                     cell.sellThreshold === phase2bResults.bestResult.sellThreshold
                      
                      return (
                        <td
                          key={colIdx}
                          className={`border border-border p-2 text-center cursor-pointer hover:opacity-80 hover:ring-2 hover:ring-brand transition ${
                            isBest ? 'ring-2 ring-yellow-400 font-bold' : ''
                          } ${
                            selectedCell?.sellConditionCount === cell.sellConditionCount && selectedCell?.sellThreshold === cell.sellThreshold
                              ? 'ring-2 ring-brand'
                              : ''
                          }`}
                          style={{
                            backgroundColor: colors.background,
                            color: colors.text
                          }}
                          title={`매도 ${cell.sellConditionCount}개, ${cell.sellThreshold.toFixed(phase1Config.decimalPlaces)}\n수익률: ${formatReturn(cell.totalReturn)}%\n거래 횟수: ${cell.tradeCount}`}
                          onClick={() => handleCellClick(cell.sellConditionCount, cell.sellThreshold)}
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

          <div className="mt-4 text-xs text-foreground/60">
            <p>* 최고 수익률 셀은 노란색 테두리로 표시됩니다</p>
          </div>

          <div className="mt-4 space-y-2">
            {onShowDetail && (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => onShowDetail(
                  phase2bResults.bestResult.buyConditionCount,
                  phase2bResults.bestResult.buyThreshold,
                  phase2bResults.bestResult.sellConditionCount,
                  phase2bResults.bestResult.sellThreshold
                )}
                className="w-full"
              >
                📊 최고 수익 거래 내역 상세보기
              </Button>
            )}
            {onGoToCompare && (
              <Button
                variant="primary"
                size="sm"
                onClick={onGoToCompare}
                className="w-full"
              >
                📊 Phase 2 결과 비교하기
              </Button>
            )}
          </div>
        </Card>
      )}
    </div>
  )
}

