import type { NextApiRequest, NextApiResponse } from "next";

import { ensureHttpMethod, requireSession } from "@/lib/api-utils";
import { withConnection } from "@/lib/db";

type UpdateResult = { affectedRows?: number };

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (!ensureHttpMethod(req, res, ["POST"])) {
    return;
  }

  const session = await requireSession(req, res);

  if (!session?.user?.id) {
    return;
  }

  try {
    const result = await withConnection(async (conn) => {
      return (await conn.query(
        "UPDATE bookings SET is_hidden_from_user = TRUE WHERE user_id = ? AND status IN ('completed', 'cancelled')",
        [session.user.id],
      )) as UpdateResult;
    });

    res.status(200).json({
      message: "Booking history cleared successfully.",
      clearedCount: result.affectedRows ?? 0,
    });
  } catch (error) {
    console.error("Clear history API error:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
}
