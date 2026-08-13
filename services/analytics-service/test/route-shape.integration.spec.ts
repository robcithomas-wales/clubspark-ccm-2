import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import supertest from 'supertest'
import { getApp, closeApp } from './helpers/app.js'

/**
 * Route-shape guard for analytics-service.
 *
 * The platform serves unversioned controllers at BOTH their bare path and under
 * /v1 (src/bootstrap.ts sets defaultVersion: [VERSION_NEUTRAL, '1']). Nothing else
 * asserts that, so an edit to enableVersioning — or a Nest minor that changes how
 * an array defaultVersion is handled — could silently drop either branch. Portals,
 * the mobile app and inter-service clients all call the bare paths today, so losing
 * those breaks production while every other test still passes.
 *
 * /health is used because it is @SkipTenant() and needs no auth fixture or seed
 * data, which keeps this cheap enough to run everywhere.
 *
 * It also catches the boot-time FST_ERR_DUPLICATED_ROUTE that appears if someone
 * adds an explicitly v1-versioned controller for a path already served
 * unversioned: the app would fail to construct, so getApp() throws here.
 */
describe('analytics-service route shape', () => {
  beforeAll(async () => {
    await getApp()
  })

  afterAll(async () => {
    await closeApp()
  })

  it('serves /health unversioned — the path existing callers use', async () => {
    const app = await getApp()
    const res = await supertest(app.getHttpServer()).get('/health')
    expect(res.status).toBe(200)
  })

  it('serves the same handler under /v1', async () => {
    const app = await getApp()
    const res = await supertest(app.getHttpServer()).get('/v1/health')
    expect(res.status).toBe(200)
  })

  it('does not serve a doubled /v1/v1 prefix', async () => {
    const app = await getApp()
    const res = await supertest(app.getHttpServer()).get('/v1/v1/health')
    expect(res.status).toBe(404)
  })
})
