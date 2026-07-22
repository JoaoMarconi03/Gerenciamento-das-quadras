// dotenv deve rodar ANTES de qualquer import que use process.env
import { config } from "dotenv"
config({ path: ".env", override: true })

async function main() {
  // dynamic imports para garantir que dotenv já rodou
  const { db } = await import("../lib/db")
  const { hash } = await import("bcryptjs")

  console.log("🌱 Iniciando seed...")

  // Tenant
  let tenant = await db.tenant.findFirst({ where: { slug: "brejao-arena" } })
  if (!tenant) {
    tenant = await db.tenant.create({
      data: { nome: "Brejão Arena", slug: "brejao-arena" },
    })
    console.log("✅ Tenant criado:", tenant.nome)
  } else {
    console.log("⏭️  Tenant já existe:", tenant.nome)
  }

  // Admin
  let admin = await db.usuario.findUnique({ where: { email: "admin@brejao.com" } })
  if (!admin) {
    const senhaHash = await hash("admin123", 12)
    await db.usuario.create({
      data: {
        nome: "Admin",
        email: "admin@brejao.com",
        senha: senhaHash,
        role: "ADMIN",
        tenantId: tenant.id,
      },
    })
    console.log("✅ Admin criado — email: admin@brejao.com | senha: admin123")
  } else {
    console.log("⏭️  Admin já existe")
  }

  // Quadra
  const quadra = await db.quadra.findFirst({ where: { tenantId: tenant.id } })
  if (!quadra) {
    await db.quadra.create({
      data: {
        nome: "Quadra Principal",
        descricao: "Quadra society — gramado sintético",
        tenantId: tenant.id,
      },
    })
    console.log("✅ Quadra criada")
  } else {
    console.log("⏭️  Quadra já existe")
  }

  // Produtos do bar
  const produtosExistentes = await db.produto.count({ where: { tenantId: tenant.id } })
  if (produtosExistentes === 0) {
    const produtos = [
      { nome: "Água 500ml", preco: 3, categoria: "BEBIDAS" as const },
      { nome: "Água 1L", preco: 5, categoria: "BEBIDAS" as const },
      { nome: "Refrigerante Lata", preco: 8, categoria: "LATAS" as const },
      { nome: "Cerveja 600ml", preco: 15, categoria: "CERVEJA_600ML" as const },
      { nome: "Energético 473ml", preco: 18, categoria: "LATAS" as const },
      { nome: "Isotônico 500ml", preco: 8, categoria: "BEBIDAS" as const },
      { nome: "Coxinha", preco: 6, categoria: "PETISCOS_DOCES" as const },
      { nome: "Pão de Queijo", preco: 4, categoria: "PETISCOS_DOCES" as const },
    ]
    for (const p of produtos) {
      await db.produto.create({ data: { ...p, tenantId: tenant!.id } })
    }
    console.log(`✅ ${produtos.length} produtos do bar criados`)
  } else {
    console.log("⏭️  Produtos já existem")
  }

  console.log("\n🎉 Seed concluído!")
  console.log("   URL:   http://localhost:3000")
  console.log("   Login: admin@brejao.com")
  console.log("   Senha: admin123")
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(() => process.exit(0))
