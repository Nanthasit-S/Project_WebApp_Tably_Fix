import type { NextApiRequest, NextApiResponse } from "next";

import crypto from "crypto";

import { ensureHttpMethod, requireSession } from "@/lib/api-utils";
import { withTransaction } from "@/lib/db";
import {
  lockSlipRef,
  markSlipRefAsUsed,
  normalizeSlipRef,
  verifySlipWithOpenSlip,
} from "@/lib/payments/slip";

type OrderRow = {
  event_id: number;
  user_id: number;
  quantity: number;
  total_price: number | string | null;
  status: string;
};

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

  const { orderId, refNbr, amount } = req.body as {
    orderId?: string;
    refNbr?: string;
    amount?: number | string;
  };

  if (
    typeof orderId !== "string" ||
    orderId.trim().length === 0 ||
    typeof refNbr !== "string"
  ) {
    res
      .status(400)
      .json({ message: "Missing required data for verification." });

    return;
  }

  const normalizedRef = normalizeSlipRef(refNbr);
  const amountRaw = typeof amount === "string" ? Number(amount) : amount;
  const amountValue = Number(amountRaw);

  if (!Number.isFinite(amountValue) || amountValue <= 0) {
    res.status(400).json({ message: "Invalid payment amount provided." });

    return;
  }

  try {
    await verifySlipWithOpenSlip(normalizedRef, amountValue);
  } catch (error) {
    res.status(400).json({
      message:
        error instanceof Error
          ? error.message
          : "Automatic slip verification failed.",
    });

    return;
  }

  try {
    const result = await withTransaction(async (conn) => {
      const slipAlreadyUsed = await lockSlipRef(conn, normalizedRef);

      if (slipAlreadyUsed) {
        throw httpError(409, "This payment slip has already been used.");
      }

      const orders = (await conn.query(
        "SELECT event_id, user_id, quantity, total_price, status FROM event_orders WHERE id = ? FOR UPDATE",
        [orderId],
      )) as OrderRow[];

      if (orders.length === 0) {
        throw httpError(404, "Order not found.");
      }

      const order = orders[0];

      if (order.user_id !== session.user.id) {
        throw httpError(403, "You are not allowed to verify this payment.");
      }

      if (order.status !== "pending") {
        return { status: order.status, ticketsGenerated: false };
      }

      const orderTotal = Number(order.total_price ?? 0);

      if (
        !Number.isFinite(orderTotal) ||
        Math.abs(orderTotal - amountValue) > 0.01
      ) {
        throw httpError(400, "The payment amount does not match this order.");
      }

      await conn.query(
        "UPDATE event_orders SET status = 'paid', slip_image_url = NULL, ref_nbr = ?, paid_at = NOW() WHERE id = ?",
        [normalizedRef, orderId],
      );

      await conn.query(
        "UPDATE events SET tickets_sold = tickets_sold + ? WHERE id = ?",
        [order.quantity, order.event_id],
      );

      for (let i = 0; i < order.quantity; i += 1) {
        const ticketId = crypto.randomUUID();
        const qrCodeData = JSON.stringify({
          ticketId,
          eventId: order.event_id,
          userId: order.user_id,
          type: "event-ticket",
        });

        await conn.query(
          "INSERT INTO event_tickets (id, event_id, user_id, status, qr_code_data) VALUES (?, ?, ?, 'valid', ?)",
          [ticketId, order.event_id, order.user_id, qrCodeData],
        );
      }

      await markSlipRefAsUsed(conn, normalizedRef);

      return { status: "paid", ticketsGenerated: true };
    });

    if (!result.ticketsGenerated) {
      res.status(200).json({
        message: "This order has already been processed.",
        status: result.status,
      });

      return;
    }

    res
      .status(200)
      .json({ message: "Payment verified successfully.", status: "paid" });
  } catch (error) {
    const status = (error as Partial<HttpError>).status ?? 500;
    const message =
      status === 500
        ? (error as Error).message || "An unexpected error occurred."
        : (error as Error).message;

    if (status === 500) {
      console.error("Verify payment API error:", error);
    }
    res.status(status).json({ message });
  }
}
