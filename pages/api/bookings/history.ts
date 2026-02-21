import type { NextApiRequest, NextApiResponse } from "next";

import { ensureHttpMethod, requireSession } from "@/lib/api-utils";
import { queryRows } from "@/lib/db";

type BookingHistoryRow = {
  id: number;
  booking_date: string;
  status: string;
  slip_image_url: string | null;
  table_number: string;
  zone_name: string;
};

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

  try {
    const bookingHistory = await queryRows<BookingHistoryRow>(
      `
        SELECT
          b.id,
          b.booking_date,
          b.status,
          b.slip_image_url,
          t.table_number,
          z.name AS zone_name
        FROM bookings b
        JOIN tables t ON b.table_id = t.id
        JOIN zones z ON t.zone_id = z.id
        WHERE
          b.user_id = ?
          AND (b.is_hidden_from_user IS NULL OR b.is_hidden_from_user = FALSE)
          AND b.status != 'pending_payment'
        ORDER BY b.booking_date DESC, b.id DESC
      `,
      [session.user.id],
    );

    res.status(200).json(bookingHistory);
  } catch (error) {
    console.error("Booking History API Error:", error);
    res.status(500).json({ message: "Failed to fetch booking history." });
  }
}
