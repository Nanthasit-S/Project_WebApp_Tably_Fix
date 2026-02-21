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
    const events = await queryRows(
      `
        SELECT
          e.id,
          e.title,
          e.description,
          e.date,
          e.image_url,
          e.price,
          e.total_tickets,
          e.tickets_sold,
          COALESCE(p.pending_tickets, 0) AS pending_tickets,
          GREATEST(
            e.total_tickets - e.tickets_sold - COALESCE(p.pending_tickets, 0),
            0
          ) AS available_tickets,
          e.is_active
        FROM events e
        LEFT JOIN (
          SELECT
            event_id,
            COALESCE(SUM(quantity), 0) AS pending_tickets
          FROM event_orders
          WHERE status = 'pending'
            AND expires_at IS NOT NULL
            AND expires_at > NOW()
          GROUP BY event_id
        ) p ON p.event_id = e.id
        ORDER BY e.date DESC, e.id DESC
      `,
    );

    res.status(200).json(events);
  } catch (error) {
    console.error("Failed to fetch events:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
}
