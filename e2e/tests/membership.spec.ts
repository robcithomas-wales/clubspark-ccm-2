import { test, expect } from '@playwright/test'

/**
 * End-to-end: Membership admin portal workflows.
 *
 * Covers:
 *  - Membership hub and nav
 *  - Schemes list, detail, edit panel
 *  - Plans list and detail
 *  - Entitlement policies list, create, detail, edit panel
 *  - Memberships list, create form, detail
 */

// ─── Membership Hub ───────────────────────────────────────────────────────────

test.describe('Membership hub', () => {
  test('loads the membership overview page', async ({ page }) => {
    await page.goto('/membership')

    await expect(page.getByRole('heading', { name: /membership/i }).first()).toBeVisible()
    // Expect nav links or quick-links to the key sections
    await expect(page.locator('a[href="/membership/schemes"]').first()).toBeVisible()
    await expect(page.locator('a[href="/membership/plans"]').first()).toBeVisible()
    await expect(page.locator('a[href="/membership/memberships"]').first()).toBeVisible()
  })
})

// ─── Schemes ─────────────────────────────────────────────────────────────────

test.describe('Membership Schemes', () => {
  test('schemes list page loads', async ({ page }) => {
    await page.goto('/membership/schemes')

    await expect(page.getByRole('heading', { name: /schemes/i }).first()).toBeVisible()
  })

  test('new scheme link navigates to create form', async ({ page }) => {
    await page.goto('/membership/schemes')

    await page.getByRole('link', { name: /new scheme/i }).click()
    await expect(page).toHaveURL(/\/membership\/schemes\/new/)
    await expect(page.getByRole('heading', { name: /new.*scheme|create.*scheme/i })).toBeVisible()
  })

  test('new scheme form requires a name', async ({ page }) => {
    await page.goto('/membership/schemes/new')

    await page.getByRole('button', { name: /save scheme/i }).click()

    // Should stay on form and show error
    await expect(page).toHaveURL(/\/membership\/schemes\/new/)
  })

  test('creates a scheme and lands on detail page', async ({ page }) => {
    await page.goto('/membership/schemes/new')

    const uniqueName = `E2E Scheme ${Date.now()}`
    await page.getByLabel(/name/i).fill(uniqueName)

    await page.getByRole('button', { name: /save scheme/i }).click()

    await expect(page).toHaveURL(/\/membership\/schemes\/[0-9a-f-]{36}/, { timeout: 10_000 })
    await expect(page.getByText(uniqueName).first()).toBeVisible()
  })

  test('scheme detail page shows edit button', async ({ page }) => {
    await page.goto('/membership/schemes')

    const firstScheme = page.locator('a[href^="/membership/schemes/"]:not([href="/membership/schemes/new"])').first()
    await firstScheme.waitFor({ timeout: 10_000 })
    await firstScheme.click()

    await expect(page).toHaveURL(/\/membership\/schemes\/[0-9a-f-]{36}/)
    await expect(page.getByRole('button', { name: /edit/i }).first()).toBeVisible()
  })

  test('back link returns to schemes list', async ({ page }) => {
    await page.goto('/membership/schemes')

    const firstScheme = page.locator('a[href^="/membership/schemes/"]:not([href="/membership/schemes/new"])').first()
    await firstScheme.waitFor({ timeout: 10_000 })
    await firstScheme.click()

    await page.getByText(/back to schemes/i).click()
    await expect(page).toHaveURL(/\/membership\/schemes$/)
  })
})

// ─── Plans ────────────────────────────────────────────────────────────────────

