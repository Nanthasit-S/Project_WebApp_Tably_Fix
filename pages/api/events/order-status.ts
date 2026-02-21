import type { NextApiRequest, NextApiResponse } from "next";

import QRCode from "qrcode";
import promptpay from "promptpay-qr";

import { ensureHttpMethod, requireSession } from "@/lib/api-utils";
import { querySingle, withTransaction } from "@/lib/db";

type OrderRow = {
  id: string;
  user_id: number;
  event_id: number;
  quantity: number;
  total_price?: number;
  total_amount?: number;
  status: string;
  expires_at: string | null;
  event_title: string;
  event_date: string;
};

type UpdateResult = { affectedRows?: number };

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (!ensureHttpMethod(req, res, ["GET"])) {
    return;
  }

  const session = await requireSession(req, res);

  if (!session?.user?.id) {
    return;
  }

  const { orderId } = req.query;

  if (typeof orderId !== "string" || orderId.length === 0) {
    res.status(400).json({ message: "Order ID is required." });

    return;
  }

  try {
    const order = await querySingle<OrderRow>(
      `
        SELECT
          o.id,
          o.user_id,
          o.event_id,
          o.quantity,
          o.total_price,
          (o.quantity * e.price) AS total_amount,
          o.status,
          o.expires_at,
          e.title AS event_title,
          e.date AS event_date
        FROM event_orders o
        JOIN events e ON o.event_id = e.id
        WHERE o.id = ? AND o.user_id = ?
      `,
      [orderId, session.user.id],
    );

    if (!order) {
      res.status(404).json({ message: "Order not found." });

      return;
    }

    const promptpayAccount = process.env.PROMPTPAY_ACCOUNT;
    let qrCodeDataUrl = "";
    let status = order.status;
    let expiresAtValue = order.expires_at;

    if (status === "pending" && order.expires_at) {
      const now = Date.now();
      const expiresAt = new Date(order.expires_at).getTime();

      if (now >= expiresAt) {
        await withTransaction(async (conn) => {
          const result = (await conn.query(
            "UPDATE event_orders SET status = 'expired' WHERE id = ? AND status = 'pending'",
            [order.id],
          )) as UpdateResult;

          if ((result.affectedRows ?? 0) > 0) {
            const [{ paidTickets }] = (await conn.query(
              `
                SELECT COALESCE(SUM(quantity), 0) AS paidTickets
                FROM event_orders
                WHERE event_id = ? AND status = 'paid'
              `,
              [order.event_id],
            )) as Array<{ paidTickets: number | string }>;

            await conn.query(
              "UPDATE events SET tickets_sold = ? WHERE id = ?",
              [Number(paidTickets ?? 0), order.event_id],
            );

            status = "expired";
            expiresAtValue = order.expires_at;
          }
        });
      } else if (promptpayAccount) {
        const totalAmount = Number(
          order.total_price ?? order.total_amount ?? 0,
        );

        if (totalAmount > 0) {
          const payload = promptpay(promptpayAccount, { amount: totalAmount });

          qrCodeDataUrl = await QRCode.toDataURL(payload);
        }
      }
    }

    const totalAmount = Number(order.total_price ?? order.total_amount ?? 0);
    const requiresPayment = totalAmount > 0 && status === "pending";

    res.status(200).json({
      id: order.id,
      user_id: order.user_id,
      event_title: order.event_title,
      event_date: order.event_date,
      quantity: order.quantity,
      total_amount: totalAmount,
      status,
      expires_at: expiresAtValue,
      requires_payment: requiresPayment,
      promptpay_qr: qrCodeDataUrl,
    });
  } catch (error) {
    console.error("Order status API error:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
}
