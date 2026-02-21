import type { NextApiRequest, NextApiResponse } from "next";

import { format } from "date-fns";

import { ensureHttpMethod, requireSession } from "@/lib/api-utils";
import { withTransaction } from "@/lib/db";
import { getLineIdByInternalId, sendPushMessage } from "@/lib/lineMessagingApi";

type HttpError = Error & { status: number };

const httpError = (status: number, message: string): HttpError => {
  const error = new Error(message) as HttpError;

  error.status = status;

  return error;
};

type BookingRow = {
  user_id: number;
  booking_date: string;
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

  const { bookingId } = req.body as { bookingId?: number | string };
  const bookingIdNumber = Number(bookingId);

  if (!Number.isInteger(bookingIdNumber) || bookingIdNumber <= 0) {
    res.status(400).json({ message: "Booking ID is required." });

    return;
  }

  try {
    const booking = await withTransaction(async (conn) => {
      const rows = (await conn.query(
        `
          SELECT b.user_id, b.booking_date, t.table_number
          FROM bookings b
          JOIN tables t ON b.table_id = t.id
          WHERE b.id = ? AND b.status = 'awaiting_confirmation'
          FOR UPDATE
        `,
        [bookingIdNumber],
      )) as BookingRow[];

      if (rows.length === 0) {
        throw httpError(
          404,
          "Booking not found or already confirmed/cancelled.",
        );
      }

      await conn.query(
        "UPDATE bookings SET status = 'confirmed' WHERE id = ?",
        [bookingIdNumber],
      );

      return rows[0];
    });

    const lineId = await getLineIdByInternalId(booking.user_id);

    if (lineId) {
      const bookingDateLabel = format(new Date(booking.booking_date), "PPP");
      const message = [
        "Booking Confirmed",
        `Table ${booking.table_number} on ${bookingDateLabel} is ready for you.`,
        "Enjoy your time!",
      ].join("\n");

      await sendPushMessage(lineId, message);
    }

    res.status(200).json({ message: "Booking confirmed successfully." });
  } catch (error) {
    const status = (error as Partial<HttpError>).status ?? 500;
    const message =
      status === 500
        ? (error as Error).message || "Internal Server Error"
        : (error as Error).message;

    if (status === 500) {
      console.error("Confirm Booking API Error:", error);
    }
    res.status(status).json({ message });
  }
}
