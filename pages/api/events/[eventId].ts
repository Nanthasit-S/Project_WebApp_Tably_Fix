import type { NextApiRequest, NextApiResponse } from "next";

import { ensureHttpMethod } from "@/lib/api-utils";
import { querySingle } from "@/lib/db";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (!ensureHttpMethod(req, res, ["GET"])) {
    return;
  }

  const { eventId } = req.query;

  if (typeof eventId !== "string" || eventId.length === 0) {
    res.status(400).json({ message: "Event ID is required." });

    return;
  }

  try {
    const event = await querySingle(
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
        WHERE e.id = ?
      `,
      [eventId],
    );

    if (!event) {
      res.status(404).json({ message: "Event not found." });

      return;
    }

    res.status(200).json(event);
  } catch (error) {
    console.error(`Failed to fetch event ${eventId}:`, error);
    res.status(500).json({ message: "Internal Server Error" });
  }
}
