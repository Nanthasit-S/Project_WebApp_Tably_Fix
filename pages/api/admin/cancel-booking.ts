import type { NextApiRequest, NextApiResponse } from "next";

import { ensureHttpMethod, requireSession } from "@/lib/api-utils";
import { withConnection } from "@/lib/db";
import { getLineIdByInternalId, sendPushMessage } from "@/lib/lineMessagingApi";

type DeleteResult = { affectedRows?: number };

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

  const { bookingId, userId, tableName } = req.body as {
    bookingId?: number | string;
    userId?: number | string;
    tableName?: string;
  };

  const bookingIdNumber = Number(bookingId);
  const userIdNumber = Number(userId);

  if (
    !Number.isInteger(bookingIdNumber) ||
    bookingIdNumber <= 0 ||
    !Number.isInteger(userIdNumber) ||
    userIdNumber <= 0 ||
    !tableName
  ) {
    res.status(400).json({ message: "Missing required booking information." });

    return;
  }

  try {
    const result = await withConnection(async (conn) => {
      return (await conn.query("DELETE FROM bookings WHERE id = ?", [
        bookingIdNumber,
      ])) as DeleteResult;
    });

    if ((result.affectedRows ?? 0) === 0) {
      res
        .status(404)
        .json({ message: "Booking not found or already cancelled." });

      return;
    }

    const lineId = await getLineIdByInternalId(userIdNumber);

    if (lineId) {
      const message = [
        "Booking Cancelled",
        `Table ${tableName} has been cancelled by an administrator.`,
        "Please contact support for more details.",
      ].join("\n");

      await sendPushMessage(lineId, message);
    }

    res.status(200).json({ message: "Booking cancelled successfully." });
  } catch (error) {
    console.error("Cancel booking API error:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
}
