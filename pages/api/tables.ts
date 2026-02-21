import type { NextApiRequest, NextApiResponse } from "next";

import { ensureHttpMethod, requireSession } from "@/lib/api-utils";
import { queryRows } from "@/lib/db";

type ZoneRow = {
  id: number;
  name: string;
  description: string | null;
  booking_fee: number | null;
};

type TableRow = {
  id: number;
  table_number: string;
  capacity: number;
  zone_id: number;
  booking_status: string | null;
};

type TableWithStatus = TableRow & {
  status: "available" | "pending" | "reserved";
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (!ensureHttpMethod(req, res, ["GET"])) {
    return;
  }

  if (!(await requireSession(req, res))) {
    return;
  }

  const { date } = req.query;
  const targetDate = date
    ? new Date(date as string).toISOString().slice(0, 10)
    : new Date().toISOString().slice(0, 10);

  try {
    const [zones, tables] = await Promise.all([
      queryRows<ZoneRow>(
        "SELECT id, name, description, booking_fee FROM zones ORDER BY id ASC",
      ),
      queryRows<TableRow>(
        `
          SELECT
            t.id,
            t.table_number,
            t.capacity,
            t.zone_id,
            b.status AS booking_status
          FROM tables t
          LEFT JOIN bookings b
            ON t.id = b.table_id
            AND b.booking_date = ?
            AND b.status IN (
              'confirmed',
              'awaiting_confirmation',
              'pending_payment'
            )
          WHERE t.status = 'available'
        `,
        [targetDate],
      ),
    ]);

    const tablesWithStatus: TableWithStatus[] = tables.map((table) => {
      if (table.booking_status === "confirmed") {
        return { ...table, status: "reserved" };
      }
      if (
        table.booking_status === "pending_payment" ||
        table.booking_status === "awaiting_confirmation"
      ) {
        return { ...table, status: "pending" };
      }

      return { ...table, status: "available" };
    });

    const zoneMap = new Map<number, TableWithStatus[]>();

    tablesWithStatus.forEach((table) => {
      const list = zoneMap.get(table.zone_id);

      if (list) {
        list.push(table);

        return;
      }
      zoneMap.set(table.zone_id, [table]);
    });

    const zonesWithTables = zones.map((zone) => ({
      ...zone,
      tables: zoneMap.get(zone.id) ?? [],
    }));

    res.status(200).json(zonesWithTables);
  } catch (error) {
    console.error("Failed to fetch tables data:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
}
