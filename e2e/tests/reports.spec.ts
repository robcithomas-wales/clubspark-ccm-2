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

  test('revenue report includes competition entry fees stream', async ({ page }) => {
    await page.goto('/reports/revenue')

    await expect(page.getByText(/competition entry fees/i).first()).toBeVisible()
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
      '/reports/competition-overview',
      '/reports/competition-entries',
      '/reports/competition-results',
    ]

    for (const href of navLinks) {
      await expect(page.locator(`a[href="${href}"]`).first()).toBeVisible()
    }
  })
})

test.describe('Reports — competition reports', () => {
  test('competition overview report loads with KPI cards', async ({ page }) => {
    await page.goto('/reports/competition-overview')

    await expect(page.getByRole('heading', { name: /competition overview/i })).toBeVisible()
    await expect(page.getByText(/total competitions/i).first()).toBeVisible()
    await expect(page.getByText(/entry fee revenue/i).first()).toBeVisible()
  })

  test('competition overview shows the competitions table', async ({ page }) => {
    await page.goto('/reports/competition-overview')

    await expect(page.getByRole('heading', { name: /competition overview/i })).toBeVisible()
    // Table header columns
    await expect(page.getByRole('columnheader', { name: /competition/i }).first()).toBeVisible()
    await expect(page.getByRole('columnheader', { name: /entries/i }).first()).toBeVisible()
  })

  test('competition entries report loads with KPI cards', async ({ page }) => {
    await page.goto('/reports/competition-entries')

    await expect(page.getByRole('heading', { name: /competition entries/i })).toBeVisible()
    await expect(page.getByText(/total entries/i).first()).toBeVisible()
    await expect(page.getByText(/fees collected/i).first()).toBeVisible()
    await expect(page.getByText(/fees outstanding/i).first()).toBeVisible()
  })

  test('competition entries report has competition and status filters', async ({ page }) => {
    await page.goto('/reports/competition-entries')

    await expect(page.getByRole('combobox').nth(0)).toBeVisible() // competition filter
    await expect(page.getByRole('combobox').nth(1)).toBeVisible() // status filter
  })

  test('competition results report loads with KPI cards', async ({ page }) => {
    await page.goto('/reports/competition-results')

    await expect(page.getByRole('heading', { name: /competition results/i })).toBeVisible()
    await expect(page.getByText(/total matches/i).first()).toBeVisible()
    await expect(page.getByText(/completion rate/i).first()).toBeVisible()
    await expect(page.getByText(/disputed/i).first()).toBeVisible()
  })

  test('competition results report has competition and status filters', async ({ page }) => {
    await page.goto('/reports/competition-results')

    await expect(page.getByRole('combobox').nth(0)).toBeVisible()
    await expect(page.getByRole('combobox').nth(1)).toBeVisible()
  })

  test('fee collection report loads with match fee KPIs', async ({ page }) => {
    await page.goto('/reports/fee-collection')

    await expect(page.getByRole('heading', { name: /fee collection/i })).toBeVisible()
    await expect(page.getByText(/total charged/i).first()).toBeVisible()
    await expect(page.getByText(/collection rate/i).first()).toBeVisible()
  })
})

test.describe('Reports — team reports', () => {
  test('teams overview report loads with KPI cards', async ({ page }) => {
    await page.goto('/reports/teams-overview')

    await expect(page.getByRole('heading', { name: /teams overview/i })).toBeVisible()
    await expect(page.getByText(/total teams/i).first()).toBeVisible()
    await expect(page.getByText(/total players/i).first()).toBeVisible()
  })

  test('teams overview has Export CSV button', async ({ page }) => {
    await page.goto('/reports/teams-overview')

    await expect(page.getByRole('button', { name: /export csv/i }).first()).toBeVisible()
  })

  test('squad composition report loads with KPI cards', async ({ page }) => {
    await page.goto('/reports/squad-composition')

    await expect(page.getByRole('heading', { name: /squad composition/i })).toBeVisible()
    await expect(page.getByText(/total players/i).first()).toBeVisible()
    await expect(page.getByText(/coaches/i).first()).toBeVisible()
  })

  test('team website readiness report loads with KPI cards', async ({ page }) => {
    await page.goto('/reports/team-website-readiness')

    await expect(page.getByRole('heading', { name: /website readiness/i })).toBeVisible()
    await expect(page.getByText(/total teams/i).first()).toBeVisible()
    await expect(page.getByText(/public/i).first()).toBeVisible()
  })

  test('match results report loads', async ({ page }) => {
    await page.goto('/reports/match-results')

    await expect(page.getByRole('heading', { name: /match results/i })).toBeVisible()
  })

  test('player availability report loads', async ({ page }) => {
    await page.goto('/reports/player-availability')

    await expect(page.getByRole('heading', { name: /player availability/i })).toBeVisible()
  })

  test('player participation report loads', async ({ page }) => {
    await page.goto('/reports/player-participation')

    await expect(page.getByRole('heading', { name: /player participation/i })).toBeVisible()
  })

  test('fixtures summary report loads', async ({ page }) => {
    await page.goto('/reports/fixtures-summary')

    await expect(page.getByRole('heading', { name: /fixtures summary/i })).toBeVisible()
  })
})

test.describe('Reports — rankings', () => {
  test('rankings leaderboard report loads with KPI cards', async ({ page }) => {
    await page.goto('/reports/rankings-leaderboard')

    await expect(page.getByRole('heading', { name: /rankings/i })).toBeVisible()
  })
})

test.describe('Reports — print / PDF', () => {
  test('bookings report has a Save PDF button', async ({ page }) => {
    await page.goto('/reports/bookings')

    await expect(page.getByRole('button', { name: /save pdf/i }).first()).toBeVisible()
  })

  test('competition overview report has a Save PDF button', async ({ page }) => {
    await page.goto('/reports/competition-overview')

    await expect(page.getByRole('button', { name: /save pdf/i }).first()).toBeVisible()
  })

  test('revenue report has a Save PDF button', async ({ page }) => {
    await page.goto('/reports/revenue')

    await expect(page.getByRole('button', { name: /save pdf/i }).first()).toBeVisible()
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

  test('competition overview has an Export CSV button', async ({ page }) => {
    await page.goto('/reports/competition-overview')

    await expect(page.getByRole('button', { name: /export csv/i }).first()).toBeVisible()
  })

  test('competition entries has an Export CSV button', async ({ page }) => {
    await page.goto('/reports/competition-entries')

    await expect(page.getByRole('button', { name: /export csv/i }).first()).toBeVisible()
  })

  test('competition results has an Export CSV button', async ({ page }) => {
    await page.goto('/reports/competition-results')

    await expect(page.getByRole('button', { name: /export csv/i }).first()).toBeVisible()
  })
})
