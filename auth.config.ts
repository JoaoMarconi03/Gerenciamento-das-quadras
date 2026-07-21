import type { NextAuthConfig } from "next-auth"

export const authConfig: NextAuthConfig = {
  pages: {
    signIn: "/login",
  },
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user
      const role = (auth?.user as any)?.role
      const path = nextUrl.pathname

      const isOnDashboard = path.startsWith("/dashboard")
      const isOnMinhaConta = path.startsWith("/minha-conta")
      const isOnLogin = path === "/login"
      const isOnRegistro = path === "/registro"

      // Rotas do admin — somente ADMIN/STAFF
      if (isOnDashboard) {
        if (!isLoggedIn) return false
        if (role === "CLIENTE") return Response.redirect(new URL("/minha-conta", nextUrl))
        return true
      }

      // Área do cliente — somente CLIENTE logado
      if (isOnMinhaConta) {
        if (!isLoggedIn) return Response.redirect(new URL("/login", nextUrl))
        if (role !== "CLIENTE") return Response.redirect(new URL("/dashboard", nextUrl))
        return true
      }

      // Login e registro — não mostrar se já logado
      if ((isOnLogin || isOnRegistro) && isLoggedIn) {
        if (role === "CLIENTE") return Response.redirect(new URL("/minha-conta", nextUrl))
        return Response.redirect(new URL("/dashboard", nextUrl))
      }

      return true
    },
    async session({ session, token }: any) {
      if (token) {
        session.user.id = token.sub
        session.user.role = token.role
        session.user.tenantId = token.tenantId
        session.user.tenantNome = token.tenantNome
      }
      return session
    },
  },
  providers: [],
}
