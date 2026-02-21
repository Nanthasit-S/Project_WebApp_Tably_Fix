import type { NextApiRequest, NextApiResponse } from "next";

import { ensureHttpMethod, requireSession } from "@/lib/api-utils";
import { withTransaction } from "@/lib/db";

type UpdateResult = { affectedRows?: number };

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (!ensureHttpMethod(req, res, ["POST"])) {
    return;
  }

  if (!(await requireSession(req, res, { roles: ["admin"] }))) {
    return;
  }

  try {
    const results = await withTransaction(async (conn) => {
      const completedResult = (await conn.query(
        "UPDATE bookings SET status = 'completed' WHERE booking_date < CURRENT_DATE AND status = 'confirmed'",
      )) as UpdateResult;
      const deletedResult = (await conn.query(
        "DELETE FROM bookings WHERE booking_date < CURRENT_DATE AND status = 'awaiting_confirmation'",
      )) as UpdateResult;
      const attemptsResult = (await conn.query(
        "DELETE FROM booking_attempts WHERE created_at < NOW() - INTERVAL '1 hour'",
      )) as UpdateResult;

      return {
        completed: completedResult.affectedRows ?? 0,
        deleted: deletedResult.affectedRows ?? 0,
        clearedAttempts: attemptsResult.affectedRows ?? 0,
      };
    });

    res.status(200).json({ message: "Daily cleanup successful!", ...results });
  } catch (error) {
    console.error("Clear bookings API error:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
}
