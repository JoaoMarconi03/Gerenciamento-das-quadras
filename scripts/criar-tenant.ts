import { PrismaClient } from "@prisma/client"
import { PrismaNeonHttp } from "@prisma/adapter-neon"
import { hash } from "bcryptjs"

const adapter = new PrismaNeonHttp(process.env.DATABASE_URL!, {})
const db = new PrismaClient({ adapter })

async function main() {
  // ── Configurar aqui ──────────────────────────────
  const tenantNome  = "Arena Votocel"
  const tenantSlug  = "arena-votocel"
  const adminNome   = "Admin Votocel"
  const adminEmail  = "admin@votocel.com"
  const adminSenha  = "votocel123"
  // ────────────────────────────────────────────────

  const existente = await db.tenant.findFirst({ where: { slug: tenantSlug } })
  if (existente) {
    console.log(`Tenant "${tenantSlug}" já existe.`)
    process.exit(0)
  }

  const tenant = await db.tenant.create({
    data: { nome: tenantNome, slug: tenantSlug },
  })
  console.log(`✓ Tenant criado: ${tenant.nome} (${tenant.id})`)

  const senhaHash = await hash(adminSenha, 12)
  const admin = await db.usuario.create({
    data: {
      nome:     adminNome,
      email:    adminEmail,
      senha:    senhaHash,
      role:     "ADMIN",
      tenantId: tenant.id,
    },
  })

  console.log(`✓ Admin criado:`)
  console.log(`    Nome  : ${admin.nome}`)
  console.log(`    Email : ${admin.email}`)
  console.log(`    Senha : ${adminSenha}`)
  console.log(``)
  console.log(`Link de registro dos clientes:`)
  console.log(`    /registro?arena=${tenantSlug}`)
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(() => db.$disconnect())
