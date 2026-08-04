import { DynamicModule, Global, Logger, Module } from '@nestjs/common'
import { APP_GUARD } from '@nestjs/core'
import { AUTH_OPTIONS } from './constants.js'
import { InternalSecretGuard } from './internal-secret.guard.js'
import { TenantContextGuard } from './tenant-context.guard.js'
import { TokenVerifier } from './token-verifier.js'
import type { AuthOptions } from './types.js'

export interface AuthModuleOptions extends AuthOptions {
  /**
   * Register `TenantContextGuard` as a global `APP_GUARD`. Defaults to true so a
   * new controller is protected by default — leaving registration to each
   * service means one forgotten line silently exposes everything it serves.
   */
  registerGlobalGuard?: boolean
}

@Global()
@Module({})
export class AuthModule {
  static forRoot(options: AuthModuleOptions): DynamicModule {
    const { registerGlobalGuard = true, ...authOptions } = options
    const resolved: AuthOptions = {
      ...authOptions,
      allowHeaderFallback: authOptions.allowHeaderFallback ?? isNonProduction(),
    }

    warnAboutInternalPrefixes(resolved)

    return {
      module: AuthModule,
      providers: [
        { provide: AUTH_OPTIONS, useValue: resolved },
        TokenVerifier,
        TenantContextGuard,
        InternalSecretGuard,
        ...(registerGlobalGuard ? [{ provide: APP_GUARD, useExisting: TenantContextGuard }] : []),
      ],
      exports: [AUTH_OPTIONS, TokenVerifier, TenantContextGuard, InternalSecretGuard],
    }
  }
}

/**
 * Header-based tenant auth is a convenience for integration tests and local
 * dev. It must be off anywhere else: `x-tenant-id` is caller-supplied, so
 * trusting it lets anyone read any tenant's data.
 *
 * Deliberately an allowlist of two exact values rather than `!== 'production'`.
 * An unset or misspelled NODE_ENV then fails closed instead of opening the
 * platform up — which is the direction you want to be wrong in.
 */
function isNonProduction(): boolean {
  const env = process.env['NODE_ENV']
  return env === 'test' || env === 'development'
}

function warnAboutInternalPrefixes(options: AuthOptions): void {
  const prefixes = options.internalPathPrefixes ?? []
  if (prefixes.length === 0) return

  new Logger(AuthModule.name).warn(
    `Tenant auth is bypassed for ${prefixes.join(', ')} — every controller under ` +
      'these prefixes MUST carry @UseGuards(InternalSecretGuard) or it is publicly reachable.',
  )
}
