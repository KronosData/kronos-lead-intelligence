'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { BarChart3, Building2, Plus, LogOut } from 'lucide-react'
import { cn } from '@/lib/utils'

const nav = [
  { href: '/', label: 'Dashboard', icon: BarChart3 },
  { href: '/companies/new', label: 'Add Company', icon: Plus },
]

export function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/login')
    router.refresh()
  }

  return (
    <aside className="fixed inset-y-0 left-0 z-40 flex w-56 flex-col border-r border-slate-700 bg-slate-900">
      <div className="flex h-14 items-center px-4 border-b border-slate-700">
        <div className="flex items-center gap-2">
          <Building2 className="h-5 w-5 text-orange-400" />
          <div>
            <p className="text-sm font-semibold text-white leading-none">Kronos</p>
            <p className="text-[10px] text-slate-400 leading-none mt-0.5">Lead Intelligence</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 space-y-1 p-3">
        {nav.map(({ href, label, icon: Icon }) => {
          const active = href === '/' ? pathname === '/' : pathname.startsWith(href)
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                active
                  ? 'bg-slate-700 text-white'
                  : 'text-slate-400 hover:bg-slate-800 hover:text-white'
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {label}
            </Link>
          )
        })}
      </nav>

      <div className="p-3 border-t border-slate-700 space-y-2">
        <p className="text-[10px] text-slate-500 px-3">Kronos Data · Internal</p>
        <button
          onClick={handleLogout}
          className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
        >
          <LogOut className="h-4 w-4 shrink-0" />
          Cerrar sesión
        </button>
      </div>
    </aside>
  )
}
