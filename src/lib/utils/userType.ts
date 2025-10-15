/**
 * 사용자 타입 관련 유틸리티 함수
 */

export type UserType = 'admin' | 'member' | 'quest'

/**
 * 사용자 타입을 표시용 라벨로 변환
 * @param userType - 사용자 타입
 * @returns 표시용 라벨 문자열
 * 
 * @example
 * getUserTypeLabel('admin') // "Admin"
 * getUserTypeLabel('member') // "Member"
 * getUserTypeLabel('quest') // "Guest"
 */
export function getUserTypeLabel(userType: UserType | string): string {
  switch (userType) {
    case 'admin':
      return 'Admin'
    case 'member':
      return 'Member'
    case 'quest':
      return 'Guest'
    default:
      return userType
  }
}

/**
 * 사용자 타입에 따른 뱃지 색상 클래스 반환
 * @param userType - 사용자 타입
 * @returns Tailwind CSS 클래스 문자열
 * 
 * @example
 * getUserTypeBadgeColor('admin') // "bg-brand text-background"
 */
export function getUserTypeBadgeColor(userType: UserType | string): string {
  switch (userType) {
    case 'admin':
      return 'bg-brand text-background'
    case 'member':
      return 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
    case 'quest':
      return 'bg-surface-75 text-foreground/60 border border-border'
    default:
      return 'bg-surface-75 text-foreground/60'
  }
}

/**
 * 사용자 타입 설명 반환
 * @param userType - 사용자 타입
 * @returns 사용자 타입 설명
 * 
 * @example
 * getUserTypeDescription('admin') // "전체 관리 권한"
 */
export function getUserTypeDescription(userType: UserType | string): string {
  switch (userType) {
    case 'admin':
      return '전체 관리 권한'
    case 'member':
      return '일반 사용자'
    case 'quest':
      return '게스트 사용자'
    default:
      return ''
  }
}

