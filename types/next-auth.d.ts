import { DefaultSession } from "next-auth"

declare module "next-auth" {
  interface Session {
    user: {
      id: string
      role: string
      tenantId: string
      tenantNome: string
    } & DefaultSession["user"]
  }

  interface User {
    role: string
    tenantId: string
    tenantNome: string
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role: string
    tenantId: string
    tenantNome: string
  }
}
