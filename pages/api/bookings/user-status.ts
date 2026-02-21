import type { NextApiRequest, NextApiResponse } from "next";

import { ensureHttpMethod, requireSession } from "@/lib/api-utils";
import { querySingle } from "@/lib/db";

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

  const { date } = req.query;

  if (typeof date !== "string") {
    res.status(400).json({ message: "Date is required." });

    return;
  }

  try {
    const [maxBookingsRow, currentBookingsRow] = await Promise.all([
      querySingle<{ setting_value: string }>(
        "SELECT setting_value FROM settings WHERE setting_key = 'max_bookings_per_user'",
      ),
      querySingle<{ count: number }>(
        "SELECT COUNT(*) AS count FROM bookings WHERE user_id = ? AND status IN ('confirmed') AND booking_date = ?",
        [session.user.id, date],
      ),
    ]);

    const maxBookings = maxBookingsRow
      ? parseInt(maxBookingsRow.setting_value, 10)
      : 0;
    const currentBookings = currentBookingsRow
      ? Number(currentBookingsRow.count)
      : 0;

    res.status(200).json({
      currentBookings,
      maxBookings: Number.isNaN(maxBookings) ? 0 : maxBookings,
    });
  } catch (error) {
    console.error("User booking status API error:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
}
