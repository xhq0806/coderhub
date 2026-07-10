// by AI.Coding：Playwright 配置启动 Vite，并为主链路保留失败截图、视频和 trace。
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  workers: process.env.CI ? 1 : undefined,
  retries: process.env.CI ? 1 : 0,
  reporter: [['html', { open: 'never' }], ['list']],
  use: {
    baseURL: 'http://127.0.0.1:5173',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure'
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: [
    {
      command: 'npm run start --prefix ..',
      url: 'http://127.0.0.1:8000/contents',
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
      env: {
        ...process.env,
        SERVER_PORT: '8000',
        MYSQL_DATABASE: process.env.MYSQL_DATABASE || 'coderhub_e2e',
        JWT_SECRET: process.env.JWT_SECRET || 'coderhub-e2e-secret',
        UPLOAD_DIR: process.env.UPLOAD_DIR || 'uploads_e2e'
      }
    },
    {
      command: 'npm run dev -- --host 127.0.0.1',
      url: 'http://127.0.0.1:5173',
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
      env: {
        ...process.env,
        VITE_API_BASE_URL: '',
        VITE_PROXY_TARGET: 'http://127.0.0.1:8000'
      }
    }
  ]
});
