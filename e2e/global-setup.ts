import { chromium, type FullConfig } from '@playwright/test'

/**
 * Runs once before all tests. Logs into the portal and saves the
 * Supabase session cookies to .auth/session.json so every test
 * worker starts already authenticated.
 *
 * Requires E2E_EMAIL and E2E_PASSWORD in e2e/.env
 */
export default async function globalSetup(_config: FullConfig) {
  const email = process.env['E2E_EMAIL']
  const password = process.env['E2E_PASSWORD']

  if (!email || !password) {
    throw new Error(
      'E2E_EMAIL and E2E_PASSWORD must be set in e2e/.env to run the e2e suite',
    )
  }

  const browser = await chromium.launch()
  const page = await browser.newPage()

  await page.goto('http://localhost:3000/login')
  await page.locator('#email').fill(email)
  await page.locator('#password').fill(password)
  await page.getByRole('button', { name: /sign in/i }).click()

  // Wait until we're past the login page
  await page.waitForURL((url) => !url.pathname.startsWith('/login'), {
    timeout: 15_000,
  })

  await page.context().storageState({ path: '.auth/session.json' })
  await browser.close()
}
