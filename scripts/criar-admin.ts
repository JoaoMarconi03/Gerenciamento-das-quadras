import { PrismaClient } from "@prisma/client";
import { hash } from "bcryptjs";

const db = new PrismaClient();

async function main() {
  const tenant = await db.tenant.findFirst();

  if (!tenant) {
    console.error(
      "Nenhum Tenant encontrado no banco. Crie um Tenant primeiro.",
    );
    process.exit(1);
  }

  const email = "admin@brejao.com";
  const senha = "admin123";
  const nome = "Admin";

  const existente = await db.usuario.findUnique({ where: { email } });
  if (existente) {
    console.log(`Usuário com email "${email}" já existe.`);
    process.exit(0);
  }

  const senhaHash = await hash(senha, 10);

  const usuario = await db.usuario.create({
    data: {
      nome,
      email,
      senha: senhaHash,
      role: "ADMIN",
      tenantId: tenant.id,
    },
  });

  console.log("Admin criado com sucesso!");
  console.log(`  Email : ${usuario.email}`);
  console.log(`  Senha : ${senha}`);
  console.log(`  Role  : ${usuario.role}`);
  console.log(`  Tenant: ${tenant.nome} (${tenant.id})`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
