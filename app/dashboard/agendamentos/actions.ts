"use server"

import { db } from "@/lib/db"
import { auth } from "@/auth"
import { revalidatePath } from "next/cache"

async function verificarAdmin() {
  const session = await auth()
  const role = (session?.user as any)?.role
  if (!session?.user || (role !== "ADMIN" && role !== "STAFF")) {
    throw new Error("Não autorizado")
  }
}

export async function aprovarAgendamento(id: string) {
  await verificarAdmin()
  await db.agendamento.update({ where: { id }, data: { status: "CONFIRMADO" } })
  revalidatePath("/dashboard/agendamentos")
}

export async function cancelarAgendamento(id: string) {
  await verificarAdmin()
  await db.agendamento.update({ where: { id }, data: { status: "CANCELADO" } })
  revalidatePath("/dashboard/agendamentos")
}
