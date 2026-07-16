"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import {
  Search, Plus, Phone, Mail, CalendarPlus,
  UserCheck, CalendarDays, Pencil, Trash2,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import {
  criarClienteManual,
  editarCliente,
  excluirCliente,
} from "@/app/dashboard/clientes/actions"

type Cliente = {
  id:                string
  nome:              string
  telefone:          string | null
  email:             string | null
  usuarioId:         string | null
  tipoCliente:       "AVULSO" | "MENSALISTA"
  totalAgendamentos: number
  mensalista:        boolean
}

export function ClientesLista({ clientes }: { clientes: Cliente[] }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const [busca, setBusca]           = useState("")
  const [dialogOpen, setDialogOpen] = useState(false)
  const [formManual, setFormManual] = useState({ nome: "", telefone: "", email: "", tipoCliente: "AVULSO" as "AVULSO" | "MENSALISTA" })
  const [erro, setErro]             = useState("")

  // estado de edição
  const [editandoId, setEditandoId]   = useState<string | null>(null)
  const [editOpen, setEditOpen]       = useState(false)
  const [formEdit, setFormEdit]       = useState({ nome: "", telefone: "", email: "", tipoCliente: "AVULSO" as "AVULSO" | "MENSALISTA" })
  const [erroEdit, setErroEdit]       = useState("")

  // estado de confirmação de exclusão
  const [confirmarExclusao, setConfirmarExclusao] = useState<Cliente | null>(null)
  const [excluindo, setExcluindo]                 = useState<string | null>(null)
  const [erroExclusao, setErroExclusao]           = useState("")

  const filtrados = clientes.filter(
    (c) =>
      c.nome.toLowerCase().includes(busca.toLowerCase()) ||
      c.telefone?.includes(busca) ||
      c.email?.toLowerCase().includes(busca.toLowerCase()),
  )

  function abrirDialog() {
    setFormManual({ nome: "", telefone: "", email: "", tipoCliente: "AVULSO" })
    setErro("")
    setDialogOpen(true)
  }

  function handleCriarManual() {
    if (!formManual.nome.trim()) return
    setErro("")
    startTransition(async () => {
      try {
        const res = await criarClienteManual(formManual)
        if (res.ok) {
          setDialogOpen(false)
          router.refresh()
        } else {
          setErro(res.erro ?? "Erro ao cadastrar.")
        }
      } catch {
        setErro("Erro ao cadastrar. Tente novamente.")
      }
    })
  }

  function handleAgendar(c: Cliente) {
    router.push(
      `/dashboard/agendamentos?clienteId=${c.id}&clienteNome=${encodeURIComponent(c.nome)}`,
    )
  }

  function abrirEditar(c: Cliente) {
    setEditandoId(c.id)
    setFormEdit({ nome: c.nome, telefone: c.telefone ?? "", email: c.email ?? "", tipoCliente: c.tipoCliente })
    setErroEdit("")
    setEditOpen(true)
  }

  function handleSalvarEditar() {
    if (!editandoId || !formEdit.nome.trim()) return
    setErroEdit("")
    startTransition(async () => {
      try {
        await editarCliente(editandoId, formEdit)
        setEditOpen(false)
        router.refresh()
      } catch {
        setErroEdit("Erro ao salvar. Tente novamente.")
      }
    })
  }

  function handleExcluir(c: Cliente) {
    setConfirmarExclusao(c)
  }

  function confirmarEExcluir() {
    if (!confirmarExclusao) return
    const id = confirmarExclusao.id
    setErroExclusao("")
    setExcluindo(id)
    setConfirmarExclusao(null)
    startTransition(async () => {
      try {
        const res = await excluirCliente(id)
        if (res.ok) {
          router.refresh()
        } else {
          setErroExclusao(res.erro ?? "Erro ao excluir.")
        }
      } catch (e) {
        setErroExclusao(e instanceof Error ? e.message : "Erro ao excluir.")
      } finally {
        setExcluindo(null)
      }
    })
  }

  return (
    <div className="p-4 lg:p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">Clientes</h1>
          <p className="text-sm text-muted-foreground">{clientes.length} cliente{clientes.length !== 1 ? "s" : ""} cadastrado{clientes.length !== 1 ? "s" : ""}</p>
        </div>
        <Button onClick={abrirDialog} className="gap-2">
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">Novo Cadastro</span>
        </Button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por nome, telefone ou e-mail..."
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          className="pl-9 bg-card border-border text-foreground placeholder:text-muted-foreground"
        />
      </div>

      {/* Lista */}
      <div className="space-y-2">
        {filtrados.length === 0 && (
          <p className="text-center text-muted-foreground text-sm py-10">
            Nenhum cliente encontrado.
          </p>
        )}

        {filtrados.map((c) => (
          <Card
            key={c.id}
            className="bg-card border-border hover:border-primary/30 transition-colors"
          >
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <span className="text-primary font-bold text-sm">{c.nome.charAt(0).toUpperCase()}</span>
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-foreground text-sm truncate">{c.nome}</p>
                      {c.usuarioId && (
                        <span className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-primary bg-primary/10 px-1.5 py-0.5 rounded-md shrink-0">
                          <UserCheck className="w-3 h-3" />
                          App
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                      {c.telefone && (
                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Phone className="w-3 h-3" />
                          {c.telefone}
                        </span>
                      )}
                      {c.email && (
                        <span className="flex items-center gap-1 text-xs text-muted-foreground hidden sm:flex">
                          <Mail className="w-3 h-3" />
                          {c.email}
                        </span>
                      )}
                      {c.totalAgendamentos > 0 && (
                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                          <CalendarDays className="w-3 h-3" />
                          {c.totalAgendamentos} agendamento{c.totalAgendamentos !== 1 ? "s" : ""}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <Badge
                    variant="outline"
                    className={
                      c.mensalista
                        ? "border-primary/30 text-primary text-xs"
                        : "border-border text-muted-foreground text-xs"
                    }
                  >
                    {c.mensalista ? "Mensalista" : "Avulso"}
                  </Badge>
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-1.5 text-xs border-border h-8 px-3 shrink-0"
                    onClick={() => handleAgendar(c)}
                  >
                    <CalendarPlus className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Agendar</span>
                  </Button>
                  <button
                    title="Editar"
                    onClick={() => abrirEditar(c)}
                    className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    title="Excluir"
                    disabled={excluindo === c.id}
                    onClick={() => handleExcluir(c)}
                    className="p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors disabled:opacity-40"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {erroExclusao && (
        <p className="text-xs text-destructive bg-destructive/10 border border-destructive/20 rounded-lg px-3 py-2.5">
          {erroExclusao}
        </p>
      )}

      {/* Dialog — Confirmar Exclusão */}
      <Dialog open={!!confirmarExclusao} onOpenChange={(o) => { if (!o) setConfirmarExclusao(null) }}>
        <DialogContent className="bg-card border-border sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-foreground">Excluir cliente</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-1">
            <p className="text-sm text-muted-foreground">
              Tem certeza que deseja excluir{" "}
              <span className="font-semibold text-foreground">{confirmarExclusao?.nome}</span>?
              Esta ação não pode ser desfeita.
            </p>
            <div className="flex gap-2 pt-1">
              <Button
                variant="outline"
                className="flex-1 border-border"
                onClick={() => setConfirmarExclusao(null)}
              >
                Cancelar
              </Button>
              <Button
                variant="destructive"
                className="flex-1"
                onClick={confirmarEExcluir}
              >
                Excluir
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog — Editar Cliente */}
      <Dialog open={editOpen} onOpenChange={(o) => { if (!isPending) setEditOpen(o) }}>
        <DialogContent className="bg-card border-border sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-foreground">Editar Cliente</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-1">
            <div className="space-y-2">
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Tipo de cliente</Label>
              <div className="grid grid-cols-2 gap-2">
                {(["AVULSO", "MENSALISTA"] as const).map((tipo) => (
                  <button
                    key={tipo}
                    type="button"
                    onClick={() => setFormEdit((f) => ({ ...f, tipoCliente: tipo }))}
                    className={`py-2.5 px-3 rounded-xl border-2 text-sm font-semibold transition-all ${
                      formEdit.tipoCliente === tipo
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border bg-secondary/40 text-muted-foreground hover:border-primary/40"
                    }`}
                  >
                    {tipo === "AVULSO" ? "Avulso" : "Mensalista"}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Nome *</Label>
              <Input
                placeholder="Nome completo"
                value={formEdit.nome}
                onChange={(e) => setFormEdit((f) => ({ ...f, nome: e.target.value }))}
                className="bg-secondary border-border text-foreground placeholder:text-muted-foreground h-11"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Telefone</Label>
              <Input
                placeholder="(15) 99999-0000"
                value={formEdit.telefone}
                onChange={(e) => setFormEdit((f) => ({ ...f, telefone: e.target.value }))}
                className="bg-secondary border-border text-foreground placeholder:text-muted-foreground h-11"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">E-mail</Label>
              <Input
                type="email"
                placeholder="email@exemplo.com"
                value={formEdit.email}
                onChange={(e) => setFormEdit((f) => ({ ...f, email: e.target.value }))}
                className="bg-secondary border-border text-foreground placeholder:text-muted-foreground h-11"
              />
            </div>
            {erroEdit && <p className="text-xs text-destructive">{erroEdit}</p>}
            <div className="flex gap-2 pt-1">
              <Button
                variant="outline"
                className="flex-1 border-border"
                onClick={() => setEditOpen(false)}
                disabled={isPending}
              >
                Cancelar
              </Button>
              <Button
                className="flex-1"
                onClick={handleSalvarEditar}
                disabled={!formEdit.nome.trim() || isPending}
              >
                {isPending ? "Salvando..." : "Salvar"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog — Novo Cadastro */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="bg-card border-border sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-foreground">Novo Cliente</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-1">
            <div className="space-y-2">
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Tipo de cliente</Label>
              <div className="grid grid-cols-2 gap-2">
                {(["AVULSO", "MENSALISTA"] as const).map((tipo) => (
                  <button
                    key={tipo}
                    type="button"
                    onClick={() => setFormManual((f) => ({ ...f, tipoCliente: tipo }))}
                    className={`py-2.5 px-3 rounded-xl border-2 text-sm font-semibold transition-all ${
                      formManual.tipoCliente === tipo
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border bg-secondary/40 text-muted-foreground hover:border-primary/40"
                    }`}
                  >
                    {tipo === "AVULSO" ? "Avulso" : "Mensalista"}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Nome *</Label>
              <Input
                placeholder="Nome completo"
                value={formManual.nome}
                onChange={(e) => setFormManual((f) => ({ ...f, nome: e.target.value }))}
                className="bg-secondary border-border text-foreground placeholder:text-muted-foreground h-11"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Telefone</Label>
              <Input
                placeholder="(15) 99999-0000"
                value={formManual.telefone}
                onChange={(e) => setFormManual((f) => ({ ...f, telefone: e.target.value }))}
                className="bg-secondary border-border text-foreground placeholder:text-muted-foreground h-11"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">E-mail</Label>
              <Input
                type="email"
                placeholder="email@exemplo.com"
                value={formManual.email}
                onChange={(e) => setFormManual((f) => ({ ...f, email: e.target.value }))}
                className="bg-secondary border-border text-foreground placeholder:text-muted-foreground h-11"
              />
            </div>
            {erro && <p className="text-xs text-destructive">{erro}</p>}
            <div className="flex gap-2 pt-1">
              <Button variant="outline" className="flex-1 border-border" onClick={() => setDialogOpen(false)} disabled={isPending}>
                Cancelar
              </Button>
              <Button className="flex-1" onClick={handleCriarManual} disabled={!formManual.nome.trim() || isPending}>
                {isPending ? "Salvando..." : "Cadastrar"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
