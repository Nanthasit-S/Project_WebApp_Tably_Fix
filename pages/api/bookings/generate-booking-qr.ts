import type { NextApiRequest, NextApiResponse } from "next";

import crypto from "crypto";

import QRCode from "qrcode";

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
    const qrPayload = await withConnection(async (conn) => {
      const token = crypto.randomBytes(32).toString("hex");
      const expiryDate = new Date();

      expiryDate.setSeconds(expiryDate.getSeconds() + 60);

      const result = (await conn.query(
        "UPDATE bookings SET check_in_token = ?, check_in_token_expires_at = ? WHERE id = ? AND user_id = ? AND status = 'confirmed'",
        [token, expiryDate, bookingId, session.user.id],
      )) as UpdateResult;

      if ((result.affectedRows ?? 0) === 0) {
        throw new Error("Confirmed booking not found for this user.");
      }

      return { token };
    });

    const qrData = JSON.stringify({
      type: "booking_check_in",
      token: qrPayload.token,
    });
    const qrCodeUrl = await QRCode.toDataURL(qrData);

    res.status(200).json({ qrCodeUrl });
  } catch (error) {
    if (
      (error as Error).message === "Confirmed booking not found for this user."
    ) {
      res.status(404).json({ message: (error as Error).message });

      return;
    }
    console.error("QR Code Generation Error:", error);
    res.status(500).json({ message: "Failed to generate QR code." });
  }
}
