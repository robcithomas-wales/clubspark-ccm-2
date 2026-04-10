import { chromium, type FullConfig } from '@playwright/test'
import { existsSync, readFileSync } from 'fs'

/**
 * Runs once before all tests. Logs into the portal and saves the
 * Supabase session cookies to .auth/session.json so every test
 * worker starts already authenticated.
 *
 * Requires E2E_EMAIL and E2E_PASSWORD in e2e/.env
 *
 * Skips re-login if a valid (non-expired) session already exists.
 * Warms up all Turbopack routes so tests don't time out on first compilation.
 */

/** Routes to warm up before the test suite runs (dev-mode Turbopack compilation). */
const WARMUP_ROUTES = [
  '/',
  '/facilities',
  '/venues',
  '/venues/new',
  '/resources',
  '/bookable-units',
  '/availability',
  '/bookings',
  '/create-booking',
  '/add-ons',
  '/customers',
  '/membership',
  '/membership/schemes',
  '/membership/plans',
  '/membership/policies',
  '/membership/memberships',
  '/reports/bookings',
  '/reports/revenue',
  '/reports/utilisation',
  '/reports/customers',
  '/reports/membership',
  '/reports/series',
  '/reports/renewals',
  '/reports/addons',
  '/reports/pending-approvals',
  '/reports/payment-health',
  '/reports/competition-overview',
  '/reports/competition-entries',
  '/reports/competition-results',
  '/reports/fee-collection',
  '/reports/teams-overview',
  '/reports/squad-composition',
  '/reports/team-website-readiness',
  '/reports/match-results',
  '/reports/player-availability',
  '/reports/player-participation',
  '/reports/fixtures-summary',
  '/reports/rankings-leaderboard',
]

export default async function globalSetup(_config: FullConfig) {
  const email = process.env['E2E_EMAIL']
  const password = process.env['E2E_PASSWORD']

  if (!email || !password) {
    throw new Error(
      'E2E_EMAIL and E2E_PASSWORD must be set in e2e/.env to run the e2e suite',
    )
  }

  const port = process.env['ADMIN_PORTAL_PORT'] ?? '3001'
  const base = `http://localhost:${port}`

  // Reuse existing session if all cookies are still valid
  const sessionPath = '.auth/session.json'
  let needsLogin = true
  if (existsSync(sessionPath)) {
    try {
      const session = JSON.parse(readFileSync(sessionPath, 'utf-8'))
      const nowSec = Date.now() / 1000
      const cookies: { expires?: number }[] = session.cookies ?? []
      const allValid = cookies.length > 0 && cookies.every((c) => !c.expires || c.expires > nowSec + 60)
      if (allValid) {
        console.log('[global-setup] Reusing existing session (cookies still valid)')
        needsLogin = false
      }
    } catch {
      // malformed file — fall through and re-login
    }
  }

  const browser = await chromium.launch()

  if (needsLogin) {
    const page = await browser.newPage()
    await page.goto(`${base}/login`)
    await page.locator('#email').fill(email)
    await page.locator('#password').fill(password)
    await page.locator('form').getByRole('button', { name: /sign in/i }).click()
    await page.waitForURL((url) => !url.pathname.startsWith('/login'), { timeout: 15_000 })
    await page.context().storageState({ path: sessionPath })
    await page.close()
  }

  // Warm up Turbopack: visit each test route so the first test doesn't timeout on compilation
  console.log('[global-setup] Warming up routes…')
  const context = await browser.newContext({ storageState: sessionPath })
  const warmPage = await context.newPage()
  for (const route of WARMUP_ROUTES) {
    try {
      await warmPage.goto(`${base}${route}`, { timeout: 30_000, waitUntil: 'domcontentloaded' })
    } catch {
      // Some routes may redirect or error; that's fine — we just need to trigger compilation
    }
  }
  await context.close()
  await browser.close()

  console.log('[global-setup] Warmup complete')
}
