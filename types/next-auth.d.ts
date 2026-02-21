import { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: number;
      role: "admin" | "staff" | "user";
    } & DefaultSession["user"];
  }
}
