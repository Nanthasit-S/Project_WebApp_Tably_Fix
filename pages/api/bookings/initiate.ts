import type { NextApiRequest, NextApiResponse } from "next";

import crypto from "crypto";

import QRCode from "qrcode";
import promptpay from "promptpay-qr";

import { ensureHttpMethod, requireSession } from "@/lib/api-utils";
import { withTransaction } from "@/lib/db";

type HttpError = Error & { status: number };

const httpError = (status: number, message: string): HttpError => {
  const error = new Error(message) as HttpError;

  error.status = status;

  return error;
};

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

  const { tableIds, bookingDate, totalFee } = req.body as {
    tableIds?: unknown;
    bookingDate?: string;
    totalFee?: number | string;
  };

  if (
    !Array.isArray(tableIds) ||
    tableIds.length === 0 ||
    !bookingDate ||
    totalFee === undefined
  ) {
    res.status(400).json({ message: "Missing required data." });

    return;
  }

  const uniqueTableIds = Array.from(
    new Set(tableIds.map((id) => Number(id))),
  ).filter((id) => Number.isInteger(id) && id > 0);

  if (uniqueTableIds.length === 0) {
    res.status(400).json({ message: "Invalid table IDs provided." });

    return;
  }

  const fee = typeof totalFee === "string" ? Number(totalFee) : totalFee;

  if (!Number.isFinite(fee) || fee <= 0) {
    res.status(400).json({ message: "Invalid total fee." });

    return;
  }

  const promptpayAccount = process.env.PROMPTPAY_ACCOUNT;

  if (!promptpayAccount) {
    res.status(500).json({ message: "PromptPay account is not configured." });

    return;
  }

  const userId = session.user.id;
  const orderId = crypto.randomUUID();

  try {
    await withTransaction(async (conn) => {
      const tableRows = (await conn.query(
        `SELECT id FROM tables WHERE id IN (${uniqueTableIds.map(() => "?").join(", ")})`,
        uniqueTableIds,
      )) as Array<{ id: number }>;

      if (tableRows.length !== uniqueTableIds.length) {
        throw httpError(400, "One or more selected tables could not be found.");
      }

      for (const tableId of uniqueTableIds) {
        await conn.query(
          "INSERT INTO bookings (user_id, table_id, booking_date, status, order_id) VALUES (?, ?, ?, 'pending_payment', ?)",
          [userId, tableId, bookingDate, orderId],
        );
      }
    });

    const payload = promptpay(promptpayAccount, { amount: fee });
    const qrCodeUrl = await QRCode.toDataURL(payload);

    res.status(201).json({ orderId, qrCodeUrl, totalFee: fee });
  } catch (error) {
    const status = (error as Partial<HttpError>).status ?? 500;
    const message =
      status === 500
        ? "Failed to initiate booking."
        : ((error as Error).message ?? "Failed to initiate booking.");

    console.error("Booking initiation error:", error);
    res.status(status).json({ message });
  }
}
