import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"
import { compare } from "bcryptjs"
import { authConfig } from "./auth.config"

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  session: { strategy: "jwt" },
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Senha", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null

        const { db } = await import("@/lib/db")

        const usuario = await db.usuario.findUnique({
          where: { email: credentials.email as string },
          include: { tenant: true },
        })

        if (!usuario) return null

        const senhaCorreta = await compare(
          credentials.password as string,
          usuario.senha
        )

        if (!senhaCorreta) return null

        return {
          id: usuario.id,
          email: usuario.email,
          name: usuario.nome,
          role: usuario.role,
          tenantId: usuario.tenantId,
          tenantNome: usuario.tenant.nome,
        }
      },
    }),
  ],
  callbacks: {
    ...authConfig.callbacks,
    async jwt({ token, user }) {
      if (user) {
        token.role = (user as any).role
        token.tenantId = (user as any).tenantId
        token.tenantNome = (user as any).tenantNome
      }
      return token
    },
  },
})
