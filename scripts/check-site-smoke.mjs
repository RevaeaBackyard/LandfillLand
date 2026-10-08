import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { mkdir } from 'node:fs/promises'
import { setTimeout } from 'node:timers/promises'
import { chromium } from 'playwright'

const origin = 'http://127.0.0.1:4321'
const server = spawn('pnpm', ['exec', 'astro', 'preview', '--host', '127.0.0.1'], { stdio: 'inherit' })
let browser
try {
  let ready = false
  for (let attempt = 0; attempt < 60; attempt++) {
    try {
      ready = (await fetch(origin)).ok
    }
    catch {}
    if (ready)
      break
    await setTimeout(500)
  }
  assert.ok(ready, 'Preview server must start')
  browser = await chromium.launch({ headless: true })
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 }, reducedMotion: 'reduce' })
  const errors = []
  page.on('pageerror', error => errors.push(error.message))
  // Test the site's own assets without requiring third-party comment services.
  await page.route('**/*', route => route.request().url().startsWith(origin) ? route.continue() : route.abort())
  await mkdir('smoke-results', { recursive: true })
  for (const pathname of ['/', '/zh/', '/about/', '/tags/', '/posts/chapter-1-chaos-within-contemplation/']) {
    const response = await page.goto(`${origin}${pathname}`, { waitUntil: 'networkidle' })
    assert.equal(response.status(), 200, pathname)
    assert.ok((await page.locator('main').textContent()).trim().length > 10, `${pathname} has content`)
    assert.ok(await page.locator('#theme-toggle-button').isVisible(), `${pathname} theme control is visible`)
  }
  await page.goto(origin, { waitUntil: 'networkidle' })
  const initialDark = await page.locator('html').evaluate(node => node.classList.contains('dark'))
  await page.locator('#theme-toggle-button').click()
  await page.waitForFunction(initial => document.documentElement.classList.contains('dark') !== initial, initialDark)
  await page.locator('#theme-toggle-button').click()
  await page.waitForFunction(initial => document.documentElement.classList.contains('dark') === initial, initialDark)
  await page.locator('#language-switcher').click()
  await page.waitForURL('**/zh/')
  await page.goBack({ waitUntil: 'networkidle' })
  assert.equal(new URL(page.url()).pathname, '/')
  await page.screenshot({ path: 'smoke-results/desktop.png', fullPage: true })
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto(`${origin}/zh/`, { waitUntil: 'networkidle' })
  assert.ok(await page.locator('#language-switcher').isVisible())
  assert.ok(await page.locator('#theme-toggle-button').isVisible())
  await page.screenshot({ path: 'smoke-results/mobile.png', fullPage: true })
  for (const pathname of ['/rss.xml', '/zh/rss.xml', '/sitemap-index.xml', '/robots.txt'])
    assert.equal((await fetch(`${origin}${pathname}`)).status, 200, pathname)
  assert.deepEqual(errors, [], 'Site scripts must not throw')
  console.log('Site smoke checks passed: routes, navigation, themes, mobile controls, feeds and sitemap')
}
finally {
  await browser?.close()
  server.kill('SIGTERM')
}
