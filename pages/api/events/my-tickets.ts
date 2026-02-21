import type { NextApiRequest, NextApiResponse } from "next";

import { ensureHttpMethod, requireSession } from "@/lib/api-utils";
import { queryRows } from "@/lib/db";

type TicketRow = {
  id: number;
  status: string;
  qr_code_data: string | null;
  event_title: string;
  event_date: string;
  event_image_url: string | null;
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
    const tickets = await queryRows<TicketRow>(
      `
        SELECT
          t.id,
          t.status,
          t.qr_code_data,
          e.title AS event_title,
          e.date AS event_date,
          e.image_url AS event_image_url
        FROM event_tickets t
        JOIN events e ON t.event_id = e.id
        WHERE t.user_id = ?
        ORDER BY e.date DESC
      `,
      [session.user.id],
    );

    const formattedTickets = tickets.map((ticket) => ({
      id: ticket.id,
      status: ticket.status,
      qr_code_data: ticket.qr_code_data,
      event: {
        title: ticket.event_title,
        date: ticket.event_date,
        image_url: ticket.event_image_url,
      },
    }));

    res.status(200).json(formattedTickets);
  } catch (error) {
    console.error("My tickets API error:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
}
