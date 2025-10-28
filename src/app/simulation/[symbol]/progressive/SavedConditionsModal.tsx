'use client'

import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import type { SavedCondition } from '@/types/simulation'

interface SavedConditionsModalProps {
  symbol: string
  onClose: () => void
  onLoad: (condition: SavedCondition) => void
}

export default function SavedConditionsModal({
  symbol,
  onClose,
  onLoad
}: SavedConditionsModalProps) {
  const [conditions, setConditions] = useState<SavedCondition[]>([])

  // 저장된 조건 불러오기
  useEffect(() => {
    if (typeof window === 'undefined') return
    
    try {
      const stored = localStorage.getItem(`progressive_${symbol}_savedConditions`)
      if (stored) {
        const parsed = JSON.parse(stored)
        setConditions(parsed.conditions || [])
      }
    } catch (error) {
      console.error('저장된 조건 불러오기 실패:', error)
    }
  }, [symbol])

  // 조건 삭제
  const handleDelete = (id: string) => {
    if (!confirm('이 조건을 삭제하시겠습니까?')) return

    const updated = conditions.filter(c => c.id !== id)
    setConditions(updated)

    if (typeof window !== 'undefined') {
      localStorage.setItem(
        `progressive_${symbol}_savedConditions`,
        JSON.stringify({ conditions: updated })
      )
    }
  }

  // 조건 불러오기
  const handleLoad = (condition: SavedCondition) => {
    if (!confirm(`"${condition.name}" 조건을 불러오시겠습니까?\n\n현재 설정이 덮어씌워집니다.`)) return
    onLoad(condition)
    onClose()
  }

  const formatReturn = (value: number): string => {
    return Math.round(value).toLocaleString('en-US')
  }

  const formatDate = (timestamp: number): string => {
    const date = new Date(timestamp)
    return date.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getSourceLabel = (source: string): string => {
    switch (source) {
      case 'phase1': return 'Phase 1'
      case 'phase2a': return 'Phase 2A'
      case 'phase2b': return 'Phase 2B'
      default: return source
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="max-w-4xl w-full max-h-[80vh] overflow-hidden flex flex-col">
        {/* 헤더 */}
        <div className="p-4 border-b border-border flex items-center justify-between">
          <h2 className="text-xl font-bold">저장된 조건</h2>
          <button
            onClick={onClose}
            className="text-foreground/60 hover:text-foreground transition"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* 내용 */}
        <div className="flex-1 overflow-auto p-4">
          {conditions.length === 0 ? (
            <div className="text-center py-12">
              <svg className="w-16 h-16 mx-auto text-foreground/20 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
              </svg>
              <p className="text-foreground/60">저장된 조건이 없습니다</p>
              <p className="text-xs text-foreground/40 mt-2">
                Phase 2 비교 뷰에서 조건을 저장할 수 있습니다
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {conditions.map((condition) => (
                <Card key={condition.id} className="p-4 hover:border-brand transition">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-bold text-lg">{condition.name}</h3>
                        <span className="text-xs bg-brand/20 text-brand px-2 py-0.5 rounded">
                          {getSourceLabel(condition.source)}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm mb-2">
                        <div>
                          <span className="text-foreground/60">매수:</span>{' '}
                          <span className="font-medium">{condition.buyConditionCount}개, {condition.buyThreshold.toFixed(3)}</span>
                        </div>
                        <div>
                          <span className="text-foreground/60">매도:</span>{' '}
                          <span className="font-medium">{condition.sellConditionCount}개, {condition.sellThreshold.toFixed(3)}</span>
                        </div>
                        <div>
                          <span className="text-foreground/60">수익률:</span>{' '}
                          <span className="font-bold text-brand">{formatReturn(condition.expectedReturn)}%</span>
                        </div>
                        <div>
                          <span className="text-foreground/60">거래:</span>{' '}
                          <span className="font-medium">{condition.tradeCount}회</span>
                        </div>
                      </div>

                      {condition.memo && (
                        <div className="text-xs text-foreground/60 bg-surface-75 p-2 rounded">
                          {condition.memo}
                        </div>
                      )}

                      <div className="text-xs text-foreground/40 mt-2">
                        저장: {formatDate(condition.createdAt)}
                      </div>
                    </div>

                    <div className="flex flex-col gap-2">
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => handleLoad(condition)}
                        className="whitespace-nowrap"
                      >
                        불러오기
                      </Button>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => handleDelete(condition.id)}
                        className="whitespace-nowrap text-red-400 hover:text-red-300"
                      >
                        삭제
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </Card>
    </div>
  )
}

