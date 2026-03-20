'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Pencil, Trash2, ShieldCheck, X, Check } from 'lucide-react'
import type { AdminUser, AdminRole } from '@/lib/api'

const ROLES: AdminRole[] = ['super', 'bookings', 'membership', 'website', 'coaching', 'reports']

const ROLE_LABELS: Record<AdminRole, string> = {
  super: 'Super Admin',
  bookings: 'Bookings',
  membership: 'Membership',
  website: 'Website',
  coaching: 'Coaching',
  reports: 'Reports',
}

const ROLE_COLORS: Record<AdminRole, string> = {
  super: 'bg-purple-100 text-purple-700',
  bookings: 'bg-blue-100 text-blue-700',
  membership: 'bg-emerald-100 text-emerald-700',
  website: 'bg-orange-100 text-orange-700',
  coaching: 'bg-cyan-100 text-cyan-700',
  reports: 'bg-slate-100 text-slate-700',
}

interface Props {
  adminUsers: AdminUser[]
  myId: string
}

export function AdminUsersClient({ adminUsers: initial, myId }: Props) {
  const [users, setUsers] = useState<AdminUser[]>(initial)
  const [showAdd, setShowAdd] = useState(false)
  const [addUserId, setAddUserId] = useState('')
  const [addRole, setAddRole] = useState<AdminRole>('bookings')
  const [addError, setAddError] = useState<string | null>(null)
  const [addLoading, setAddLoading] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editRole, setEditRole] = useState<AdminRole>('bookings')
  const [editActive, setEditActive] = useState(true)
  const router = useRouter()

  async function handleAdd() {
    if (!addUserId.trim()) return
    setAddLoading(true)
    setAddError(null)
    try {
      const res = await fetch('/api/admin-users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: addUserId.trim(), role: addRole }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.message ?? 'Failed to create admin user')
      setUsers((prev) => [...prev, json.data])
      setAddUserId('')
      setAddRole('bookings')
      setShowAdd(false)
      router.refresh()
    } catch (err: unknown) {
      setAddError(err instanceof Error ? err.message : 'Failed to create admin user')
    } finally {
      setAddLoading(false)
    }
  }

  async function handleUpdate(id: string) {
    try {
      const res = await fetch(`/api/admin-users/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: editRole, isActive: editActive }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.message ?? 'Failed to update')
      setUsers((prev) => prev.map((u) => (u.id === id ? json.data : u)))
      setEditingId(null)
      router.refresh()
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to update admin user')
    }
  }

  async function handleDelete(id: string, userId: string) {
    if (!confirm(`Remove admin access for ${userId}?`)) return
    try {
      const res = await fetch(`/api/admin-users/${id}`, { method: 'DELETE' })
      if (!res.ok) {
        const json = await res.json().catch(() => ({}))
        throw new Error(json.message ?? 'Failed to delete')
      }
      setUsers((prev) => prev.filter((u) => u.id !== id))
      router.refresh()
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to delete admin user')
    }
  }

  function startEdit(user: AdminUser) {
    setEditingId(user.id)
    setEditRole(user.role)
    setEditActive(user.isActive)
  }

  return (
    <div className="space-y-6">
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-[#1857E0]" />
            <h2 className="text-base font-semibold text-slate-900">Admin Users</h2>
            <span className="ml-1 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
              {users.length}
            </span>
          </div>
          <button
            onClick={() => setShowAdd(true)}
            className="flex items-center gap-1.5 rounded-xl bg-[#1857E0] px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-[#1446c0] transition-colors"
          >
            <Plus className="h-4 w-4" />
            Add Admin User
          </button>
        </div>

        {showAdd && (
          <div className="border-b border-slate-100 bg-slate-50 px-6 py-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
              <div className="flex-1">
                <label className="mb-1 block text-xs font-medium text-slate-600">User ID</label>
                <input
                  type="text"
                  value={addUserId}
                  onChange={(e) => setAddUserId(e.target.value)}
                  placeholder="Supabase user UUID"
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-[#1857E0] focus:outline-none focus:ring-1 focus:ring-[#1857E0]"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">Role</label>
                <select
                  value={addRole}
                  onChange={(e) => setAddRole(e.target.value as AdminRole)}
                  className="rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-[#1857E0] focus:outline-none focus:ring-1 focus:ring-[#1857E0]"
                >
                  {ROLES.map((r) => (
                    <option key={r} value={r}>{ROLE_LABELS[r]}</option>
                  ))}
                </select>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleAdd}
                  disabled={addLoading || !addUserId.trim()}
                  className="flex items-center gap-1.5 rounded-lg bg-[#1857E0] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50 hover:bg-[#1446c0] transition-colors"
                >
                  <Check className="h-4 w-4" />
                  Add
                </button>
                <button
                  onClick={() => { setShowAdd(false); setAddError(null); setAddUserId('') }}
                  className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-600 hover:bg-slate-100 transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
            {addError && <p className="mt-2 text-xs text-red-600">{addError}</p>}
          </div>
        )}

        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50/50">
              <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">User ID</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Role</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Status</th>
              <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {users.length === 0 && (
              <tr>
                <td colSpan={4} className="px-6 py-8 text-center text-sm text-slate-400">
                  No admin users yet.
                </td>
              </tr>
            )}
            {users.map((user) => (
              <tr key={user.id} className="hover:bg-slate-50/50">
                <td className="px-6 py-4 font-mono text-xs text-slate-700">
                  {user.userId}
                  {user.id === myId && (
                    <span className="ml-2 rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-600">you</span>
                  )}
                </td>
                <td className="px-4 py-4">
                  {editingId === user.id ? (
                    <select
                      value={editRole}
                      onChange={(e) => setEditRole(e.target.value as AdminRole)}
                      className="rounded-lg border border-slate-200 px-2 py-1 text-xs focus:border-[#1857E0] focus:outline-none"
                    >
                      {ROLES.map((r) => (
                        <option key={r} value={r}>{ROLE_LABELS[r]}</option>
                      ))}
                    </select>
                  ) : (
                    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${ROLE_COLORS[user.role]}`}>
                      {ROLE_LABELS[user.role]}
                    </span>
                  )}
                </td>
                <td className="px-4 py-4">
                  {editingId === user.id ? (
                    <label className="flex cursor-pointer items-center gap-2 text-xs">
                      <input
                        type="checkbox"
                        checked={editActive}
                        onChange={(e) => setEditActive(e.target.checked)}
                        className="h-4 w-4 rounded border-slate-300 text-[#1857E0]"
                      />
                      Active
                    </label>
                  ) : (
                    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${user.isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                      {user.isActive ? 'Active' : 'Inactive'}
                    </span>
                  )}
                </td>
                <td className="px-4 py-4">
                  <div className="flex items-center justify-end gap-2">
                    {editingId === user.id ? (
                      <>
                        <button
                          onClick={() => handleUpdate(user.id)}
                          className="flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 transition-colors"
                        >
                          <Check className="h-3.5 w-3.5" />
                          Save
                        </button>
                        <button
                          onClick={() => setEditingId(null)}
                          className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs text-slate-600 hover:bg-slate-100 transition-colors"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={() => startEdit(user)}
                          className="rounded-lg border border-slate-200 p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-colors"
                          title="Edit"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        {user.id !== myId && (
                          <button
                            onClick={() => handleDelete(user.id, user.userId)}
                            className="rounded-lg border border-slate-200 p-1.5 text-slate-500 hover:bg-red-50 hover:border-red-200 hover:text-red-600 transition-colors"
                            title="Remove"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
