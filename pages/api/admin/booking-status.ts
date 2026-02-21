import type { NextApiRequest, NextApiResponse } from "next";

import { ensureHttpMethod, requireSession } from "@/lib/api-utils";
import { queryRows, withTransaction } from "@/lib/db";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (!ensureHttpMethod(req, res, ["GET", "POST"])) {
    return;
  }

  if (!(await requireSession(req, res, { roles: ["admin"] }))) {
    return;
  }

  if (req.method === "GET") {
    try {
      const rows = await queryRows<{
        setting_key: string;
        setting_value: string;
      }>(
        "SELECT setting_key, setting_value FROM settings WHERE setting_key IN ('booking_enabled', 'booking_fee', 'max_bookings_per_user')",
      );

      const settingsMap = new Map(
        rows.map((row) => [row.setting_key, row.setting_value]),
      );
      const isBookingEnabled = settingsMap.get("booking_enabled") === "true";
      const bookingFee = parseFloat(settingsMap.get("booking_fee") || "0");
      const maxBookingsPerUser = parseInt(
        settingsMap.get("max_bookings_per_user") || "0",
        10,
      );

      res
        .status(200)
        .json({ isBookingEnabled, bookingFee, maxBookingsPerUser });
    } catch (error) {
      console.error("Admin booking status API error:", error);
      res.status(500).json({ message: "Internal Server Error" });
    }

    return;
  }

  if (req.method === "POST") {
    const { isBookingEnabled, bookingFee, maxBookingsPerUser } = req.body;

    if (
      isBookingEnabled !== undefined &&
      typeof isBookingEnabled !== "boolean"
    ) {
      res.status(400).json({ message: "Invalid value for isBookingEnabled." });

      return;
    }
    if (
      bookingFee !== undefined &&
      (typeof bookingFee !== "number" || bookingFee < 0)
    ) {
      res
        .status(400)
        .json({ message: "Booking fee must be a non-negative number." });

      return;
    }
    if (
      maxBookingsPerUser !== undefined &&
      (!Number.isInteger(maxBookingsPerUser) || maxBookingsPerUser < 0)
    ) {
      res
        .status(400)
        .json({ message: "Max bookings must be a non-negative integer." });

      return;
    }

    try {
      await withTransaction(async (conn) => {
        const sql =
          "INSERT INTO settings (setting_key, setting_value) VALUES (?, ?) ON CONFLICT (setting_key) DO UPDATE SET setting_value = EXCLUDED.setting_value";

        const updates: Array<[string, string]> = [];

        if (isBookingEnabled !== undefined) {
          updates.push(["booking_enabled", isBookingEnabled.toString()]);
        }
        if (bookingFee !== undefined) {
          updates.push(["booking_fee", bookingFee.toString()]);
        }
        if (maxBookingsPerUser !== undefined) {
          updates.push([
            "max_bookings_per_user",
            maxBookingsPerUser.toString(),
          ]);
        }

        for (const [key, value] of updates) {
          await conn.query(sql, [key, value]);
        }
      });

      res.status(200).json({ message: "Settings updated successfully." });
    } catch (error) {
      console.error("Admin booking status API error:", error);
      res.status(500).json({ message: "Internal Server Error" });
    }
  }
}
