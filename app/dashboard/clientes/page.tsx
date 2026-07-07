import { buscarClientes } from "./actions"
import { ClientesLista } from "@/components/dashboard/clientes-lista"

export default async function ClientesPage() {
  const clientes = await buscarClientes()
  return <ClientesLista clientes={clientes} />
}
