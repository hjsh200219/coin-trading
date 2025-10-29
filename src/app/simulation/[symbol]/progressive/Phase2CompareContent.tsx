'use client'

import { useState } from 'react'
import { Card } from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import type { Phase2AGrid, Phase2BGrid, SavedCondition } from '@/types/simulation'

interface Phase2CompareContentProps {
  symbol: string
  phase2aResults: Phase2AGrid | null
  phase2bResults: Phase2BGrid | null
  onGoToPhase2A: () => void
  onGoToPhase2B: () => void
  onBackToPhase1: () => void
  onShowDetail?: (buyConditionCount: number, buyThreshold: number, sellConditionCount: number, sellThreshold: number) => void
}

export default function Phase2CompareContent({
  symbol,
  phase2aResults,
  phase2bResults,
  onGoToPhase2A,
  onGoToPhase2B,
  onBackToPhase1,
  onShowDetail
}: Phase2CompareContentProps) {
  const [saveName, setSaveName] = useState('')
  const [saveMemo, setSaveMemo] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  const formatReturn = (value: number): string => {
    return Math.round(value).toLocaleString('en-US')
  }

  // 최고 결과 계산
  const bestOverallResult = (() => {
    if (!phase2aResults || !phase2bResults) return null
    
    const phase2aReturn = phase2aResults.bestResult.totalReturn
    const phase2bReturn = phase2bResults.bestResult.totalReturn
    
    return phase2aReturn >= phase2bReturn
      ? { phase: '2A' as const, result: phase2aResults.bestResult }
      : { phase: '2B' as const, result: phase2bResults.bestResult }
  })()

  // 조건 저장
  const handleSaveCondition = () => {
    if (!bestOverallResult) return
    if (!saveName.trim()) {
      alert('조건 이름을 입력해주세요.')
      return
    }

    const condition: SavedCondition = {
      id: Date.now().toString(),
      name: saveName.trim(),
      buyConditionCount: bestOverallResult.result.buyConditionCount,
      buyThreshold: bestOverallResult.result.buyThreshold,
      sellConditionCount: bestOverallResult.result.sellConditionCount,
      sellThreshold: bestOverallResult.result.sellThreshold,
      expectedReturn: bestOverallResult.result.totalReturn,
      tradeCount: bestOverallResult.result.tradeCount,
      source: bestOverallResult.phase === '2A' ? 'phase2a' : 'phase2b',
      createdAt: Date.now(),
      memo: saveMemo.trim() || undefined
    }

    try {
      // 기존 조건 불러오기
      const stored = localStorage.getItem(`progressive_${symbol}_savedConditions`)
      const existing = stored ? JSON.parse(stored) : { conditions: [] }
      
      // 새 조건 추가
      existing.conditions.unshift(condition)
      
      // 최대 20개까지만 저장
      if (existing.conditions.length > 20) {
        existing.conditions = existing.conditions.slice(0, 20)
      }
      
      // 저장
      localStorage.setItem(`progressive_${symbol}_savedConditions`, JSON.stringify(existing))
      
      alert('조건이 저장되었습니다!')
      setSaveName('')
      setSaveMemo('')
      setIsSaving(false)
    } catch (error) {
      console.error('조건 저장 실패:', error)
      alert('조건 저장에 실패했습니다.')
    }
  }

  // 권장 전략 결정 (더 높은 수익률)
  const recommendedPhase = phase2aResults && phase2bResults
    ? phase2aResults.bestResult.totalReturn > phase2bResults.bestResult.totalReturn
      ? 'phase2a'
      : 'phase2b'
    : phase2aResults
      ? 'phase2a'
      : 'phase2b'

  const recommendedResult = recommendedPhase === 'phase2a' ? phase2aResults?.bestResult : phase2bResults?.bestResult

  return (
    <div className="space-y-4">
      {/* 뒤로가기 버튼 */}
      <div>
        <button
          onClick={onBackToPhase1}
          className="inline-flex items-center gap-2 text-sm text-foreground/60 hover:text-brand transition"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Phase 1로 돌아가기
        </button>
      </div>

      {/* 제목 */}
      <Card className="p-4">
        <h2 className="text-xl font-bold mb-2">Phase 2: 최적 조합 비교</h2>
        <p className="text-sm text-foreground/70">
          매수 미세 조정과 매도 미세 조정 결과를 비교하여 최적의 전략을 찾습니다.
        </p>
      </Card>

      {/* Phase 2A & 2B 비교 카드 */}
      <div className="grid md:grid-cols-2 gap-4">
        {/* Phase 2A 카드 */}
        <Card className={`p-4 ${recommendedPhase === 'phase2a' ? 'ring-2 ring-brand' : ''}`}>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-bold">Phase 2A: 매수 최적화</h3>
            {recommendedPhase === 'phase2a' && (
              <span className="text-xs bg-brand text-background px-2 py-1 rounded font-bold">추천 ★</span>
            )}
          </div>

          {phase2aResults ? (
            <>
              <div className="space-y-2 mb-4">
                <div className="text-sm">
                  <span className="text-foreground/70">고정 조건:</span>
                  <div className="font-medium">
                    매도 {phase2aResults.fixedSellCondition}개, {phase2aResults.fixedSellThreshold.toFixed(3)}
                  </div>
                </div>

                <div className="text-sm">
                  <span className="text-foreground/70">최고 수익률:</span>
                  <div className="text-2xl font-bold text-brand">
                    {formatReturn(phase2aResults.bestResult.totalReturn)}%
                  </div>
                </div>

                <div className="text-sm">
                  <span className="text-foreground/70">최적 조합:</span>
                  <div className="font-medium space-y-1">
                    <div>• 매수: {phase2aResults.bestResult.buyConditionCount}개, {phase2aResults.bestResult.buyThreshold.toFixed(3)}</div>
                    <div>• 매도: {phase2aResults.bestResult.sellConditionCount}개, {phase2aResults.bestResult.sellThreshold.toFixed(3)}</div>
                  </div>
                </div>

                {phase2aResults.phase1Baseline && (
                  <div className="text-sm">
                    <span className="text-foreground/70">Phase 1 대비:</span>
                    <div className="font-medium text-green-400">
                      +{formatReturn(phase2aResults.bestResult.totalReturn - phase2aResults.phase1Baseline.totalReturn)}%p
                    </div>
                  </div>
                )}
              </div>

              <Button
                variant="secondary"
                size="sm"
                onClick={onGoToPhase2A}
                className="w-full"
              >
                📊 표 보기
              </Button>
            </>
          ) : (
            <div className="text-center py-8">
              <p className="text-foreground/50 mb-4">아직 시뮬레이션을 실행하지 않았습니다</p>
              <Button
                variant="primary"
                size="sm"
                onClick={onGoToPhase2A}
              >
                Phase 2A 시작하기
              </Button>
            </div>
          )}
        </Card>

        {/* Phase 2B 카드 */}
        <Card className={`p-4 ${recommendedPhase === 'phase2b' ? 'ring-2 ring-brand' : ''}`}>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-bold">Phase 2B: 매도 최적화</h3>
            {recommendedPhase === 'phase2b' && (
              <span className="text-xs bg-brand text-background px-2 py-1 rounded font-bold">추천 ★</span>
            )}
          </div>

          {phase2bResults ? (
            <>
              <div className="space-y-2 mb-4">
                <div className="text-sm">
                  <span className="text-foreground/70">고정 조건:</span>
                  <div className="font-medium">
                    매수 {phase2bResults.fixedBuyCondition}개, {phase2bResults.fixedBuyThreshold.toFixed(3)}
                  </div>
                </div>

                <div className="text-sm">
                  <span className="text-foreground/70">최고 수익률:</span>
                  <div className="text-2xl font-bold text-brand">
                    {formatReturn(phase2bResults.bestResult.totalReturn)}%
                  </div>
                </div>

                <div className="text-sm">
                  <span className="text-foreground/70">최적 조합:</span>
                  <div className="font-medium space-y-1">
                    <div>• 매수: {phase2bResults.bestResult.buyConditionCount}개, {phase2bResults.bestResult.buyThreshold.toFixed(3)}</div>
                    <div>• 매도: {phase2bResults.bestResult.sellConditionCount}개, {phase2bResults.bestResult.sellThreshold.toFixed(3)}</div>
                  </div>
                </div>

                {phase2bResults.phase1Baseline && (
                  <div className="text-sm">
                    <span className="text-foreground/70">Phase 1 대비:</span>
                    <div className="font-medium text-green-400">
                      +{formatReturn(phase2bResults.bestResult.totalReturn - phase2bResults.phase1Baseline.totalReturn)}%p
                    </div>
                  </div>
                )}
              </div>

              <Button
                variant="secondary"
                size="sm"
                onClick={onGoToPhase2B}
                className="w-full"
              >
                📊 표 보기
              </Button>
            </>
          ) : (
            <div className="text-center py-8">
              <p className="text-foreground/50 mb-4">아직 시뮬레이션을 실행하지 않았습니다</p>
              <Button
                variant="primary"
                size="sm"
                onClick={onGoToPhase2B}
              >
                Phase 2B 시작하기
              </Button>
            </div>
          )}
        </Card>
      </div>

      {/* 권장 전략 */}
      {recommendedResult && (
        <Card className="p-4 bg-brand/10 border-brand">
          <h3 className="text-lg font-bold mb-3 flex items-center gap-2">
            <span className="text-2xl">🎯</span>
            권장 전략: {recommendedPhase === 'phase2a' ? 'Phase 2A' : 'Phase 2B'} 결과
          </h3>

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <h4 className="text-sm font-medium text-foreground/70 mb-2">최종 매매 조건</h4>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-foreground/70">매수 조건 개수:</span>
                  <span className="font-bold">{recommendedResult.buyConditionCount}개</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-foreground/70">매수 임계값:</span>
                  <span className="font-bold">{recommendedResult.buyThreshold.toFixed(3)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-foreground/70">매도 조건 개수:</span>
                  <span className="font-bold">{recommendedResult.sellConditionCount}개</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-foreground/70">매도 임계값:</span>
                  <span className="font-bold">{recommendedResult.sellThreshold.toFixed(3)}</span>
                </div>
              </div>
            </div>

            <div>
              <h4 className="text-sm font-medium text-foreground/70 mb-2">예상 성과</h4>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-foreground/70">예상 수익률:</span>
                  <span className="font-bold text-brand text-lg">{formatReturn(recommendedResult.totalReturn)}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-foreground/70">거래 횟수:</span>
                  <span className="font-bold">{recommendedResult.tradeCount}회</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-foreground/70">홀드 대비:</span>
                  <span className="font-bold text-green-400">
                    +{formatReturn(recommendedResult.totalReturn - recommendedResult.holdReturn)}%p
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* 액션 버튼 */}
          <div className="mt-4">
            {!isSaving ? (
              <div className="space-y-2">
                <div className="flex gap-2 flex-wrap">
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={recommendedPhase === 'phase2a' ? onGoToPhase2A : onGoToPhase2B}
                    className="flex-1 min-w-[120px]"
                  >
                    📊 표 보기
                  </Button>
                  {onShowDetail && recommendedResult && (
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => onShowDetail(
                        recommendedResult.buyConditionCount,
                        recommendedResult.buyThreshold,
                        recommendedResult.sellConditionCount,
                        recommendedResult.sellThreshold
                      )}
                      className="flex-1 min-w-[120px]"
                    >
                      📈 거래 내역
                    </Button>
                  )}
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setIsSaving(true)}
                    className="flex-1 min-w-[120px]"
                  >
                    💾 조건 저장
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium text-foreground/70 mb-1 block">
                    조건 이름 <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={saveName}
                    onChange={(e) => setSaveName(e.target.value)}
                    placeholder="예: 비트코인 최적 조건 1차"
                    className="w-full px-3 py-2 bg-surface border border-border rounded text-foreground focus:outline-none focus:ring-2 focus:ring-brand text-sm"
                    maxLength={50}
                  />
                </div>

                <div>
                  <label className="text-sm font-medium text-foreground/70 mb-1 block">
                    메모 (선택)
                  </label>
                  <textarea
                    value={saveMemo}
                    onChange={(e) => setSaveMemo(e.target.value)}
                    placeholder="조건에 대한 설명이나 참고사항을 입력하세요"
                    className="w-full px-3 py-2 bg-surface border border-border rounded text-foreground focus:outline-none focus:ring-2 focus:ring-brand text-sm resize-none"
                    rows={2}
                    maxLength={200}
                  />
                </div>

                <div className="flex gap-2">
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={handleSaveCondition}
                    className="flex-1"
                  >
                    저장
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      setSaveName('')
                      setSaveMemo('')
                      setIsSaving(false)
                    }}
                    className="flex-1"
                  >
                    취소
                  </Button>
                </div>
              </div>
            )}
          </div>
        </Card>
      )}

      {/* 가이드 */}
      <Card className="p-4 bg-surface-75">
        <h3 className="text-sm font-bold mb-2">💡 사용 팁</h3>
        <ul className="text-xs text-foreground/70 space-y-1">
          <li>• Phase 2A와 2B 중 더 높은 수익률을 보이는 전략을 권장합니다</li>
          <li>• 각 Phase의 &ldquo;표 보기&rdquo; 버튼으로 상세한 시뮬레이션 결과를 확인할 수 있습니다</li>
          <li>• Phase 1로 돌아가서 다른 기준점으로 다시 탐색할 수 있습니다</li>
          <li>• 권장 전략의 조건을 메모하여 실전 거래에 활용하세요</li>
        </ul>
      </Card>
    </div>
  )
}

