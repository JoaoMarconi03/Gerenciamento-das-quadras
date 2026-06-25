import { PrismaClient } from "@prisma/client"
import { PrismaNeonHttp } from "@prisma/adapter-neon"
import { hash } from "bcryptjs"

const adapter = new PrismaNeonHttp(process.env.DATABASE_URL!, {})
const db = new PrismaClient({ adapter })

async function main() {
  const tenant = await db.tenant.findFirst()
  if (!tenant) {
    console.error("Nenhum Tenant encontrado no banco.")
    process.exit(1)
  }

  const email = "cliente@brejao.com"
  const senha = "cliente123"
  const nome  = "Cliente Teste"

  const existente = await db.usuario.findUnique({ where: { email } })
  if (existente) {
    console.log(`Usuário "${email}" já existe.`)
    process.exit(0)
  }

  const senhaHash = await hash(senha, 10)

  const usuario = await db.usuario.create({
    data: {
      nome,
      email,
      senha: senhaHash,
      role:     "CLIENTE",
      tenantId: tenant.id,
    },
  })

  await db.cliente.create({
    data: {
      nome,
      email,
      tenantId:  tenant.id,
      usuarioId: usuario.id,
    },
  })

  console.log("\nCliente criado com sucesso!")
  console.log(`  Email : ${email}`)
  console.log(`  Senha : ${senha}`)
  console.log(`  Tenant: ${tenant.nome}`)
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(() => db.$disconnect())
