import type { NextApiRequest, NextApiResponse } from "next";

import { ensureHttpMethod, requireSession } from "@/lib/api-utils";
import { queryRows } from "@/lib/db";

type BookingRow = {
  id: number;
  booking_date: string;
  status: string;
  created_at: string;
  display_name: string;
  user_image: string | null;
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

  if (!(await requireSession(req, res, { roles: ["admin"] }))) {
    return;
  }

  try {
    const allBookings = await queryRows<BookingRow>(
      `
        SELECT
          b.id,
          b.booking_date,
          b.status,
          b.created_at,
          u.display_name,
          u.picture_url AS user_image,
          t.table_number,
          z.name AS zone_name
        FROM bookings b
        JOIN users u ON b.user_id = u.id
        JOIN tables t ON b.table_id = t.id
        JOIN zones z ON t.zone_id = z.id
        ORDER BY b.created_at DESC
      `,
    );

    res.status(200).json(allBookings);
  } catch (error) {
    console.error("Fetch all bookings API error:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
}
