import { redirect } from 'next/navigation'
import { getMyAdminUser, listAdminUsers } from '@/lib/api'
import { PortalLayout } from '@/components/portal-layout'
import { AdminUsersClient } from './admin-users-client'

export default async function AdminUsersPage() {
  const me = await getMyAdminUser()

  if (!me || me.role !== 'super') {
    redirect('/access-denied')
  }

  const adminUsers = await listAdminUsers()

  return (
    <PortalLayout
      title="Admin Users"
      description="Manage admin user accounts and role assignments."
    >
      <AdminUsersClient adminUsers={adminUsers} myId={me.id} />
    </PortalLayout>
  )
}
