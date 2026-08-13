import { VersioningType, VERSION_NEUTRAL } from '@nestjs/common'
import type { INestApplication } from '@nestjs/common'

/**
 * Route configuration shared by main.ts and test/helpers/app.ts.
 *
 * It lives in one file because the two used to configure the app differently, and
 * the difference was invisible: a harness that skipped `enableVersioning` served
 * a `version: '1'` controller at its bare path, so tests asserted URLs the
 * production build does not expose — and passed. WO-1.2 is a live example of what
 * that costs: a caller used a /v1 prefix neither service served, every call 404'd,
 * and customer financial profiles silently reported zero spend.
 *
 * Anything affecting which URL a handler answers on belongs here, not in main.ts.
 */
export function configureRouting(app: INestApplication): void {
  // URI versioning. `defaultVersion` covers controllers that declare no version
  // of their own: VERSION_NEUTRAL keeps their existing unprefixed route working
  // (portals, mobile and inter-service clients call those today), and '1' also
  // exposes them under /v1 so every service is reachable at /v1 consistently.
  // Controllers that set `version` explicitly are unaffected.
  //
  // Note: with this in place, adding an explicitly v1-versioned controller for a
  // path another controller already serves unversioned is a boot-time
  // FST_ERR_DUPLICATED_ROUTE rather than two coexisting routes. That is what
  // splitting a fat controller can look like — the /v1 smoke test catches it.
  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: [VERSION_NEUTRAL, '1'],
  })
}
