import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronDown, LogOut, UserCircle } from 'lucide-react'
import { useAuthStore } from '@/entities/session'

function initials(name: string): string {
  const parts = name.trim().split(/\s+/)
  return ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')).toUpperCase()
}

export function ProfileMenu() {
  const user = useAuthStore((s) => s.user)
  const logout = useAuthStore((s) => s.logout)
  const navigate = useNavigate()
  const containerRef = useRef<HTMLDivElement>(null)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  if (!user) return null

  return (
    <div ref={containerRef} className="relative ml-1 border-l border-[var(--color-border)] pl-3">
      <button onClick={() => setOpen((v) => !v)} className="flex items-center gap-2.5 rounded-lg py-1 pl-1 pr-1.5 hover:bg-[var(--color-canvas)]">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--color-brand-600)] text-xs font-semibold text-white">
          {initials(user.name)}
        </div>
        <div className="hidden leading-tight md:block">
          <p className="text-sm font-medium text-[var(--color-ink-900)]">{user.name}</p>
          <p className="text-xs text-[var(--color-ink-600)]">{user.role}</p>
        </div>
        <ChevronDown className="hidden h-3.5 w-3.5 shrink-0 text-[var(--color-ink-400)] md:block" />
      </button>

      {open && (
        <div className="absolute right-0 top-full z-40 mt-1.5 w-52 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] py-1 shadow-lg">
          <button
            onClick={() => {
              setOpen(false)
              navigate('/profile')
            }}
            className="flex w-full items-center gap-2.5 px-3.5 py-2 text-left text-sm text-[var(--color-ink-900)] hover:bg-[var(--color-canvas)]"
          >
            <UserCircle className="h-4 w-4 shrink-0 text-[var(--color-ink-400)]" />
            Профиль
          </button>
          <button
            onClick={() => {
              setOpen(false)
              logout()
              navigate('/login', { replace: true })
            }}
            className="flex w-full items-center gap-2.5 px-3.5 py-2 text-left text-sm text-[var(--color-priority-critical)] hover:bg-[var(--color-priority-critical-bg)]"
          >
            <LogOut className="h-4 w-4 shrink-0" />
            Выйти
          </button>
        </div>
      )}
    </div>
  )
}
