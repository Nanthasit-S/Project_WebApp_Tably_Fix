import NextAuth, { NextAuthOptions } from "next-auth";
import LineProvider from "next-auth/providers/line";

import { querySingle, withConnection } from "@/lib/db";

export const authOptions: NextAuthOptions = {
  session: {
    strategy: "jwt",
  },
  pages: {
    error: "/auth/error",
  },
  providers: [
    LineProvider({
      clientId: process.env.LINE_LOGIN_CHANNEL_ID!,
      clientSecret: process.env.LINE_LOGIN_CHANNEL_SECRET!,
    }),
  ],
  callbacks: {
    async signIn({ user, account }) {
      const lineId =
        (typeof user?.id === "string" && user.id.trim()) ||
        (typeof account?.providerAccountId === "string" &&
          account.providerAccountId.trim()) ||
        "";

      if (!lineId) {
        console.error("Sign in error: Missing LINE user id.");
        return false;
      }

      const displayName =
        typeof user?.name === "string" && user.name.trim().length > 0
          ? user.name.trim()
          : `LINE User ${lineId.slice(-6)}`;
      const pictureUrl =
        typeof user?.image === "string" && user.image.trim().length > 0
          ? user.image
          : null;

      try {
        await withConnection(async (conn) => {
          await conn.query(
            `
              INSERT INTO users (line_id, display_name, picture_url, role)
              VALUES (?, ?, ?, 'user')
              ON CONFLICT (line_id)
              DO UPDATE SET
                display_name = EXCLUDED.display_name,
                picture_url = EXCLUDED.picture_url
            `,
            [lineId, displayName, pictureUrl],
          );
        });

        user.id = lineId;
        return true;
      } catch (error) {
        console.error("Sign in error:", error);
        return "/auth/error?error=Database";
      }
    },
    async jwt({ token, user }) {
      if (user) {
        try {
          const dbUser = await querySingle<{ id: number; role: string }>(
            "SELECT id, role FROM users WHERE line_id = ?",
            [user.id],
          );

          if (dbUser) {
            token.id = dbUser.id;
            token.role = dbUser.role;
          }
        } catch (error) {
          console.error("JWT callback error:", error);
        }
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as number;
        session.user.role = token.role as "admin" | "staff" | "user";
      }

      return session;
    },
  },
};

export default NextAuth(authOptions);
