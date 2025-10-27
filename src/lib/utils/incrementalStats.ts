/**
 * 증분 통계 클래스 (Incremental Statistics)
 * 
 * 슬라이딩 윈도우에서 평균과 표준편차를 O(1) 시간에 계산
 * 
 * Phase 1: 성능 개선
 * - Before: O(N × 1000) - 매번 1000개 재계산
 * - After: O(N × 1) - 증분 업데이트
 * - 개선율: 1000배
 * 
 * @example
 * const stats = new IncrementalStats(1000)
 * for (let i = 0; i < values.length; i++) {
 *   stats.add(values[i])
 *   if (stats.getCount() >= 10) {
 *     const mean = stats.getMean()
 *     const stdDev = stats.getStdDev()
 *   }
 * }
 */
export class IncrementalStats {
  private window: number[] = []
  private sum = 0
  private sumSquares = 0
  private readonly maxSize: number
  
  constructor(maxSize: number) {
    this.maxSize = maxSize
  }
  
  /**
   * 윈도우에 값 추가 (O(1))
   * 
   * 윈도우 크기가 maxSize를 초과하면 가장 오래된 값을 자동으로 제거
   */
  add(value: number): void {
    // 새 값 추가
    this.window.push(value)
    this.sum += value
    this.sumSquares += value * value
    
    // 윈도우 크기 초과 시 가장 오래된 값 제거
    if (this.window.length > this.maxSize) {
      const removed = this.window.shift()!
      this.sum -= removed
      this.sumSquares -= removed * removed
    }
  }
  
  /**
   * 현재 윈도우의 평균 계산 (O(1))
   */
  getMean(): number {
    if (this.window.length === 0) return 0
    return this.sum / this.window.length
  }
  
  /**
   * 현재 윈도우의 모표준편차 계산 (O(1))
   * 
   * 모표준편차 = sqrt(E[X²] - (E[X])²)
   */
  getStdDev(): number {
    if (this.window.length === 0) return 0
    
    const n = this.window.length
    const mean = this.getMean()
    
    // Variance = E[X²] - (E[X])²
    const variance = (this.sumSquares / n) - (mean * mean)
    
    // 부동소수점 오차로 인한 음수 방지
    return Math.sqrt(Math.max(0, variance))
  }
  
  /**
   * 현재 윈도우 크기 반환
   */
  getCount(): number {
    return this.window.length
  }
  
  /**
   * 윈도우 초기화
   */
  reset(): void {
    this.window = []
    this.sum = 0
    this.sumSquares = 0
  }
  
  /**
   * 현재 윈도우의 모든 값 반환 (디버깅용)
   */
  getWindow(): readonly number[] {
    return this.window
  }
}

/**
 * Z-Score 계산을 위한 증분 통계 컬렉션
 * 
 * 5개 지표 (MACD, RSI, AO, DP, RTI)의 통계를 각각 관리
 */
export class IncrementalStatsCollection {
  private stats: Map<string, IncrementalStats>
  
  constructor(indicators: string[], windowSize: number) {
    this.stats = new Map()
    for (const indicator of indicators) {
      this.stats.set(indicator, new IncrementalStats(windowSize))
    }
  }
  
  /**
   * 모든 지표에 값 추가
   */
  add(values: Record<string, number>): void {
    for (const [key, value] of Object.entries(values)) {
      this.stats.get(key)?.add(value)
    }
  }
  
  /**
   * 특정 지표의 평균 반환
   */
  getMean(indicator: string): number {
    return this.stats.get(indicator)?.getMean() ?? 0
  }
  
  /**
   * 특정 지표의 표준편차 반환
   */
  getStdDev(indicator: string): number {
    return this.stats.get(indicator)?.getStdDev() ?? 0
  }
  
  /**
   * 특정 지표의 데이터 개수 반환
   */
  getCount(indicator: string): number {
    return this.stats.get(indicator)?.getCount() ?? 0
  }
  
  /**
   * 최소 데이터 개수 반환 (모든 지표 중 최소값)
   */
  getMinCount(): number {
    let min = Infinity
    for (const stat of this.stats.values()) {
      min = Math.min(min, stat.getCount())
    }
    return min === Infinity ? 0 : min
  }
  
  /**
   * 모든 통계 초기화
   */
  reset(): void {
    for (const stat of this.stats.values()) {
      stat.reset()
    }
  }
}

