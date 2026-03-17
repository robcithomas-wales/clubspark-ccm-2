import { test, expect } from '@playwright/test'

/**
 * End-to-end: Create a booking through the admin portal.
 *
 * Assumes:
 * - Portal running at http://localhost:3000
 * - At least one bookable unit exists in the database
 */
test.describe('Create booking', () => {
  test('navigates to create-booking page from bookings list', async ({ page }) => {
    await page.goto('/bookings')
    await page.getByRole('link', { name: /new booking/i }).click()
    await expect(page).toHaveURL(/\/create-booking/)
    await expect(page.getByRole('heading', { name: /create a new booking/i })).toBeVisible()
  })

  test('shows validation error when submitting with no unit selected', async ({ page }) => {
    await page.goto('/create-booking')

    // Fill in times but leave unit blank
    await page.locator('#startsAt').fill('2099-06-01T10:00')
    await page.locator('#endsAt').fill('2099-06-01T11:00')

    await page.getByRole('button', { name: /^create booking$/i }).click()

    await expect(page.getByText(/please select a bookable unit/i)).toBeVisible()
  })

  test('shows validation error when end is before start', async ({ page }) => {
    await page.goto('/create-booking')

    const unitSelect = page.locator('#bookableUnitId')
    await expect(unitSelect).toBeVisible()

    // Pick first unit if any are available
    const options = await unitSelect.locator('option').all()
    if (options.length > 1) {
      const firstValue = await options[1].getAttribute('value')
      if (firstValue) await unitSelect.selectOption(firstValue)
    }

    await page.locator('#startsAt').fill('2099-06-01T11:00')
    await page.locator('#endsAt').fill('2099-06-01T10:00')

    await page.getByRole('button', { name: /create booking/i }).click()

    await expect(page.getByText(/end time must be later than start time/i)).toBeVisible()
  })

  test('creates a booking end-to-end and lands on booking detail', async ({ page }) => {
    await page.goto('/create-booking')

    // Wait for bookable units to load
    const unitSelect = page.locator('#bookableUnitId')
    await expect(unitSelect).toBeVisible()
    await page.waitForFunction(() => {
      const sel = document.querySelector('#bookableUnitId') as HTMLSelectElement
      return sel && sel.options.length > 1
    }, { timeout: 10_000 })

    const options = await unitSelect.locator('option').all()
    const firstValue = await options[1].getAttribute('value')
    expect(firstValue).toBeTruthy()
    await unitSelect.selectOption(firstValue!)

    // Use a random future month (01-12) and day (01-28) so parallel/repeated runs don't conflict
    const rMonth = String(1 + Math.floor(Math.random() * 12)).padStart(2, '0')
    const rDay = String(1 + Math.floor(Math.random() * 28)).padStart(2, '0')
    await page.locator('#startsAt').fill(`2099-${rMonth}-${rDay}T10:00`)
    await page.locator('#endsAt').fill(`2099-${rMonth}-${rDay}T11:00`)

    await page.locator('#bookingSource').selectOption('admin')
    await page.locator('#notes').fill('Playwright e2e test booking')

    await page.getByRole('button', { name: /^create booking$/i }).click()

    // Successful creation redirects to availability view
    await expect(page).toHaveURL(/\/availability\?date=/, { timeout: 10_000 })

    // Navigate to bookings list and confirm at least one booking reference is visible
    await page.goto('/bookings')
    await expect(page.getByText(/BK-/).first()).toBeVisible()
  })
})
