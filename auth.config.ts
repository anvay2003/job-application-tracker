import type { NextAuthConfig } from "next-auth";

export const authConfig = {
  pages: {
    signIn: "/login",
  },
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const isOnLoginPage = nextUrl.pathname === "/login";

      if (isOnLoginPage) {
        return true; // always allow access to the login page itself
      }

      return isLoggedIn; // everything else requires login
    },
  },
  providers: [], // populated in auth.ts — kept empty here to stay Edge-safe
} satisfies NextAuthConfig;