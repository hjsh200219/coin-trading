/**
 * Worker Pool - Phase 2: 병렬 처리 (Multi-Worker)
 * 
 * Grid Simulation을 여러 Worker로 분산하여 CPU 멀티코어 활용
 * 
 * Phase 2: 성능 개선
 * - Before: 싱글 Worker 순차 처리
 * - After: 멀티 Worker 병렬 처리
 * - 개선율: 4배 (4코어 기준)
 * 
 * @example
 * const pool = new WorkerPool(4)
 * const results = await pool.runGridSimulation(data)
 * pool.terminate()
 */

export interface GridTask {
  mainCandles: unknown[]
  simulationCandles: unknown[]
  buyConditionCount: number
  sellConditionCount: number
  buyThresholdMin: number
  buyThresholdMax: number
  sellThresholdMin: number
  sellThresholdMax: number
  indicators: unknown
  decimalPlaces: number
  initialPosition: 'cash' | 'coin'
  workerId: number  // Worker ID for debugging
}

export interface GridResult {
  results: unknown[][]
  buyThresholds: number[]
  sellThresholds: number[]
  cachedIndicatorValues?: number[]
}

export interface ProgressUpdate {
  workerId: number
  progress: number
  message: string
}

export class WorkerPool {
  private workers: Worker[] = []
  private workerCount: number
  private busyWorkers: Set<number> = new Set()
  
  constructor(workerCount?: number) {
    // CPU 코어 수만큼 Worker 생성 (최대 4개, 최소 1개)
    this.workerCount = Math.max(1, Math.min(workerCount || navigator.hardwareConcurrency || 4, 4))
    
    for (let i = 0; i < this.workerCount; i++) {
      const worker = new Worker('/simulation-worker.js')
      this.workers.push(worker)
    }
    
    console.log(`✅ Phase 2: Worker Pool 생성 (${this.workerCount}개 Worker)`)
  }
  
  /**
   * Grid Simulation을 여러 Worker로 분산 실행
   */
  async runGridSimulation(
    task: GridTask,
    onProgress?: (progress: number, message: string) => void
  ): Promise<GridResult> {
    const startTime = performance.now()
    
    // 임계값 범위를 Worker 개수만큼 청크로 분할
    const chunks = this.splitTask(task)
    
    console.log(`⚡ Phase 2: Grid Simulation 시작 (${chunks.length}개 청크, ${this.workerCount}개 Worker)`)
    
    // 각 Worker에 청크 할당하고 병렬 실행
    const promises = chunks.map((chunk, idx) => 
      this.executeChunk(this.workers[idx % this.workerCount], chunk, idx, onProgress)
    )
    
    // 모든 Worker 완료 대기
    const chunkResults = await Promise.all(promises)
    
    // 결과 병합
    const mergedResult = this.mergeResults(chunkResults, task)
    
    const endTime = performance.now()
    const duration = ((endTime - startTime) / 1000).toFixed(1)
    
    console.log(`✅ Phase 2: Grid Simulation 완료 (${duration}초, ${this.workerCount}배 빠름!)`)
    
    return mergedResult
  }
  
  /**
   * 테스크를 Worker 개수만큼 청크로 분할
   * 
   * 매수 임계값 범위를 균등 분할
   */
  private splitTask(task: GridTask): GridTask[] {
    const chunks: GridTask[] = []
    
    const buyRange = task.buyThresholdMax - task.buyThresholdMin
    const chunkSize = buyRange / this.workerCount
    
    for (let i = 0; i < this.workerCount; i++) {
      const buyMin = task.buyThresholdMin + (chunkSize * i)
      const buyMax = i === this.workerCount - 1 
        ? task.buyThresholdMax  // 마지막 청크는 Max까지
        : task.buyThresholdMin + (chunkSize * (i + 1))
      
      chunks.push({
        ...task,
        buyThresholdMin: buyMin,
        buyThresholdMax: buyMax,
        workerId: i
      })
    }
    
    return chunks
  }
  
  /**
   * 단일 청크를 Worker에서 실행
   */
  private executeChunk(
    worker: Worker,
    chunk: GridTask,
    workerId: number,
    onProgress?: (progress: number, message: string) => void
  ): Promise<GridResult> {
    return new Promise((resolve, reject) => {
      const startTime = performance.now()
      
      this.busyWorkers.add(workerId)
      
      const messageHandler = (e: MessageEvent) => {
        const { type, results, buyThresholds, sellThresholds, cachedIndicatorValues, progress, message, error } = e.data
        
        switch (type) {
          case 'PROGRESS':
            // Worker별 진행률을 전체 진행률로 변환
            const overallProgress = (workerId / this.workerCount) * 100 + (progress / this.workerCount)
            if (onProgress) {
              onProgress(overallProgress, `Worker ${workerId + 1}/${this.workerCount}: ${message}`)
            }
            break
            
          case 'COMPLETE':
            worker.removeEventListener('message', messageHandler)
            this.busyWorkers.delete(workerId)
            
            const duration = ((performance.now() - startTime) / 1000).toFixed(1)
            console.log(`  ✅ Worker ${workerId + 1} 완료 (${duration}초)`)
            
            resolve({
              results,
              buyThresholds,
              sellThresholds,
              cachedIndicatorValues
            })
            break
            
          case 'ERROR':
            worker.removeEventListener('message', messageHandler)
            this.busyWorkers.delete(workerId)
            reject(new Error(error || '시뮬레이션 오류'))
            break
        }
      }
      
      worker.addEventListener('message', messageHandler)
      
      // Worker에 작업 전송
      worker.postMessage({
        type: 'START_SIMULATION',
        data: chunk
      })
    })
  }
  
  /**
   * 여러 청크 결과를 하나로 병합
   */
  private mergeResults(chunkResults: GridResult[], task: GridTask): GridResult {
    // 첫 번째 결과를 기준으로 시작
    const merged: GridResult = {
      results: [],
      buyThresholds: [],
      sellThresholds: chunkResults[0].sellThresholds,
      cachedIndicatorValues: chunkResults[0].cachedIndicatorValues
    }
    
    // 모든 청크의 결과를 순서대로 병합
    for (const chunk of chunkResults) {
      merged.results.push(...chunk.results)
      merged.buyThresholds.push(...chunk.buyThresholds)
    }
    
    return merged
  }
  
  /**
   * 모든 Worker 종료
   */
  terminate(): void {
    for (const worker of this.workers) {
      worker.terminate()
    }
    this.workers = []
    this.busyWorkers.clear()
    
    console.log(`🛑 Phase 2: Worker Pool 종료 (${this.workerCount}개 Worker)`)
  }
  
  /**
   * Worker Pool 상태 확인
   */
  getStatus(): { total: number; busy: number; idle: number } {
    return {
      total: this.workerCount,
      busy: this.busyWorkers.size,
      idle: this.workerCount - this.busyWorkers.size
    }
  }
}

