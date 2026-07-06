import { LoginForm } from "@/app/(auth)/login/login-form"
import { buscarTenantPublico } from "@/app/actions"

export default async function LoginVotocelPage() {
  const tenant = await buscarTenantPublico("arena-votocel")
  const tenantNome = tenant?.nome ?? "Arena Votocel"

  return (
    <LoginForm
      tenantNome={tenantNome}
      tenantSlug="arena-votocel"
      voltarHref="/arena-votocel"
      variant="votocel"
    />
  )
}
