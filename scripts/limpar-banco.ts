import { PrismaClient } from "@prisma/client"

const db = new PrismaClient()

async function main() {
  console.log("Limpando banco de dados...")

  await db.pagamentoFiado.deleteMany()
  await db.lancamentoFiado.deleteMany()
  await db.contaFiado.deleteMany()
  await db.pagamentoMensal.deleteMany()
  await db.assinatura.deleteMany()
  await db.agendamento.deleteMany()
  await db.produto.deleteMany()
  await db.plano.deleteMany()
  await db.quadra.deleteMany()

  // Clientes sem ser o admin
  await db.cliente.deleteMany()

  // Usuários que não são ADMIN
  await db.usuario.deleteMany({ where: { role: { not: "ADMIN" } } })

  console.log("Banco limpo! Tenant e usuário admin foram preservados.")
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(() => db.$disconnect())
