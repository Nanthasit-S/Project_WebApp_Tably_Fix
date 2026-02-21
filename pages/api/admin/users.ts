import type { NextApiRequest, NextApiResponse } from "next";

import { ensureHttpMethod, requireSession } from "@/lib/api-utils";
import { queryRows, withConnection } from "@/lib/db";

type UserRow = {
  id: number;
  display_name: string;
  role: "admin" | "staff" | "user";
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (!(await requireSession(req, res, { roles: ["admin"] }))) {
    return;
  }

  if (req.method === "GET") {
    try {
      const users = await queryRows<UserRow>(
        "SELECT id, display_name, role FROM users ORDER BY id ASC",
      );

      res.status(200).json(users);
    } catch (error) {
      console.error("User Management API Error:", error);
      res.status(500).json({ message: "Internal Server Error" });
    }

    return;
  }

  if (!ensureHttpMethod(req, res, ["GET", "PUT"])) {
    return;
  }

  const { userId, role } = req.body as {
    userId?: number | string;
    role?: string;
  };
  const newRole = role as UserRow["role"] | undefined;
  const userIdNumber = Number(userId);

  if (
    !Number.isInteger(userIdNumber) ||
    userIdNumber <= 0 ||
    !newRole ||
    !["admin", "staff", "user"].includes(newRole)
  ) {
    res.status(400).json({ message: "User ID and a valid role are required." });

    return;
  }

  try {
    await withConnection(async (conn) => {
      await conn.query("UPDATE users SET role = ? WHERE id = ?", [
        newRole,
        userIdNumber,
      ]);
    });
    res.status(200).json({ message: "User role updated successfully." });
  } catch (error) {
    console.error("User Management API Error:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
}
