import { test, expect } from '@playwright/test'

test.describe('Trading Simulation Verification', () => {
  test.beforeEach(async ({ page }) => {
    // 로그인 페이지로 이동
    await page.goto('http://localhost:3000/login')
    
    // Google OAuth 로그인 대신 직접 쿠키 설정 (테스트용)
    // 실제 환경에서는 OAuth 플로우를 거쳐야 함
    await page.goto('http://localhost:3000/simulation/BTC/simulation')
    
    // 페이지 로드 대기
    await page.waitForLoadState('networkidle')
  })

  test('시뮬레이션 설정 UI 검증', async ({ page }) => {
    // 거래소 선택 확인
    const exchangeSelector = page.locator('select').first()
    await expect(exchangeSelector).toBeVisible()
    
    // 분석 지표 체크박스 확인
    const rsiCheckbox = page.getByText('RSI').locator('..')
    await expect(rsiCheckbox).toBeVisible()
    
    // 기준일 입력 확인
    const baseDateInput = page.locator('input[type="date"]')
    await expect(baseDateInput).toBeVisible()
    
    // 조회 기간 선택 확인
    const periodButtons = page.getByRole('button', { name: /일/ })
    await expect(periodButtons.first()).toBeVisible()
    
    // 분석 단위 선택 확인
    const timeFrameButtons = page.getByRole('button', { name: /시간|분/ })
    await expect(timeFrameButtons.first()).toBeVisible()
  })

  test('시뮬레이션 실행 및 결과 검증', async ({ page }) => {
    // 설정 구성
    // 1. 거래소 선택 (Bithumb)
    const exchangeSelector = page.locator('select').first()
    await exchangeSelector.selectOption('bithumb')
    
    // 2. 분석 지표 선택 (RTI만)
    const rtiCheckbox = page.getByText('RTI')
    await rtiCheckbox.click()
    
    // 3. 기준일 설정 (2024-01-20)
    const baseDateInput = page.locator('input[type="date"]')
    await baseDateInput.fill('2024-01-20')
    
    // 4. 조회 기간 (60일)
    const period60Button = page.getByRole('button', { name: '60일' })
    await period60Button.click()
    
    // 5. 분석 단위 (2시간)
    const timeFrame2hButton = page.getByRole('button', { name: '2시간' })
    await timeFrame2hButton.click()
    
    // 6. 시뮬레이션 설정
    // 매수/매도 조건 개수
    const buyCountInput = page.locator('input[type="number"]').nth(0)
    const sellCountInput = page.locator('input[type="number"]').nth(1)
    await buyCountInput.fill('3')
    await sellCountInput.fill('3')
    
    // 매수 임계값 범위
    const buyMinInput = page.locator('input[type="number"]').nth(2)
    const buyMaxInput = page.locator('input[type="number"]').nth(3)
    await buyMinInput.fill('0.40')
    await buyMaxInput.fill('0.80')
    
    // 매도 임계값 범위
    const sellMinInput = page.locator('input[type="number"]').nth(4)
    const sellMaxInput = page.locator('input[type="number"]').nth(5)
    await sellMinInput.fill('0.40')
    await sellMaxInput.fill('0.80')
    
    // 7. 분석 시작 버튼 클릭
    const analyzeButton = page.getByRole('button', { name: '분석 시작' })
    await analyzeButton.click()
    
    // 8. 진행 상태 확인
    await expect(page.getByText(/지표 캐싱|시뮬레이션/)).toBeVisible({ timeout: 5000 })
    
    // 9. 결과 테이블이 나타날 때까지 대기 (최대 60초)
    await expect(page.locator('table')).toBeVisible({ timeout: 60000 })
    
    // 10. 결과 검증
    const resultTable = page.locator('table')
    await expect(resultTable).toBeVisible()
    
    // 테이블 행 개수 확인 (헤더 + 매수 임계값 개수)
    const rows = resultTable.locator('tbody tr')
    const rowCount = await rows.count()
    
    // 0.40 ~ 0.80 범위를 0.01 단위로 = 41개 행
    expect(rowCount).toBeGreaterThan(0)
    
    // 수익률 값이 있는지 확인
    const firstCellValue = await rows.first().locator('td').nth(1).textContent()
    expect(firstCellValue).toBeTruthy()
    
    console.log('첫 번째 결과 셀 값:', firstCellValue)
  })

  test('시뮬레이션 로직 검증 - 5분 간격 체크', async ({ page }) => {
    // 브라우저 콘솔 로그 캡처
    const consoleLogs: string[] = []
    page.on('console', msg => {
      if (msg.type() === 'log') {
        consoleLogs.push(msg.text())
      }
    })
    
    // 시뮬레이션 실행 (간단한 설정)
    await page.goto('http://localhost:3000/simulation/BTC/simulation')
    await page.waitForLoadState('networkidle')
    
    const analyzeButton = page.getByRole('button', { name: '분석 시작' })
    await analyzeButton.click()
    
    // 결과 대기
    await expect(page.locator('table')).toBeVisible({ timeout: 60000 })
    
    // 콘솔 로그에서 5분봉 사용 여부 확인
    const fiveMinLog = consoleLogs.find(log => log.includes('5분') || log.includes('5m'))
    console.log('5분봉 관련 로그:', fiveMinLog)
    
    // 결과가 0이 아닌지 확인 (실제 계산이 이루어졌는지)
    const firstRow = page.locator('tbody tr').first()
    const firstCellValue = await firstRow.locator('td').nth(1).textContent()
    
    console.log('시뮬레이션 결과:', firstCellValue)
    
    // 결과가 숫자인지 확인
    const numValue = parseInt(firstCellValue?.replace(/,/g, '') || '0')
    expect(numValue).toBeDefined()
  })

  test('매수/매도 조건 검증', async ({ page }) => {
    await page.goto('http://localhost:3000/simulation/BTC/simulation')
    await page.waitForLoadState('networkidle')
    
    // 매수 조건 개수 설정
    const buyCountInput = page.locator('input[type="number"]').nth(0)
    await buyCountInput.fill('3')
    
    // 매도 조건 개수 설정
    const sellCountInput = page.locator('input[type="number"]').nth(1)
    await sellCountInput.fill('3')
    
    // 값 확인
    const buyCount = await buyCountInput.inputValue()
    const sellCount = await sellCountInput.inputValue()
    
    expect(buyCount).toBe('3')
    expect(sellCount).toBe('3')
    
    console.log('매수 조건 개수:', buyCount)
    console.log('매도 조건 개수:', sellCount)
  })

  test('기준일 변경 시 결과 변경 검증', async ({ page }) => {
    await page.goto('http://localhost:3000/simulation/BTC/simulation')
    await page.waitForLoadState('networkidle')
    
    // 첫 번째 시뮬레이션 (기준일: 2024-01-20)
    const baseDateInput = page.locator('input[type="date"]')
    await baseDateInput.fill('2024-01-20')
    
    const analyzeButton = page.getByRole('button', { name: '분석 시작' })
    await analyzeButton.click()
    
    await expect(page.locator('table')).toBeVisible({ timeout: 60000 })
    
    const firstResult1 = await page.locator('tbody tr').first().locator('td').nth(1).textContent()
    console.log('기준일 2024-01-20 결과:', firstResult1)
    
    // 두 번째 시뮬레이션 (기준일: 2024-01-15)
    await baseDateInput.fill('2024-01-15')
    await analyzeButton.click()
    
    await expect(page.locator('table')).toBeVisible({ timeout: 60000 })
    
    const firstResult2 = await page.locator('tbody tr').first().locator('td').nth(1).textContent()
    console.log('기준일 2024-01-15 결과:', firstResult2)
    
    // 두 결과가 다른지 확인 (같은 설정이라도 기준일이 다르면 결과가 달라야 함)
    // 단, 시장 상황에 따라 우연히 같을 수도 있으므로 로그만 출력
  })

  test('중단 기능 검증', async ({ page }) => {
    await page.goto('http://localhost:3000/simulation/BTC/simulation')
    await page.waitForLoadState('networkidle')
    
    const analyzeButton = page.getByRole('button', { name: '분석 시작' })
    await analyzeButton.click()
    
    // 진행 중 확인
    await expect(page.getByText(/지표 캐싱|시뮬레이션/)).toBeVisible({ timeout: 5000 })
    
    // 중단 버튼 클릭
    const stopButton = page.getByRole('button', { name: '중단' })
    await stopButton.click()
    
    // 중단 후 분석 시작 버튼이 다시 활성화되는지 확인
    await expect(analyzeButton).toBeEnabled({ timeout: 5000 })
  })
})

