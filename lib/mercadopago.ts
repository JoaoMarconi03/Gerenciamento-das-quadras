import { MercadoPagoConfig } from "mercadopago"

export const mp = new MercadoPagoConfig({
  accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN!,
})
