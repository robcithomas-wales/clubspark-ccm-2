export { AuthModule } from './auth.module.js'
export type { AuthModuleOptions } from './auth.module.js'
export { AUTH_OPTIONS, SKIP_TENANT_KEY } from './constants.js'
export { InternalSecretGuard } from './internal-secret.guard.js'
export { entraAuth, resolveRegion, supabaseAuth } from './presets.js'
export { SkipTenant } from './skip-tenant.decorator.js'
export { TenantContextGuard } from './tenant-context.guard.js'
export { TokenVerifier } from './token-verifier.js'
export type {
  AuthOptions,
  ClaimMapper,
  JwksConfig,
  JwksConfigSource,
  RegionSource,
  TenantContext,
  VerifiedClaims,
} from './types.js'
