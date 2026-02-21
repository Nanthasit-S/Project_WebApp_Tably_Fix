import type { NextApiRequest, NextApiResponse } from "next";

import { ensureHttpMethod, requireSession } from "@/lib/api-utils";
import { withTransaction } from "@/lib/db";

type OrderRow = {
  id: string;
  event_id: number;
  quantity: number;
  total_price: number | string | null;
  status: string;
  expires_at: Date | string | null;
  event_title: string;
  event_date: string;
  event_image_url: string | null;
  event_price: number | string | null;
};

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

  try {
    const orders = await withTransaction(async (conn) => {
      await conn.query(
        `
          UPDATE event_orders
          SET status = 'expired'
          WHERE user_id = ?
            AND status = 'pending'
            AND expires_at IS NOT NULL
            AND expires_at <= NOW()
        `,
        [session.user.id],
      );

      const rows = (await conn.query(
        `
          SELECT
            o.id,
            o.event_id,
            o.quantity,
            o.total_price,
            o.status,
            o.expires_at,
            e.title AS event_title,
            e.date AS event_date,
            e.image_url AS event_image_url,
            e.price AS event_price
          FROM event_orders o
          JOIN events e ON o.event_id = e.id
          WHERE o.user_id = ?
          ORDER BY
            FIELD(
              o.status,
              'pending',
              'paid',
              'expired',
              'cancelled'
            ),
            (o.expires_at IS NULL),
            o.expires_at ASC
        `,
        [session.user.id],
      )) as OrderRow[];

      return rows.map((order) => {
        const totalAmount = Number(order.total_price ?? 0);

        return {
          id: order.id,
          status: order.status,
          quantity: Number(order.quantity ?? 0),
          total_amount: Number.isFinite(totalAmount) ? totalAmount : 0,
          expires_at: order.expires_at
            ? new Date(order.expires_at).toISOString()
            : null,
          requires_payment: totalAmount > 0 && order.status === "pending",
          event: {
            id: order.event_id,
            title: order.event_title,
            date: order.event_date,
            image_url: order.event_image_url,
            price: Number(order.event_price ?? 0),
          },
        };
      });
    });

    res.status(200).json(orders);
  } catch (error) {
    console.error("My event orders API error:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
}
