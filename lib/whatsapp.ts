async function zapiPost(path: string, body: object) {
  const instanceId  = process.env.ZAPI_INSTANCE_ID
  const token       = process.env.ZAPI_TOKEN
  const clientToken = process.env.ZAPI_CLIENT_TOKEN
  if (!instanceId || !token || !clientToken) return
  try {
    await fetch(`https://api.z-api.io/instances/${instanceId}/token/${token}/${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Client-Token": clientToken },
      body: JSON.stringify(body),
    })
  } catch (e) {
    console.error("[WhatsApp]", e)
  }
}

export async function enviarMensagemWhatsApp(telefone: string, mensagem: string) {
  await zapiPost("send-text", { phone: telefone, message: mensagem })
}

export async function enviarAlertaEstoqueBaixo(produto: { nome: string; estoque: number; estoqueMinimo: number }) {
  const adminWpp = process.env.ADMIN_WHATSAPP
  if (!adminWpp) return
  const msg =
    `⚠️ *Estoque baixo!*\n` +
    `Produto: *${produto.nome}*\n` +
    `Restante: ${produto.estoque} unidade${produto.estoque !== 1 ? "s" : ""}\n` +
    `Mínimo: ${produto.estoqueMinimo}`
  await zapiPost("send-text", { phone: adminWpp, message: msg })
}
