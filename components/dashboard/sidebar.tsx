"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { signOut } from "next-auth/react"
import {
  LayoutDashboard,
  Calendar,
  Users,
  ShoppingCart,
  Trophy,
  Star,
  Settings,
  LogOut,
  CircleDollarSign,
  ClipboardList,
} from "lucide-react"
import { cn } from "@/lib/utils"

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { href: "/dashboard/agendamentos", label: "Agendamentos", icon: Calendar, exact: false },
  { href: "/dashboard/pagamentos", label: "Pagamentos", icon: CircleDollarSign, exact: false },
  { href: "/dashboard/clientes", label: "Clientes", icon: Users, exact: false },
  { href: "/dashboard/bar", label: "Bar", icon: ShoppingCart, exact: false },
  { href: "/dashboard/comandas", label: "Comandas", icon: ClipboardList, exact: false },
  { href: "/dashboard/quadras", label: "Quadras", icon: Trophy, exact: false },
  { href: "/dashboard/planos", label: "Planos Mensais", icon: Star, exact: false },
]

function getIniciais(nome: string) {
  return nome
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0].toUpperCase())
    .join("")
}

export function Sidebar({ onNavigate, tenantNome = "Gestão de Arena" }: { onNavigate?: () => void; tenantNome?: string }) {
  const pathname = usePathname()
  const iniciais = getIniciais(tenantNome)

  return (
    <div className="flex flex-col h-full bg-sidebar border-r border-sidebar-border">
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 py-5 border-b border-sidebar-border">
        <div className="w-9 h-9 bg-primary rounded-xl flex items-center justify-center shrink-0">
          <span className="text-primary-foreground font-bold text-sm">{iniciais}</span>
        </div>
        <div>
          <p className="text-sidebar-foreground font-bold text-sm">{tenantNome}</p>
          <p className="text-muted-foreground text-xs">Painel Admin</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = item.exact
            ? pathname === item.href
            : pathname.startsWith(item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all",
                isActive
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:text-sidebar-foreground hover:bg-sidebar-accent"
              )}
            >
              <item.icon className="w-4 h-4 shrink-0" />
              <span>{item.label}</span>
            </Link>
          )
        })}
      </nav>

      {/* Bottom */}
      <div className="px-3 py-3 border-t border-sidebar-border space-y-0.5">
        <Link
          href="/dashboard/configuracoes"
          onClick={onNavigate}
          className={cn(
            "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all",
            pathname === "/dashboard/configuracoes"
              ? "bg-primary/10 text-primary"
              : "text-muted-foreground hover:text-sidebar-foreground hover:bg-sidebar-accent"
          )}
        >
          <Settings className="w-4 h-4 shrink-0" />
          <span>Configurações</span>
        </Link>
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all"
        >
          <LogOut className="w-4 h-4 shrink-0" />
          <span>Sair</span>
        </button>
      </div>
    </div>
  )
}
