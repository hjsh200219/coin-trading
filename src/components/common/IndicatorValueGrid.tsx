/**
 * 지표 값 표시 그리드 컴포넌트
 * 차트 하단에 현재 지표 값들을 그리드 형태로 표시
 */

export interface ValueItem {
  /** 라벨 텍스트 */
  label: string
  /** 표시할 값 */
  value: string | number
  /** 값의 색상 (Tailwind 클래스 또는 hex) */
  color?: string
  /** 추가 CSS 클래스 */
  className?: string
  /** 값 포맷터 함수 */
  formatter?: (value: string | number) => string
}

interface IndicatorValueGridProps {
  /** 표시할 값 목록 */
  items: ValueItem[]
  /** 그리드 컬럼 수 (기본값: 2) */
  columns?: 2 | 3 | 4
  /** 추가 CSS 클래스 */
  className?: string
}

/**
 * 지표 값을 그리드 형태로 표시하는 컴포넌트
 * 
 * @example
 * <IndicatorValueGrid
 *   items={[
 *     { label: 'MACD', value: 123.45, color: 'text-[#3ecf8e]' },
 *     { label: 'Signal', value: 120.00, color: 'text-[#fbbf24]' },
 *   ]}
 *   columns={2}
 * />
 */
export default function IndicatorValueGrid({
  items,
  columns = 2,
  className = '',
}: IndicatorValueGridProps) {
  const gridClass = {
    2: 'grid-cols-2',
    3: 'grid-cols-3',
    4: 'grid-cols-4',
  }[columns]

  return (
    <div className={`grid ${gridClass} gap-3 text-sm pt-2 border-t border-border ${className}`}>
      {items.map((item, index) => {
        const displayValue = item.formatter
          ? item.formatter(item.value)
          : typeof item.value === 'number'
          ? item.value.toFixed(2)
          : item.value

        return (
          <div key={index}>
            <p className="text-xs text-foreground/60">{item.label}</p>
            <p
              className={`font-medium ${item.color || 'text-foreground'} ${item.className || ''}`}
              style={
                item.color && item.color.startsWith('#')
                  ? { color: item.color }
                  : undefined
              }
            >
              {displayValue}
            </p>
          </div>
        )
      })}
    </div>
  )
}

