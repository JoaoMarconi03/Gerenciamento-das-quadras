"use client"

import { useState, type ReactNode } from "react"
import { Menu } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet"
import { Sidebar } from "./sidebar"

function getIniciais(nome: string) {
  return nome.split(" ").filter(Boolean).slice(0, 2).map((p) => p[0].toUpperCase()).join("")
}

export function DashboardShell({
  children,
  tenantNome = "Gestão de Arena",
}: {
  children: ReactNode
  tenantNome?: string
}) {
  const [desktopOpen, setDesktopOpen] = useState(true)
  const [mobileOpen, setMobileOpen]   = useState(false)
  const iniciais = getIniciais(tenantNome)

  return (
    <div className="flex h-screen overflow-hidden">

      {/* ── Sidebar desktop — no fluxo flex, não fixed ────────────── */}
      <aside
        style={{ width: desktopOpen ? 240 : 0, transition: "width 250ms ease" }}
        className="hidden lg:flex flex-col shrink-0 overflow-hidden border-r border-sidebar-border bg-sidebar"
      >
        <Sidebar tenantNome={tenantNome} />
      </aside>

      {/* ── Área principal ───────────────────────────────────────── */}
      <div className="flex flex-col flex-1 overflow-hidden min-w-0">

        {/* Header — visível em todos os tamanhos */}
        <header className="flex items-center gap-3 px-4 py-3 border-b border-border bg-sidebar shrink-0">

          {/* Mobile: abre Sheet */}
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden text-muted-foreground hover:text-foreground"
            onClick={() => setMobileOpen(true)}
          >
            <Menu className="w-5 h-5" />
          </Button>

          {/* Desktop: toggle sidebar */}
          <Button
            variant="ghost"
            size="icon"
            className="hidden lg:flex text-muted-foreground hover:text-foreground"
            onClick={() => setDesktopOpen((v) => !v)}
          >
            <Menu className="w-5 h-5" />
          </Button>

          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-primary rounded-lg flex items-center justify-center shrink-0">
              <span className="text-primary-foreground font-bold text-xs">{iniciais}</span>
            </div>
            <span className="text-foreground font-bold text-sm truncate">{tenantNome}</span>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>

      {/* ── Sheet mobile ─────────────────────────────────────────── */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="p-0 w-64 bg-sidebar border-sidebar-border">
          <SheetTitle className="sr-only">Menu de navegação</SheetTitle>
          <Sidebar onNavigate={() => setMobileOpen(false)} tenantNome={tenantNome} />
        </SheetContent>
      </Sheet>
    </div>
  )
}
