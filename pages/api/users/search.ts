import type { NextApiRequest, NextApiResponse } from "next";

import { ensureHttpMethod, requireSession } from "@/lib/api-utils";
import { queryRows } from "@/lib/db";

type UserRow = { id: number; display_name: string; picture_url: string | null };

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (!ensureHttpMethod(req, res, ["GET"])) {
    return;
  }

  const session = await requireSession(req, res);

  if (!session?.user?.id) {
    return;
  }

  const { query } = req.query;

  if (typeof query !== "string" || query.length < 2) {
    res.status(200).json([]);

    return;
  }

  try {
    const searchQuery = `%${query}%`;
    const users = await queryRows<UserRow>(
      "SELECT id, display_name, picture_url FROM users WHERE display_name LIKE ? AND id != ? LIMIT 10",
      [searchQuery, session.user.id],
    );

    res.status(200).json(users);
  } catch (error) {
    console.error("User search API error:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
}
