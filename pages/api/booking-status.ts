import type { NextApiRequest, NextApiResponse } from "next";

import { ensureHttpMethod } from "@/lib/api-utils";
import { querySingle } from "@/lib/db";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (!ensureHttpMethod(req, res, ["GET"])) {
    return;
  }

  try {
    const settings = await querySingle<{
      booking_enabled: string | null;
      booking_fee: string | null;
      max_bookings_per_user: string | null;
    }>(
      `
        SELECT
          MAX(CASE WHEN setting_key = 'booking_enabled' THEN setting_value END) AS booking_enabled,
          MAX(CASE WHEN setting_key = 'booking_fee' THEN setting_value END) AS booking_fee,
          MAX(CASE WHEN setting_key = 'max_bookings_per_user' THEN setting_value END) AS max_bookings_per_user
        FROM settings
        WHERE setting_key IN ('booking_enabled', 'booking_fee', 'max_bookings_per_user')
      `,
    );

    const isBookingEnabled =
      settings?.booking_enabled !== "false" &&
      settings?.booking_enabled !== "0";
    const bookingFee = Number(settings?.booking_fee ?? 0);
    const maxBookings = Number.parseInt(
      settings?.max_bookings_per_user ?? "0",
      10,
    );

    res.status(200).json({
      isBookingEnabled,
      bookingFee: Number.isFinite(bookingFee) ? bookingFee : 0,
      maxBookings: Number.isFinite(maxBookings) ? maxBookings : 0,
    });
  } catch (error) {
    console.error("Booking status check error:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
}
