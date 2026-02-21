import type { NextApiRequest, NextApiResponse } from "next";

import { ensureHttpMethod, requireSession } from "@/lib/api-utils";
import { withTransaction } from "@/lib/db";
import {
  ensureBookingOrdersSchema,
  expireStaleBookingOrders,
} from "@/lib/booking-orders";

type BookingOrderRow = {
  id: string;
  booking_date: string;
  total_fee: number | string;
  status: string;
  expires_at: string | null;
  created_at: string;
};

type BookingTableRow = {
  order_id: string;
  table_id: number;
  table_number: string;
  zone_name: string | null;
  booking_fee: number | string | null;
};

const buildPlaceholders = (values: unknown[]) =>
  values.map(() => "?").join(", ");

const STATUS_PRIORITY = ["pending", "paid", "expired", "cancelled"] as const;

const statusSortIndex = (status: string) => {
  const index = STATUS_PRIORITY.indexOf(
    status as (typeof STATUS_PRIORITY)[number],
  );

  return index === -1 ? STATUS_PRIORITY.length : index;
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
    const result = await withTransaction(async (conn) => {
      await ensureBookingOrdersSchema(conn);
      await expireStaleBookingOrders(conn);

      const orders = (await conn.query(
        `
          SELECT
            id,
            booking_date,
            total_fee,
            status,
            expires_at,
            created_at
          FROM booking_orders
          WHERE user_id = ?
          ORDER BY created_at DESC
        `,
        [session.user.id],
      )) as BookingOrderRow[];

      if (orders.length === 0) {
        return [];
      }

      const orderIds = orders.map((order) => order.id);
      const tables = (await conn.query(
        `
          SELECT
            b.order_id,
            b.table_id,
            t.table_number,
            z.name AS zone_name,
            COALESCE(z.booking_fee, 0) AS booking_fee
          FROM bookings b
          JOIN tables t ON b.table_id = t.id
          LEFT JOIN zones z ON t.zone_id = z.id
          WHERE b.order_id IN (${buildPlaceholders(orderIds)})
          ORDER BY t.table_number ASC
        `,
        orderIds,
      )) as BookingTableRow[];

      const tablesByOrder = new Map<string, BookingTableRow[]>();

      tables.forEach((row) => {
        const list = tablesByOrder.get(row.order_id);

        if (list) {
          list.push(row);

          return;
        }
        tablesByOrder.set(row.order_id, [row]);
      });

      return orders
        .map((order) => ({
          id: order.id,
          booking_date: order.booking_date,
          total_amount: Number(order.total_fee ?? 0),
          status: order.status,
          expires_at: order.expires_at,
          tables:
            tablesByOrder.get(order.id)?.map((table) => ({
              id: table.table_id,
              table_number: table.table_number,
              zone_name: table.zone_name,
              booking_fee: Number(table.booking_fee ?? 0),
            })) ?? [],
        }))
        .sort((a, b) => {
          const statusDiff =
            statusSortIndex(a.status) - statusSortIndex(b.status);

          if (statusDiff !== 0) {
            return statusDiff;
          }

          return (
            new Date(b.booking_date).getTime() -
            new Date(a.booking_date).getTime()
          );
        });
    });

    res.status(200).json(result);
  } catch (error) {
    console.error("My booking orders API error:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
}
