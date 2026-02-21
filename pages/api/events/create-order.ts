import type { NextApiRequest, NextApiResponse } from "next";

import crypto from "crypto";

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

  const { eventId, quantity } = req.body as {
    eventId?: number | string;
    quantity?: number;
  };
  const eventIdNumber = Number(eventId);
  const quantityNumber = Number(quantity);

  if (!Number.isInteger(eventIdNumber) || eventIdNumber <= 0) {
    res.status(400).json({ message: "Event ID is required." });

    return;
  }

  if (!Number.isInteger(quantityNumber) || quantityNumber <= 0) {
    res.status(400).json({ message: "Quantity must be a positive integer." });

    return;
  }

  if (quantityNumber > 10) {
    res
      .status(400)
      .json({ message: "You can reserve at most 10 tickets per order." });

    return;
  }

  try {
    const { orderId, requiresPayment, status } = await withTransaction(
      async (conn) => {
        const rows = (await conn.query(
          `
            SELECT price, total_tickets, tickets_sold, is_active
            FROM events
            WHERE id = ?
            FOR UPDATE
          `,
          [eventIdNumber],
        )) as Array<{
          price: number | string | null;
          total_tickets: number | string | null;
          tickets_sold: number | string | null;
          is_active: number | string | null;
        }>;

        if (rows.length === 0) {
          throw httpError(404, "Event not found.");
        }

        const event = rows[0];
        const price = Number(event.price ?? 0);
        const totalTickets = Number(event.total_tickets ?? 0);
        const storedSoldTickets = Number(event.tickets_sold ?? 0);
        const isActive =
          event.is_active === null || event.is_active === undefined
            ? true
            : Number(event.is_active) === 1;

        if (!isActive) {
          throw httpError(
            400,
            "This event is not available for booking at the moment.",
          );
        }

        await conn.query(
          `
            UPDATE event_orders
            SET status = 'expired'
            WHERE event_id = ?
              AND status = 'pending'
              AND expires_at IS NOT NULL
              AND expires_at <= NOW()
          `,
          [eventIdNumber],
        );

        const [{ pendingTickets }] = (await conn.query(
          `
            SELECT COALESCE(SUM(quantity), 0) AS pendingTickets
            FROM event_orders
            WHERE event_id = ?
              AND status = 'pending'
              AND expires_at IS NOT NULL
              AND expires_at > NOW()
          `,
          [eventIdNumber],
        )) as Array<{ pendingTickets: number | string }>;

        const [{ paidTickets }] = (await conn.query(
          `
            SELECT COALESCE(SUM(quantity), 0) AS paidTickets
            FROM event_orders
            WHERE event_id = ? AND status = 'paid'
          `,
          [eventIdNumber],
        )) as Array<{ paidTickets: number | string }>;

        const actualSoldTickets = Number(paidTickets ?? 0);

        if (actualSoldTickets !== storedSoldTickets) {
          await conn.query("UPDATE events SET tickets_sold = ? WHERE id = ?", [
            actualSoldTickets,
            eventIdNumber,
          ]);
        }

        const reservedTickets = Number(pendingTickets ?? 0);
        const ticketsRemaining = Math.max(
          0,
          totalTickets - actualSoldTickets - reservedTickets,
        );

        if (quantityNumber > ticketsRemaining) {
          throw httpError(400, `Only ${ticketsRemaining} tickets remaining.`);
        }

        const totalPrice = price * quantityNumber;
        const orderIdValue = crypto.randomUUID();
        const expiresAt =
          totalPrice > 0 ? new Date(Date.now() + 15 * 60 * 1000) : null;
        const initialStatus = totalPrice > 0 ? "pending" : "paid";

        await conn.query(
          `
            INSERT INTO event_orders
              (id, user_id, event_id, quantity, total_price, status, expires_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)
          `,
          [
            orderIdValue,
            session.user.id,
            eventIdNumber,
            quantityNumber,
            totalPrice,
            initialStatus,
            expiresAt,
          ],
        );

        if (initialStatus === "paid") {
          await conn.query(
            "UPDATE events SET tickets_sold = tickets_sold + ? WHERE id = ?",
            [quantityNumber, eventIdNumber],
          );

          for (let i = 0; i < quantityNumber; i += 1) {
            const ticketId = crypto.randomUUID();
            const qrPayload = JSON.stringify({
              ticketId,
              eventId: eventIdNumber,
              userId: session.user.id,
              type: "event-ticket",
            });

            await conn.query(
              "INSERT INTO event_tickets (id, event_id, user_id, status, qr_code_data) VALUES (?, ?, ?, 'valid', ?)",
              [ticketId, eventIdNumber, session.user.id, qrPayload],
            );
          }
        }

        return {
          orderId: orderIdValue,
          requiresPayment: initialStatus === "pending",
          status: initialStatus,
        };
      },
    );

    res.status(201).json({ orderId, requiresPayment, status });
  } catch (error) {
    const status = (error as Partial<HttpError>).status ?? 500;
    const message =
      status === 500
        ? (error as Error).message || "Failed to create order."
        : (error as Error).message;

    if (status === 500) {
      console.error("Create order error:", error);
    }
    res.status(status).json({ message });
  }
}
