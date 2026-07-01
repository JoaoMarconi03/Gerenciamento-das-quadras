import { db } from "@/lib/db"
import { LoginForm } from "./login-form"

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ arena?: string }>
}) {
  const params = await searchParams
  const slug = params.arena ?? "brejao-arena"
  const tenant = await db.tenant.findFirst({ where: { slug } })
  const tenantNome = tenant?.nome ?? "Gestão de Arena"

  const voltarHref = slug === "brejao-arena" ? "/" : `/${slug}`

  return (
    <LoginForm
      tenantNome={tenantNome}
      tenantSlug={slug}
      voltarHref={voltarHref}
    />
  )
}
