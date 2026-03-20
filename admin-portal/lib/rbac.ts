import type { AdminRole } from './api'

/**
 * Maps route prefixes to the roles that may access them.
 * Routes not listed here are accessible to any authenticated admin user.
 * 'super' is always allowed everywhere.
 */
export const ROUTE_ROLES: Array<{ prefix: string; roles: AdminRole[] }> = [
  { prefix: '/settings/admin-users', roles: ['super'] },
  { prefix: '/settings',             roles: ['super'] },
  { prefix: '/membership',           roles: ['super', 'membership'] },
  { prefix: '/booking-rules',        roles: ['super', 'bookings'] },
  { prefix: '/booking-series',       roles: ['super', 'bookings'] },
  { prefix: '/bookings',             roles: ['super', 'bookings'] },
  { prefix: '/reports',              roles: ['super', 'reports'] },
  { prefix: '/website',              roles: ['super', 'website'] },
  { prefix: '/people',               roles: ['super', 'bookings', 'membership', 'coaching'] },
]

/**
 * Returns the roles that may access a given path.
 * Returns null if the route has no role restriction.
 */
export function requiredRolesForPath(path: string): AdminRole[] | null {
  for (const { prefix, roles } of ROUTE_ROLES) {
    if (path === prefix || path.startsWith(prefix + '/')) {
      return roles
    }
  }
  return null
}

export function canAccess(role: AdminRole | null, path: string): boolean {
  if (!role) return false
  if (role === 'super') return true
  const required = requiredRolesForPath(path)
  if (!required) return true
  return required.includes(role)
}
