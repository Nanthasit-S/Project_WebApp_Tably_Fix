import type { NextApiRequest, NextApiResponse } from "next";

import { format } from "date-fns";

import { ensureHttpMethod, requireSession } from "@/lib/api-utils";
import { querySingle, withTransaction } from "@/lib/db";
import {
  SlipVerificationError,
  lockSlipRef,
  markSlipRefAsUsed,
  normalizeSlipRef,
  verifySlipWithOpenSlip,
} from "@/lib/payments/slip";
import { getLineIdByInternalId, sendPushMessage } from "@/lib/lineMessagingApi";

type HttpError = Error & { status: number };

const httpError = (status: number, message: string): HttpError => {
  const error = new Error(message) as HttpError;

  error.status = status;

  return error;
};

type TransferResult = {
  tableNumber: string;
  bookingDate: string;
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

  const { bookingId, recipientId, refNbr, amount } = req.body as {
    bookingId?: number | string;
    recipientId?: number | string;
    refNbr?: string;
    amount?: number;
  };

  const bookingIdNumber = Number(bookingId);
  const recipientIdNumber = Number(recipientId);

  if (
    !Number.isInteger(bookingIdNumber) ||
    bookingIdNumber <= 0 ||
    !Number.isInteger(recipientIdNumber) ||
    recipientIdNumber <= 0
  ) {
    res
      .status(400)
      .json({ message: "Booking ID and Recipient ID are required." });

    return;
  }

  let normalizedRef: string | null = null;
  let amountNumber = 0;

  try {
    const transferFeeRow = await querySingle<{ setting_value: string }>(
      "SELECT setting_value FROM settings WHERE setting_key = 'transfer_fee'",
    );
    const transferFee = transferFeeRow
      ? parseFloat(transferFeeRow.setting_value)
      : 0;

    if (Number.isNaN(transferFee)) {
      throw httpError(500, "Transfer fee configuration is invalid.");
    }

    if (transferFee > 0) {
      if (
        typeof refNbr !== "string" ||
        !refNbr.trim() ||
        (typeof amount !== "number" && typeof amount !== "string")
      ) {
        res.status(400).json({
          message: "Payment information is required for this transfer.",
        });

        return;
      }

      amountNumber = Number(amount);

      if (!Number.isFinite(amountNumber) || amountNumber <= 0) {
        res.status(400).json({
          message: "Payment amount is invalid.",
        });

        return;
      }

      if (Math.abs(amountNumber - transferFee) > 0.01) {
        res.status(400).json({
          message: "Payment amount does not match the transfer fee.",
        });

        return;
      }

      normalizedRef = normalizeSlipRef(refNbr);

      if (!normalizedRef) {
        res.status(400).json({
          message: "Payment reference number is invalid.",
        });

        return;
      }

      try {
        await verifySlipWithOpenSlip(normalizedRef, amountNumber);
      } catch (error) {
        if (error instanceof SlipVerificationError) {
          throw httpError(400, error.message);
        }

        throw error;
      }
    }

    const transferResult = await withTransaction(async (conn) => {
      if (transferFee > 0 && normalizedRef) {
        const slipAlreadyUsed = await lockSlipRef(conn, normalizedRef);

        if (slipAlreadyUsed) {
          throw httpError(409, "This payment slip has already been used.");
        }
      }

      const bookingRows = (await conn.query(
        `
          SELECT
            b.table_id,
            b.booking_date,
            t.table_number
          FROM bookings b
          JOIN tables t ON b.table_id = t.id
          WHERE b.id = ? AND b.user_id = ?
          FOR UPDATE
        `,
        [bookingIdNumber, session.user.id],
      )) as Array<{
        table_id: number;
        booking_date: string;
        table_number: string;
      }>;

      if (bookingRows.length === 0) {
        throw httpError(404, "Booking not found or you are not the owner.");
      }

      await conn.query("UPDATE bookings SET user_id = ? WHERE id = ?", [
        recipientIdNumber,
        bookingIdNumber,
      ]);

      if (transferFee > 0 && normalizedRef) {
        await markSlipRefAsUsed(conn, normalizedRef);
      }

      const booking = bookingRows[0];

      return {
        tableNumber: booking.table_number,
        bookingDate: booking.booking_date,
      } satisfies TransferResult;
    });

    const [oldOwnerLineId, newOwnerLineId] = await Promise.all([
      getLineIdByInternalId(session.user.id),
      getLineIdByInternalId(recipientIdNumber),
    ]);

    const bookingDateLabel = format(
      new Date(transferResult.bookingDate),
      "PPP",
    );
    const notifyTasks: Promise<unknown>[] = [];

    if (oldOwnerLineId) {
      notifyTasks.push(
        sendPushMessage(
          oldOwnerLineId,
          [
            `Booking Transferred`,
            `Table ${transferResult.tableNumber} on ${bookingDateLabel}`,
            "Status: Completed.",
          ].join("\n"),
        ),
      );
    }

    if (newOwnerLineId) {
      notifyTasks.push(
        sendPushMessage(
          newOwnerLineId,
          [
            `Booking Received`,
            `Table ${transferResult.tableNumber} on ${bookingDateLabel}`,
            "Status: Confirmed.",
          ].join("\n"),
        ),
      );
    }

    if (notifyTasks.length > 0) {
      const results = await Promise.allSettled(notifyTasks);

      results.forEach((result) => {
        if (result.status === "rejected") {
          console.error(
            "Failed to send booking transfer notification:",
            result.reason,
          );
        }
      });
    }

    res.status(200).json({ message: "ยืนยันการโอนจองโต๊ะสำเร็จ" });
  } catch (error) {
    const status = (error as Partial<HttpError>).status ?? 500;
    const message =
      status === 500
        ? (error as Error).message || "An unexpected error occurred."
        : (error as Error).message;

    if (status === 500) {
      console.error("Transfer API Error:", error);
    }
    res.status(status).json({ message });
  }
}
