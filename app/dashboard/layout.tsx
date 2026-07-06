import type { ReactNode } from "react"
import { auth } from "@/auth"
import { db } from "@/lib/db"
import { DashboardShell } from "@/components/dashboard/dashboard-shell"
import { InactivityGuard } from "@/components/inactivity-guard"

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const session  = await auth()
  const tenantId = (session?.user as any)?.tenantId
  const tenant   = tenantId ? await db.tenant.findUnique({ where: { id: tenantId } }) : null
  const tenantNome = tenant?.nome ?? "Gestão de Arena"

  return (
    <DashboardShell tenantNome={tenantNome}>
      <InactivityGuard />
      {children}
    </DashboardShell>
  )
}
