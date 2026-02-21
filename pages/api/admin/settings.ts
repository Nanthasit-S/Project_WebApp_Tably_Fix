import type { NextApiRequest, NextApiResponse } from "next";

import { ensureHttpMethod, requireSession } from "@/lib/api-utils";
import { queryRows, withTransaction } from "@/lib/db";

type SettingRow = { setting_key: string; setting_value: string };

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (!(await requireSession(req, res, { roles: ["admin"] }))) {
    return;
  }

  if (req.method === "GET") {
    try {
      const rows = await queryRows<SettingRow>(
        "SELECT setting_key, setting_value FROM settings WHERE setting_key IN ('booking_enabled', 'max_bookings_per_user', 'transfer_fee', 'promptpayAccount', 'layoutImageUrl')", // <-- เพิ่ม 'layoutImageUrl'
      );

      const settingsMap = new Map(
        rows.map((row) => [row.setting_key, row.setting_value]),
      );
      res.status(200).json({
        isBookingEnabled: settingsMap.get("booking_enabled") === "true",
        maxBookingsPerUser: Number(
          settingsMap.get("max_bookings_per_user") || 0,
        ),
        transferFee: Number(settingsMap.get("transfer_fee") || 0),
        promptpayAccount: settingsMap.get("promptpayAccount") || "",
        layoutImageUrl: settingsMap.get("layoutImageUrl") || "",
      });
    } catch (error) {
      console.error("Settings API error:", error);
      res.status(500).json({ message: "Internal Server Error" });
    }

    return;
  }

  if (!ensureHttpMethod(req, res, ["GET", "POST"])) {
    return;
  }

  const {
    isBookingEnabled,
    maxBookingsPerUser,
    transferFee,
    promptpayAccount,
    layoutImageUrl,
  } = req.body as {
    isBookingEnabled?: boolean;
    maxBookingsPerUser?: number;
    transferFee?: number;
    promptpayAccount?: string;
    layoutImageUrl?: string;
  };
  if (
    typeof isBookingEnabled !== "boolean" ||
    typeof maxBookingsPerUser !== "number" ||
    maxBookingsPerUser < 0 ||
    typeof transferFee !== "number" ||
    transferFee < 0 ||
    typeof layoutImageUrl !== "string"
  ) {
    res.status(400).json({ message: "Invalid settings payload." });

    return;
  }
  try {
    await withTransaction(async (conn) => {
      const upsert = (key: string, value: string) =>
        conn.query(
          "INSERT INTO settings (setting_key, setting_value) VALUES (?, ?) ON CONFLICT (setting_key) DO UPDATE SET setting_value = EXCLUDED.setting_value",
          [key, value],
        );

      await upsert("booking_enabled", String(isBookingEnabled));
      await upsert("max_bookings_per_user", String(maxBookingsPerUser));
      await upsert("transfer_fee", String(transferFee));
      await upsert("promptpayAccount", String(promptpayAccount ?? ""));
      await upsert("layoutImageUrl", String(layoutImageUrl ?? ""));
    });

    res.status(200).json({ message: "Settings updated successfully" });
  } catch (error) {
    console.error("Settings API error:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
}
