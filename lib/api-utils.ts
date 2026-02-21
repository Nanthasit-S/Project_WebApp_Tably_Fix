import type { NextApiRequest, NextApiResponse } from "next";
import type { Session } from "next-auth";

import { getServerSession } from "next-auth/next";

import { authOptions } from "@/pages/api/auth/[...nextauth]";

type HttpMethod = "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
type Role = "admin" | "staff" | "user";

export function ensureHttpMethod(
  req: NextApiRequest,
  res: NextApiResponse,
  allowed: HttpMethod[],
): boolean {
  if (!allowed.includes(req.method as HttpMethod)) {
    res.setHeader("Allow", allowed);
    res.status(405).json({ message: `Method ${req.method} not allowed` });

    return false;
  }

  return true;
}

export async function requireSession(
  req: NextApiRequest,
  res: NextApiResponse,
  options?: { roles?: Role[] },
): Promise<Session | null> {
  const session = await getServerSession(req, res, authOptions);

  if (!session || !session.user) {
    res.status(401).json({ message: "Unauthorized" });

    return null;
  }

  if (options?.roles && !options.roles.includes(session.user.role as Role)) {
    res.status(403).json({ message: "Forbidden" });

    return null;
  }

  return session;
}
