import NextAuth, { NextAuthOptions } from "next-auth";
import LineProvider from "next-auth/providers/line";

import { querySingle, withConnection } from "@/lib/db";

export const authOptions: NextAuthOptions = {
  session: {
    strategy: "jwt",
  },
  providers: [
    LineProvider({
      clientId: process.env.LINE_LOGIN_CHANNEL_ID!,
      clientSecret: process.env.LINE_LOGIN_CHANNEL_SECRET!,
    }),
  ],
  callbacks: {
    async signIn({ user }) {
      try {
        await withConnection(async (conn) => {
          const existingUser = (await conn.query(
            "SELECT id FROM users WHERE line_id = ?",
            [user.id],
          )) as Array<{ id: number }>;

          const displayName = user.name;
          const pictureUrl = user.image;

          if (existingUser.length === 0) {
            await conn.query(
              "INSERT INTO users (line_id, display_name, picture_url, role) VALUES (?, ?, ?, ?)",
              [user.id, displayName, pictureUrl, "user"],
            );
          } else {
            await conn.query(
              "UPDATE users SET display_name = ?, picture_url = ? WHERE line_id = ?",
              [displayName, pictureUrl, user.id],
            );
          }
        });

        return true;
      } catch (error) {
        console.error("Sign in error:", error);

        return false;
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
