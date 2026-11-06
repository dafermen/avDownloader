import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const emptyJobs = {
  jobs: [],
  stats: {
    active: 0, queued: 0, ready: 0, maxConcurrent: 2, maxRetries: 2,
    readyBytes: 0, storedBytes: 0, storageLimitBytes: 10 * 1024 ** 3, ttlMinutes: 60
  }
};

const analyzedVideo = {
  title: 'Visual test training video',
  provider: 'youtube',
  duration: 420,
  thumbnail: '',
  qualities: [
    { selectionId: '11111111-1111-4111-8111-111111111111', label: '1080p', type: 'mp4', adaptive: true, estimatedSize: 220_000_000 },
    { selectionId: '22222222-2222-4222-8222-222222222222', label: '720p', type: 'mp4', adaptive: true, estimatedSize: 120_000_000 },
    { selectionId: '33333333-3333-4333-8333-333333333333', label: '360p', type: 'mp4', adaptive: false, estimatedSize: 45_000_000 }
  ],
  audio: { selectionId: '44444444-4444-4444-8444-444444444444', estimatedSize: 10_000_000 },
  subtitleTracks: [
    { selectionId: '55555555-5555-4555-8555-555555555555', language: 'en', name: 'English', automatic: false },
    { selectionId: '66666666-6666-4666-8666-666666666666', language: 'es', name: 'Español', automatic: true }
  ]
};

async function preparePage(page, language = 'es') {
  await page.addInitScript((selectedLanguage) => {
    localStorage.setItem('vdownloader-language-v1', selectedLanguage);
    localStorage.setItem('vdownloader-notifications-enabled-v1', 'false');
    localStorage.setItem('vdownloader-notification-sound-v1', 'false');
  }, language);
  await page.route('**/api/jobs', async (route) => route.fulfill({ json: emptyJobs }));
  await page.route('**/api/analyze', async (route) => route.fulfill({ status: 200, json: analyzedVideo }));
  await page.goto('/');
  await expect(page.locator('main')).toBeVisible();
}

async function expectNoSeriousAccessibilityViolations(page) {
  const result = await new AxeBuilder({ page }).analyze();
  const important = result.violations.filter((violation) => ['critical', 'serious'].includes(violation.impact));
  expect(important, JSON.stringify(important, null, 2)).toEqual([]);
}

test('desktop Spanish covers video, audio, subtitle flows and accessibility', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1100 });
  await preparePage(page, 'es');
  await expect(page).toHaveScreenshot('desktop-home-es.png', { fullPage: true });

  await page.locator('#video-url').fill('https://www.youtube.com/watch?v=visualtest01');
  await page.locator('#analyze-form button[type="submit"]').click();
  await expect(page.locator('#result')).toBeVisible();
  await expect(page.locator('.remote-output-tabs')).toContainText('Solo audio');
  await expect(page.locator('.creation-estimate').first()).toBeVisible();
  await expect(page).toHaveScreenshot('desktop-video-result-es.png', { fullPage: true });

  await page.locator('.remote-output-tabs button').nth(1).click();
  await expect(page.locator('.remote-audio-export')).toBeVisible();
  await page.locator('.remote-output-tabs button').nth(2).click();
  await expect(page.locator('.remote-subtitle-export')).toBeVisible();
  await expectNoSeriousAccessibilityViolations(page);
});

test('mobile English exposes audio and editable subtitle tools', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await preparePage(page, 'en');
  await page.locator('#local-tool-audio').click();
  await expect(page.locator('#local-audio-tool-card')).toBeVisible();
  await expect(page).toHaveScreenshot('mobile-audio-en.png', { fullPage: true });

  await page.locator('#local-tool-subtitle').click();
  await page.locator('#subtitle-source-local').click();
  await page.locator('#subtitle-mode-compose').click();
  await expect(page.locator('#subtitle-mode-compose')).toHaveAttribute('aria-pressed', 'true');
  await expect(page).toHaveScreenshot('mobile-subtitle-en.png', { fullPage: true });
  await expectNoSeriousAccessibilityViolations(page);
});
