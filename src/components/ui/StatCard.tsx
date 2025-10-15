/**
 * 통계 정보 표시 카드 컴포넌트
 * 라벨과 값을 깔끔하게 표시하는 재사용 가능한 컴포넌트
 */

import { ReactNode } from 'react'

export interface StatCardProps {
  /** 라벨 텍스트 */
  label: string
  /** 표시할 값 */
  value: string | number | ReactNode
  /** 값의 색상 (Tailwind 클래스 또는 hex) */
  valueColor?: string
  /** 라벨 색상 (기본: text-foreground/60) */
  labelColor?: string
  /** 크기 */
  size?: 'xs' | 'sm' | 'md' | 'lg'
  /** 추가 CSS 클래스 */
  className?: string
  /** 값 포맷터 함수 */
  formatter?: (value: string | number) => string
}

/**
 * 통계 정보를 카드 형태로 표시하는 컴포넌트
 * 
 * @example
 * <StatCard
 *   label="24h 최고"
 *   value="65,000,000"
 *   valueColor="text-red-500"
 *   size="md"
 * />
 */
export default function StatCard({
  label,
  value,
  valueColor = 'text-foreground',
  labelColor = 'text-foreground/60',
  size = 'md',
  className = '',
  formatter,
}: StatCardProps) {
  const sizeClasses = {
    xs: {
      label: 'text-xs',
      value: 'text-sm',
      spacing: 'space-y-0.5',
    },
    sm: {
      label: 'text-xs',
      value: 'text-base',
      spacing: 'space-y-1',
    },
    md: {
      label: 'text-xs',
      value: 'text-lg',
      spacing: 'space-y-1',
    },
    lg: {
      label: 'text-sm',
      value: 'text-2xl',
      spacing: 'space-y-1',
    },
  }

  const classes = sizeClasses[size]

  const displayValue =
    typeof value === 'string' || typeof value === 'number'
      ? formatter
        ? formatter(value)
        : value
      : value

  const isHexColor = (color: string) => color.startsWith('#')

  return (
    <div className={`${classes.spacing} ${className}`}>
      <p className={`${classes.label} ${labelColor}`}>{label}</p>
      <p
        className={`font-semibold ${classes.value} ${!isHexColor(valueColor) ? valueColor : ''}`}
        style={isHexColor(valueColor) ? { color: valueColor } : undefined}
      >
        {displayValue}
      </p>
    </div>
  )
}

