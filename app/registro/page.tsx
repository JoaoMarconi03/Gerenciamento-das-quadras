import { notFound } from "next/navigation"
import { db } from "@/lib/db"
import { RegistroForm } from "./registro-form"

export default async function RegistroPage({
  searchParams,
}: {
  searchParams: Promise<{ arena?: string }>
}) {
  const params = await searchParams
  const slug   = params.arena ?? "brejao-arena"

  const tenant = await db.tenant.findFirst({ where: { slug } })
  if (!tenant) notFound()

  return <RegistroForm tenantSlug={tenant.slug} tenantNome={tenant.nome} />
}