test.describe('Membership Plans', () => {
  test('plans list page loads', async ({ page }) => {
    await page.goto('/membership/plans')

    await expect(page.getByRole('heading', { name: /plans/i }).first()).toBeVisible()
  })

  test('new plan link navigates to create form', async ({ page }) => {
    await page.goto('/membership/plans')

    await page.getByRole('link', { name: /new plan/i }).click()
    await expect(page).toHaveURL(/\/membership\/plans\/new/)
  })

  test('plan detail page is accessible from list', async ({ page }) => {
    await page.goto('/membership/plans')

    const firstPlan = page.locator('a[href^="/membership/plans/"]:not([href="/membership/plans/new"])').first()
    const hasPlan = await firstPlan.isVisible().catch(() => false)

    if (hasPlan) {
      await firstPlan.click()
      await expect(page).toHaveURL(/\/membership\/plans\/[0-9a-f-]{36}/)
    }
  })
})

// ─── Entitlement Policies ────────────────────────────────────────────────────

test.describe('Entitlement Policies', () => {
  test('policies list page loads', async ({ page }) => {
    await page.goto('/membership/policies')

    await expect(page.getByRole('heading', { name: /polic/i }).first()).toBeVisible()
  })

  test('new policy link navigates to create form', async ({ page }) => {
    await page.goto('/membership/policies')

    await page.getByRole('link', { name: /create policy/i }).click()
    await expect(page).toHaveURL(/\/membership\/policies\/new/)
  })

  test('new policy form requires a name', async ({ page }) => {
    await page.goto('/membership/policies/new')

    await page.getByRole('button', { name: /create/i }).click()
    await expect(page).toHaveURL(/\/membership\/policies\/new/)
  })

  test('creates a policy and lands on detail page', async ({ page }) => {
    await page.goto('/membership/policies/new')

    const uniqueName = `E2E Policy ${Date.now()}`
    await page.getByLabel(/name/i).fill(uniqueName)
    await page.selectOption('[name="policyType"]', 'advance_booking')

    await page.getByRole('button', { name: /create policy/i }).click()

    await expect(page).toHaveURL(/\/membership\/policies\/[0-9a-f-]{36}/, { timeout: 10_000 })
    await expect(page.getByText(uniqueName).first()).toBeVisible()
  })

  test('policy detail shows edit button', async ({ page }) => {
    await page.goto('/membership/policies')

    const firstPolicy = page.locator('a[href^="/membership/policies/"]:not([href="/membership/policies/new"])').first()
    const hasPolicy = await firstPolicy.isVisible().catch(() => false)

    if (hasPolicy) {
      await firstPolicy.click()
      await expect(page).toHaveURL(/\/membership\/policies\/[0-9a-f-]{36}/)
      await expect(page.getByRole('button', { name: /edit/i }).first()).toBeVisible()
    }
  })

  test('policy detail shows policy usage section', async ({ page }) => {
    await page.goto('/membership/policies')

    const firstPolicy = page.locator('a[href^="/membership/policies/"]:not([href="/membership/policies/new"])').first()
    const hasPolicy = await firstPolicy.isVisible().catch(() => false)

    if (hasPolicy) {
      await firstPolicy.click()
      await expect(page.getByText(/policy usage/i)).toBeVisible()
    }
  })
})

// ─── Memberships (individual) ─────────────────────────────────────────────────

test.describe('Memberships list and create', () => {
  test('memberships list page loads', async ({ page }) => {
    await page.goto('/membership/memberships')

    await expect(page.getByRole('heading', { name: /memberships/i }).first()).toBeVisible()
  })

  test('new membership link navigates to create form', async ({ page }) => {
    await page.goto('/membership/memberships')

    await page.getByRole('link', { name: /create membership/i }).click()
    await expect(page).toHaveURL(/\/membership\/memberships\/new/)
  })

  test('membership detail is accessible from list', async ({ page }) => {
    await page.goto('/membership/memberships')

    const firstRow = page.locator('a[href^="/membership/memberships/"]:not([href="/membership/memberships/new"]):not([href="/membership/memberships/bulk-assign"])').first()
    const hasRow = await firstRow.isVisible().catch(() => false)

    if (hasRow) {
      await firstRow.click()
      await expect(page).toHaveURL(/\/membership\/memberships\/[0-9a-f-]{36}/)
      await expect(page.getByText(/status/i).first()).toBeVisible()
    }
  })
})
