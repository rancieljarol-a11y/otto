'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { MessageSquare, LayoutDashboard, ShoppingBag, Users, FileText, Settings } from 'lucide-react'

const nav = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/productos', label: 'Productos', icon: ShoppingBag },
  { href: '/pedidos', label: 'Pedidos', icon: MessageSquare },
  { href: '/clientes', label: 'Clientes', icon: Users },
  { href: '/gastos', label: 'Gastos', icon: FileText },
  { href: '/config', label: 'Config', icon: Settings },
]

export function Sidebar() {
  const pathname = usePathname()
  return (
    <aside className="w-56 border-r bg-white shrink-0 hidden md:block">
      <div className="p-4 font-bold text-lg">OttO</div>
      <nav className="px-2 space-y-1">
        {nav.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm ${
              pathname === href ? 'bg-primary text-white' : 'text-muted-foreground hover:bg-slate-100'
            }`}
          >
            <Icon className="h-4 w-4" />
            {label}
          </Link>
        ))}
      </nav>
    </aside>
  )
}
