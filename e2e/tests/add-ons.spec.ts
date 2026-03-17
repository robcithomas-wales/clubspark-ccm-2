import { test, expect } from '@playwright/test'

/**
 * End-to-end: Product add-on creation form.
 */
test.describe('Product add-ons', () => {
  test('add-ons list page loads', async ({ page }) => {
    await page.goto('/add-ons')

    await expect(page.getByRole('heading', { name: /product add-ons/i })).toBeVisible()
  })

  test('new add-on form is reachable from the list', async ({ page }) => {
    await page.goto('/add-ons')

    await page.getByRole('link', { name: /create product/i }).first().click()

    await expect(page).toHaveURL(/\/add-ons\/new/)
    await expect(page.getByRole('heading', { name: /create product add-on/i })).toBeVisible()
  })

  test('new add-on form submits successfully and redirects to list', async ({ page }) => {
    await page.goto('/add-ons/new')

    await page.locator('#name').fill('Playwright Ball Hire')
    await page.locator('#code').fill(`BALL-PW-${Date.now()}`)
    await page.locator('#category').selectOption('equipment')

    await page.getByRole('button', { name: /save product/i }).click()

    // Server action redirects back to add-ons list
    await expect(page).toHaveURL(/\/add-ons$/, { timeout: 10_000 })
  })

  test('new add-on form shows error when name is missing', async ({ page }) => {
    await page.goto('/add-ons/new')

    await page.locator('#code').fill('NO-NAME-CODE')
    await page.locator('#category').selectOption('equipment')

    await page.getByRole('button', { name: /save product/i }).click()

    // Should not navigate away
    await expect(page).toHaveURL(/\/add-ons\/new/)
  })
})
