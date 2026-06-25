export async function enviarMensagemWhatsApp(telefone: string, mensagem: string) {
  const instanceId   = process.env.ZAPI_INSTANCE_ID
  const token        = process.env.ZAPI_TOKEN
  const clientToken  = process.env.ZAPI_CLIENT_TOKEN

  if (!instanceId || !token || !clientToken) return

  const url = `https://api.z-api.io/instances/${instanceId}/token/${token}/send-text`

  await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Client-Token": clientToken,
    },
    body: JSON.stringify({ phone: telefone, message: mensagem }),
  })
}
