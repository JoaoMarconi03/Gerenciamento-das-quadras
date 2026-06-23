"use server"

import { db } from "@/lib/db"
import { auth } from "@/auth"
import { revalidatePath } from "next/cache"

export async function criarReserva(dados: {
  clienteId: string
  quadraId: string
  inicio: string
  fim: string
  observacao: string | null
}) {
  const session = await auth()
  if (!session?.user) throw new Error("Não autorizado")

  await db.agendamento.create({
    data: {
      inicio:     new Date(dados.inicio),
      fim:        new Date(dados.fim),
      status:     "PENDENTE",
      tipo:       "AVULSO",
      quadraId:   dados.quadraId,
      clienteId:  dados.clienteId,
      observacao: dados.observacao || null,
    },
  })

  revalidatePath("/minha-conta")
  revalidatePath("/minha-conta/horarios")
}
