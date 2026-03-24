import { test, expect } from '@playwright/test'

/**
 * End-to-end: Customer list and detail navigation.
 */
test.describe('Customers', () => {
  test('customer list page loads with data', async ({ page }) => {
    await page.goto('/customers')

    await expect(page.getByRole('heading', { name: /customers/i })).toBeVisible()

    // Wait for at least one customer row (exclude /customers/new)
    const rows = page.locator('a[href^="/customers/"]:not([href="/customers/new"])')
    await expect(rows.first()).toBeVisible({ timeout: 10_000 })
  })

  test('clicking a customer row navigates to detail page', async ({ page }) => {
    await page.goto('/customers')

    const firstRow = page.locator('a[href^="/customers/"]:not([href="/customers/new"])').first()
    await firstRow.waitFor()
    const href = await firstRow.getAttribute('href')
    expect(href).toMatch(/\/customers\/[0-9a-f-]{36}/)

    await firstRow.click()

    await expect(page).toHaveURL(/\/customers\/[0-9a-f-]{36}/)
    // Detail page shows the customer's name card with a "Customer" label beneath it
    await expect(page.getByText(/^customer$/i)).toBeVisible()
  })

  test('customer detail shows email label', async ({ page }) => {
    await page.goto('/customers')

    const firstRow = page.locator('a[href^="/customers/"]:not([href="/customers/new"])').first()
    await firstRow.waitFor()
    await firstRow.click()

    await expect(page).toHaveURL(/\/customers\/[0-9a-f-]{36}/)
    await expect(page.getByText(/email/i).first()).toBeVisible()
  })

  test('new customer form is reachable from the list', async ({ page }) => {
    await page.goto('/customers')

    await page.getByRole('link', { name: /new customer/i }).click()

    await expect(page).toHaveURL(/\/customers\/new/)
    await expect(page.getByRole('heading', { name: /new customer/i })).toBeVisible()
  })

  test('new customer form requires first and last name', async ({ page }) => {
    await page.goto('/customers/new')

    // Submit empty form — JS validation fires before API call
    await page.getByRole('button', { name: /create person/i }).click()

    // Should stay on the form page
    await expect(page).toHaveURL(/\/customers\/new/)

    // Error message should appear
    await expect(page.getByText(/first name.*required|required.*first name|please.*name/i).first()).toBeVisible()
  })
})
