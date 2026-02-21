import type { NextApiRequest, NextApiResponse } from "next";
import { ensureHttpMethod } from "@/lib/api-utils";
import { queryRows } from "@/lib/db";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (!ensureHttpMethod(req, res, ["GET"])) {
    return;
  }

  try {
    const rows = await queryRows<{ setting_key: string; setting_value: string }>(
      "SELECT setting_key, setting_value FROM settings WHERE setting_key IN ('transfer_fee', 'layoutImageUrl')", 
    );
    const settingsMap = new Map(
      rows.map((row) => [row.setting_key, row.setting_value]),
    );
    const transferFee = Number(settingsMap.get("transfer_fee") || 0);
    const layoutImageUrl = settingsMap.get("layoutImageUrl") || "";

    res.status(200).json({ transferFee, layoutImageUrl });
  } catch (error) {
    console.error("Fetch public settings API error:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
}