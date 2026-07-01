"use server"

import { hash } from "bcryptjs"
import { db } from "@/lib/db"

export async function registrarCliente(formData: FormData) {
  const nome = formData.get("nome") as string
  const email = formData.get("email") as string
  const telefone = formData.get("telefone") as string
  const senha = formData.get("senha") as string

  if (!nome || !email || !senha) {
    return { error: "Preencha todos os campos obrigatórios." }
  }

  if (senha.length < 6) {
    return { error: "A senha deve ter pelo menos 6 caracteres." }
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(email)) {
    return { error: "E-mail inválido." }
  }

  const existente = await db.usuario.findUnique({ where: { email } })
  if (existente) {
    return { error: "Este e-mail já está cadastrado." }
  }

  const arena  = (formData.get("arena") as string) || "brejao-arena"
  const tenant = await db.tenant.findFirst({ where: { slug: arena } })
  if (!tenant) return { error: "Arena não encontrada." }

  const senhaHash = await hash(senha, 12)

  const usuario = await db.usuario.create({
    data: {
      nome,
      email,
      senha: senhaHash,
      role: "CLIENTE",
      tenantId: tenant.id,
    },
  })

  // Se já existe um cliente manual com esse telefone, vincula em vez de duplicar
  const clienteExistente = telefone
    ? await db.cliente.findFirst({
        where: { tenantId: tenant.id, telefone, usuarioId: null },
      })
    : null

  if (clienteExistente) {
    await db.cliente.update({
      where: { id: clienteExistente.id },
      data: { nome, email, usuarioId: usuario.id },
    })
  } else {
    await db.cliente.create({
      data: {
        nome,
        email,
        telefone: telefone || null,
        usuarioId: usuario.id,
        tenantId: tenant.id,
      },
    })
  }

  return { success: true }
}
