import { test, expect } from '@playwright/test'

/**
 * End-to-end: Facilities section — venues, resources, resource groups, bookable units.
 *
 * These tests validate that:
 *  - Key pages load without server errors
 *  - Create and edit forms are reachable and render their fields
 *  - The facilities explorer shows the correct structure
 */

test.describe('Facilities explorer', () => {
  test('facilities page loads with explorer and stats', async ({ page }) => {
    await page.goto('/facilities')

    await expect(page.getByRole('heading', { name: /facilities/i }).first()).toBeVisible()
    await expect(page.getByText(/facilities explorer/i).first()).toBeVisible()
    await expect(page.getByText(/venues/i).first()).toBeVisible()
    await expect(page.getByText(/resources/i).first()).toBeVisible()
    await expect(page.getByText(/bookable units/i).first()).toBeVisible()
  })

  test('facilities explorer has Add venue button', async ({ page }) => {
    await page.goto('/facilities')

    await expect(page.getByRole('button', { name: /add venue/i })).toBeVisible()
  })

  test('facilities explorer search field is visible', async ({ page }) => {
    await page.goto('/facilities')

    await expect(page.getByPlaceholder(/search venues/i)).toBeVisible()
  })
})

test.describe('Venues', () => {
  test('venues list page loads', async ({ page }) => {
    await page.goto('/venues')

    await expect(page.getByRole('heading', { name: /venues/i })).toBeVisible()
  })

  test('Create Venue page renders all fields', async ({ page }) => {
    await page.goto('/venues/new')

    await expect(page.getByRole('heading', { name: /create venue/i })).toBeVisible()
    await expect(page.locator('#name')).toBeVisible()
    await expect(page.locator('#city')).toBeVisible()
    await expect(page.locator('#country')).toBeVisible()
    await expect(page.locator('#timezone')).toBeVisible()
    await expect(page.getByRole('button', { name: /create venue/i })).toBeVisible()
  })

  test('Create Venue shows validation error when name is empty', async ({ page }) => {
    await page.goto('/venues/new')

    await page.getByRole('button', { name: /create venue/i }).click()

    // Name is required — browser or app validation should fire
    const nameInput = page.locator('#name')
    await expect(nameInput).toBeVisible()
    // Input should be marked invalid by the browser required attribute
    const validity = await nameInput.evaluate((el: HTMLInputElement) => el.validity.valid)
    expect(validity).toBe(false)
  })
})

test.describe('Resources', () => {
  test('resources list page loads', async ({ page }) => {
    await page.goto('/resources')

    await expect(page.getByRole('heading', { name: /resources/i })).toBeVisible()
  })

  test('Create Resource page renders venue and name fields', async ({ page }) => {
    await page.goto('/resources/new')

    await expect(page.getByRole('heading', { name: /add resource/i })).toBeVisible()
    await expect(page.locator('#name')).toBeVisible()
  })
})

test.describe('Bookable Units', () => {
  test('bookable units list page loads', async ({ page }) => {
    await page.goto('/bookable-units')

    await expect(page.getByRole('heading', { name: /bookable units/i })).toBeVisible()
  })

  test('Create Bookable Unit page renders key fields', async ({ page }) => {
    await page.goto('/bookable-units/new')

    await expect(page.getByRole('heading', { name: /add bookable unit/i })).toBeVisible()
    await expect(page.locator('#name')).toBeVisible()
  })
})

test.describe('Availability', () => {
  test('availability page loads with board and KPI cards', async ({ page }) => {
    await page.goto('/availability')

    await expect(page.getByRole('heading', { name: /availability/i }).first()).toBeVisible()
    await expect(page.getByText(/bookable units/i).first()).toBeVisible()
    await expect(page.getByText(/available slots/i).first()).toBeVisible()
    await expect(page.getByText(/booked slots/i).first()).toBeVisible()
  })

  test('availability page has a date picker and update button', async ({ page }) => {
    await page.goto('/availability')

    await expect(page.locator('input[type="date"]')).toBeVisible()
    await expect(page.getByRole('button', { name: /update/i })).toBeVisible()
  })

  test('availability page shows viewing date label', async ({ page }) => {
    await page.goto('/availability')

    await expect(page.getByText(/viewing date/i).first()).toBeVisible()
  })
})
