import { defineConfig, devices } from '@playwright/test'

/**
 * Playwright 설정
 * @see https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  testDir: './tests',
  /* 병렬 실행 */
  fullyParallel: true,
  /* CI에서 재시도 */
  retries: process.env.CI ? 2 : 0,
  /* CI에서 워커 수 */
  workers: process.env.CI ? 1 : undefined,
  /* 리포터 */
  reporter: 'html',
  /* 공통 설정 */
  use: {
    /* 베이스 URL */
    baseURL: 'http://localhost:3000',
    /* 실패 시 스크린샷 */
    screenshot: 'only-on-failure',
    /* 실패 시 비디오 */
    video: 'retain-on-failure',
    /* 트레이스 */
    trace: 'on-first-retry',
  },

  /* 프로젝트 설정 */
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  /* 개발 서버 */
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
  },
})

