/**
 * 사용자 타입 뱃지 컴포넌트
 * 사용자의 권한 레벨을 시각적으로 표시
 */

import { getUserTypeLabel, getUserTypeBadgeColor, type UserType } from '@/lib/utils/userType'

export interface UserTypeBadgeProps {
  /** 사용자 타입 */
  type: UserType | string
  /** 크기 */
  size?: 'sm' | 'md' | 'lg'
  /** 추가 CSS 클래스 */
  className?: string
  /** 툴팁 표시 여부 */
  showTooltip?: boolean
}

/**
 * 사용자 타입을 뱃지 형태로 표시하는 컴포넌트
 * 
 * @example
 * <UserTypeBadge type="admin" size="md" />
 * <UserTypeBadge type="member" size="sm" />
 */
export default function UserTypeBadge({
  type,
  size = 'md',
  className = '',
  showTooltip = false,
}: UserTypeBadgeProps) {
  const sizeClasses = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-3 py-1 text-sm',
    lg: 'px-4 py-1.5 text-base',
  }

  const label = getUserTypeLabel(type)
  const colorClass = getUserTypeBadgeColor(type)

  return (
    <span
      className={`inline-flex items-center rounded-full font-medium ${sizeClasses[size]} ${colorClass} ${className}`}
      title={showTooltip ? label : undefined}
    >
      {label}
    </span>
  )
}

