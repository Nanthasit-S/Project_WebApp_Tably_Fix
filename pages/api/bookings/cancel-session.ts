import type { NextApiRequest, NextApiResponse } from "next";

import { ensureHttpMethod, requireSession } from "@/lib/api-utils";
import { withConnection } from "@/lib/db";

type DeleteResult = { affectedRows?: number };

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

  const { bookingSessionId } = req.body;

  if (!bookingSessionId) {
    res.status(400).json({ message: "Booking Session ID is required." });

    return;
  }

  try {
    const result = await withConnection(async (conn) => {
      return (await conn.query(
        "DELETE FROM booking_attempts WHERE session_id = ? AND user_id = ? AND status = 'pending'",
        [bookingSessionId, session.user.id],
      )) as DeleteResult;
    });

    if ((result.affectedRows ?? 0) > 0) {
      res
        .status(200)
        .json({ message: "Booking session cancelled successfully." });

      return;
    }

    res
      .status(404)
      .json({ message: "No active booking session found to cancel." });
  } catch (error) {
    console.error("Cancel Session API Error:", error);
    res.status(500).json({ message: "Failed to cancel booking session." });
  }
}
