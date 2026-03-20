import Link from 'next/link'
import { ShieldAlert } from 'lucide-react'

export default function AccessDeniedPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="max-w-md w-full text-center px-6 py-12">
        <div className="flex justify-center mb-6">
          <div className="h-16 w-16 rounded-full bg-red-100 flex items-center justify-center">
            <ShieldAlert className="h-8 w-8 text-red-500" />
          </div>
        </div>
        <h1 className="text-2xl font-bold text-slate-900 mb-2">Access Denied</h1>
        <p className="text-slate-500 mb-8">
          You don't have permission to access this page. Contact a super admin if you need access.
        </p>
        <Link
          href="/"
          className="inline-flex items-center gap-2 rounded-xl bg-[#1857E0] px-6 py-3 text-sm font-semibold text-white shadow-sm hover:bg-[#1446c0] transition-colors"
        >
          Back to Dashboard
        </Link>
      </div>
    </div>
  )
}
