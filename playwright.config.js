import { defineConfig } from '@playwright/test';
import { join } from 'node:path';

const visualPort = 5188;

export default defineConfig({
  testDir: './playwright',
  testMatch: '**/*.visual.pw.js',
  fullyParallel: false,
  timeout: 45_000,
  expect: {
    timeout: 8_000,
    toHaveScreenshot: { animations: 'disabled', maxDiffPixelRatio: 0.08, threshold: 0.25 }
  },
  reporter: process.env.CI ? [['line'], ['html', { outputFolder: 'reports/playwright-html', open: 'never' }]] : 'line',
  outputDir: 'reports/playwright-results',
  snapshotPathTemplate: 'test/visual/__snapshots__/{arg}{ext}',
  use: {
    baseURL: `http://127.0.0.1:${visualPort}`,
    browserName: 'chromium',
    colorScheme: 'dark',
    locale: 'es-CO',
    reducedMotion: 'reduce',
    trace: 'retain-on-failure'
  },
  webServer: {
    command: 'node server.js',
    url: `http://127.0.0.1:${visualPort}/api/health`,
    reuseExistingServer: false,
    timeout: 30_000,
    env: {
      PORT: String(visualPort),
      JOB_DIR: join(process.cwd(), 'data', 'playwright-jobs'),
      YOUTUBE_DL_SKIP_DOWNLOAD: 'true',
      YOUTUBE_DL_SKIP_PYTHON_CHECK: '1'
    }
  }
});
