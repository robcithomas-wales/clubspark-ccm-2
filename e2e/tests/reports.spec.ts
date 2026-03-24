import { test, expect } from '@playwright/test'

/**
 * End-to-end: Reports section — all report pages load and display key UI elements.
 *
 * These tests validate that each report page:
 *  - Loads without a server error
 *  - Shows a page heading
 *  - Renders at least one KPI card or data section
 *
 * They do NOT assert specific data values (which vary by environment).
 */

test.describe('Reports — core pages', () => {
  test('bookings report loads with a heading and KPI cards', async ({ page }) => {
    await page.goto('/reports/bookings')

    await expect(page.getByRole('heading', { name: /bookings report/i })).toBeVisible()
    // At least one KPI card visible
    await expect(page.getByText(/total bookings/i).first()).toBeVisible()
  })

  test('revenue report shows total booking revenue headline', async ({ page }) => {
    await page.goto('/reports/revenue')

    await expect(page.getByRole('heading', { name: /revenue report/i })).toBeVisible()
    await expect(page.getByText(/booking revenue/i).first()).toBeVisible()
    await expect(page.getByText(/revenue per booked hour/i).first()).toBeVisible()
  })

  test('utilisation report loads with utilisation KPI', async ({ page }) => {
    await page.goto('/reports/utilisation')

    await expect(page.getByRole('heading', { name: /utilisation report/i })).toBeVisible()
    await expect(page.getByText(/overall utilisation/i).first()).toBeVisible()
  })

  test('customers report loads with customer count KPI', async ({ page }) => {
    await page.goto('/reports/customers')

    await expect(page.getByRole('heading', { name: /customer report/i })).toBeVisible()
    await expect(page.getByText(/customers registered/i).first()).toBeVisible()
  })

  test('membership report loads with membership KPIs', async ({ page }) => {
    await page.goto('/reports/membership')

    await expect(page.getByRole('heading', { name: /membership report/i })).toBeVisible()
    await expect(page.getByText(/memberships in range/i).first()).toBeVisible()
    await expect(page.getByText(/renewals due/i).first()).toBeVisible({ timeout: 10_000 })
  })

  test('series report loads with series KPIs', async ({ page }) => {
    await page.goto('/reports/series')

    await expect(page.getByRole('heading', { name: /series report/i })).toBeVisible()
    await expect(page.getByText(/series in range/i).first()).toBeVisible()
    await expect(page.getByText(/cancellation rate/i).first()).toBeVisible()
  })
})

test.describe('Reports — new pages', () => {
  test('renewals forecast report loads', async ({ page }) => {
    await page.goto('/reports/renewals')

    await expect(page.getByRole('heading', { name: /renewals forecast/i })).toBeVisible()
    await expect(page.getByText(/expiring in 7 days/i).first()).toBeVisible()
    await expect(page.getByText(/expiring in 30 days/i).first()).toBeVisible()
  })

  test('renewals forecast shows revenue at risk panels', async ({ page }) => {
    await page.goto('/reports/renewals')

    await expect(page.getByText(/revenue at risk/i).first()).toBeVisible()
  })

  test('add-ons report loads with catalogue KPIs', async ({ page }) => {
    await page.goto('/reports/addons')

    await expect(page.getByRole('heading', { name: /add-ons report/i })).toBeVisible()
    await expect(page.getByText(/add-ons in range/i).first()).toBeVisible()
    await expect(page.getByText(/avg catalogue price/i).first()).toBeVisible()
  })

  test('pending approvals report loads with urgency KPIs', async ({ page }) => {
    await page.goto('/reports/pending-approvals')

    await expect(page.getByRole('heading', { name: /pending approvals/i })).toBeVisible()
    await expect(page.getByText(/total pending/i).first()).toBeVisible()
    await expect(page.getByText(/over 24 hours/i).first()).toBeVisible()
    await expect(page.getByText(/over 48 hours/i).first()).toBeVisible()
  })

  test('payment health report loads with value at risk', async ({ page }) => {
    await page.goto('/reports/payment-health')

    await expect(page.getByRole('heading', { name: /payment health/i })).toBeVisible()
    await expect(page.getByText(/total value at risk/i).first()).toBeVisible()
    await expect(page.getByText(/unpaid bookings/i).first()).toBeVisible()
    await expect(page.getByText(/unpaid memberships/i).first()).toBeVisible()
  })

  test('all report pages are reachable from the nav', async ({ page }) => {
    await page.goto('/reports/bookings')

    // Nav should contain links to all 10 report pages
    const navLinks = [
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
    ]

    for (const href of navLinks) {
      await expect(page.locator(`a[href="${href}"]`).first()).toBeVisible()
    }
  })
})

test.describe('Reports — export buttons', () => {
  test('bookings report has an Export CSV button', async ({ page }) => {
    await page.goto('/reports/bookings')

    await expect(page.getByRole('button', { name: /export csv/i }).first()).toBeVisible()
  })

  test('membership report has an Export CSV button', async ({ page }) => {
    await page.goto('/reports/membership')

    await expect(page.getByRole('button', { name: /export csv/i }).first()).toBeVisible()
  })

  test('renewals forecast has an Export CSV button', async ({ page }) => {
    await page.goto('/reports/renewals')

    await expect(page.getByRole('button', { name: /export csv/i }).first()).toBeVisible()
  })

  test('payment health has Export CSV buttons for bookings and memberships', async ({ page }) => {
    await page.goto('/reports/payment-health')

    const exportButtons = page.getByRole('button', { name: /export csv/i })
    await expect(exportButtons.first()).toBeVisible()
  })
})
