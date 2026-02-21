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

  const { bookingId } = req.body;

  if (!bookingId) {
    res.status(400).json({ message: "Booking ID is required." });

    return;
  }

  try {
    const result = await withConnection(async (conn) => {
      return (await conn.query(
        "UPDATE bookings SET status = 'cancelled' WHERE id = ? AND user_id = ? AND status IN ('confirmed')",
        [bookingId, session.user.id],
      )) as UpdateResult;
    });

    if ((result.affectedRows ?? 0) === 0) {
      res.status(404).json({
        message:
          "Booking not found, already cancelled, or you do not have permission to cancel it.",
      });

      return;
    }

    res.status(200).json({ message: "Booking cancelled successfully." });
  } catch (error) {
    console.error("Cancel booking API error:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
}
