import type { NextApiRequest, NextApiResponse } from "next";

import { ensureHttpMethod, requireSession } from "@/lib/api-utils";
import { withTransaction } from "@/lib/db";

type HttpError = Error & { status: number };

const httpError = (status: number, message: string): HttpError => {
  const error = new Error(message) as HttpError;

  error.status = status;

  return error;
};

type BookingRow = {
  id: number;
  status: string;
  check_in_token_expires_at: string;
  display_name: string;
  table_number: string;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (!ensureHttpMethod(req, res, ["POST"])) {
    return;
  }

  if (!(await requireSession(req, res, { roles: ["admin", "staff"] }))) {
    return;
  }

  const { scannedData } = req.body as { scannedData?: string };

  if (!scannedData) {
    res.status(400).json({ message: "No data scanned." });

    return;
  }

  let parsedData: { type?: string; token?: string };

  try {
    parsedData = JSON.parse(scannedData);
  } catch {
    res.status(400).json({ message: "Invalid QR Code format." });

    return;
  }

  if (parsedData.type !== "booking_check_in" || !parsedData.token) {
    res.status(400).json({ message: "Not a valid booking check-in QR Code." });

    return;
  }

  try {
    const booking = await withTransaction(async (conn) => {
      const rows = (await conn.query(
        `
          SELECT
            b.id,
            b.status,
            b.check_in_token_expires_at,
            u.display_name,
            t.table_number
          FROM bookings b
          JOIN users u ON b.user_id = u.id
          JOIN tables t ON b.table_id = t.id
          WHERE b.check_in_token = ?
          FOR UPDATE
        `,
        [parsedData.token],
      )) as BookingRow[];

      if (rows.length === 0) {
        throw httpError(
          404,
          "Invalid or expired QR Code. Please ask the guest to refresh.",
        );
      }

      const bookingRow = rows[0];

      if (new Date() > new Date(bookingRow.check_in_token_expires_at)) {
        throw httpError(
          400,
          "QR Code has expired. Please ask the guest to refresh.",
        );
      }

      if (bookingRow.status !== "confirmed") {
        throw httpError(
          409,
          `This booking is not confirmed. Current status: ${bookingRow.status}`,
        );
      }

      await conn.query(
        "UPDATE bookings SET check_in_token = NULL, check_in_token_expires_at = NULL, status = 'checked_in' WHERE id = ?",
        [bookingRow.id],
      );

      return bookingRow;
    });

    res.status(200).json({
      success: true,
      message: "Check-in successful!",
      details: {
        userName: booking.display_name,
        tableNumber: booking.table_number,
      },
    });
  } catch (error) {
    const status = (error as Partial<HttpError>).status ?? 500;
    const message =
      status === 500
        ? (error as Error).message || "An internal error occurred."
        : (error as Error).message;

    if (status === 500) {
      console.error("Scan Ticket API Error:", error);
    }
    res.status(status).json({ message });
  }
}
