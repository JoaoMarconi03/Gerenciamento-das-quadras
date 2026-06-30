"use client"

import { useState } from "react"
import { Search, Plus, Phone, Mail, BookOpen } from "lucide-react"
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

export default function ClientesPage() {
  const [clientes] = useState<{ id: string; nome: string; telefone: string; email: string; tipo: string; fiado: number }[]>([])
  const [busca, setBusca] = useState("")
  const [dialogOpen, setDialogOpen] = useState(false)
  const [form, setForm] = useState({ nome: "", telefone: "", email: "" })

  const filtrados = clientes.filter((c) =>
    c.nome.toLowerCase().includes(busca.toLowerCase()) ||
    c.telefone.includes(busca)
  )

  return (
    <div className="p-4 lg:p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">Clientes</h1>
          <p className="text-sm text-muted-foreground">{clientes.length} clientes cadastrados</p>
        </div>
        <Button onClick={() => setDialogOpen(true)} className="gap-2">
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">Novo Cliente</span>
        </Button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por nome ou telefone..."
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          className="pl-9 bg-card border-border text-foreground placeholder:text-muted-foreground"
        />
      </div>

      {/* List */}
      <div className="space-y-2">
        {filtrados.map((c) => (
          <Card key={c.id} className="bg-card border-border hover:border-primary/30 transition-colors cursor-pointer">
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <span className="text-primary font-bold text-sm">{c.nome.charAt(0)}</span>
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-foreground text-sm truncate">{c.nome}</p>
                    <div className="flex items-center gap-3 mt-0.5">
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
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {c.fiado > 0 && (
                    <span className="flex items-center gap-1 text-xs text-yellow-600 font-medium">
                      <BookOpen className="w-3.5 h-3.5" />
                      R$ {c.fiado}
                    </span>
                  )}
                  <Badge
                    variant="outline"
                    className={
                      c.tipo === "Mensalista"
                        ? "border-primary/30 text-primary text-xs"
                        : "border-border text-muted-foreground text-xs"
                    }
                  >
                    {c.tipo}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
        {filtrados.length === 0 && (
          <p className="text-center text-muted-foreground text-sm py-10">Nenhum cliente encontrado.</p>
        )}
      </div>

      {/* Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="bg-card border-border sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-foreground">Novo Cliente</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-1">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Nome *</Label>
              <Input
                placeholder="Nome completo"
                value={form.nome}
                onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))}
                className="bg-secondary border-border text-foreground placeholder:text-muted-foreground"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Telefone</Label>
              <Input
                placeholder="(62) 99999-0000"
                value={form.telefone}
                onChange={(e) => setForm((f) => ({ ...f, telefone: e.target.value }))}
                className="bg-secondary border-border text-foreground placeholder:text-muted-foreground"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">E-mail</Label>
              <Input
                type="email"
                placeholder="email@exemplo.com"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                className="bg-secondary border-border text-foreground placeholder:text-muted-foreground"
              />
            </div>
            <div className="flex gap-2 pt-1">
              <Button variant="outline" className="flex-1 border-border" onClick={() => setDialogOpen(false)}>Cancelar</Button>
              <Button className="flex-1" onClick={() => setDialogOpen(false)}>Salvar</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
