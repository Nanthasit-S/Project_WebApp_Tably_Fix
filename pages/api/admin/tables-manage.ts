import type { NextApiRequest, NextApiResponse } from "next";

import { ensureHttpMethod, requireSession } from "@/lib/api-utils";
import { withConnection } from "@/lib/db";

type ZoneRow = {
  id: number;
  name: string;
  description: string | null;
  booking_fee: number;
};

type TableRow = {
  id: number;
  table_number: string;
  capacity: number;
  zone_id: number;
  status: string;
  zone_name: string;
  booking_id: number | null;
  booking_status: string | null;
  booked_by_user_id: number | null;
  slip_image_url: string | null;
  booked_by_user_name: string | null;
  booking_total_price: number | null;
};

const normalizeIds = (value: unknown): number[] => {
  if (!Array.isArray(value)) {
    return [];
  }
  const ids = value
    .map((id) => Number(id))
    .filter((id) => Number.isInteger(id) && id > 0);

  return Array.from(new Set(ids));
};

const buildPlaceholders = (count: number): string => {
  return Array(count).fill("?").join(", ");
};

const handleZoneRequest = async (req: NextApiRequest, res: NextApiResponse) => {
  switch (req.method) {
    case "GET": {
      const zones = await withConnection(async (conn) => {
        const rows = (await conn.query(
          "SELECT * FROM zones ORDER BY id ASC",
        )) as ZoneRow[];

        return rows;
      });

      res.status(200).json({ zones });

      return;
    }
    case "POST": {
      const { name, description, booking_fee } = req.body as {
        name?: string;
        description?: string;
        booking_fee?: number;
      };

      if (!name) {
        res.status(400).json({ message: "Zone name is required." });

        return;
      }
      const result = await withConnection(async (conn) => {
        return conn.query<{ id: number }>(
          "INSERT INTO zones (name, description, booking_fee) VALUES (?, ?, ?) RETURNING id",
          [name, description ?? null, booking_fee ?? 0],
        );
      });

      res.status(201).json({
        message: "Zone created successfully",
        id: Array.isArray(result) ? Number(result[0]?.id) : 0,
      });

      return;
    }
    case "PUT": {
      const { id, name, description, booking_fee } = req.body as {
        id?: number | string;
        name?: string;
        description?: string;
        booking_fee?: number;
      };
      const zoneId = Number(id);

      if (!Number.isInteger(zoneId) || zoneId <= 0) {
        res.status(400).json({ message: "Zone ID is required for updating." });

        return;
      }

      await withConnection(async (conn) => {
        await conn.query(
          "UPDATE zones SET name = ?, description = ?, booking_fee = ? WHERE id = ?",
          [name ?? null, description ?? null, booking_fee ?? 0, zoneId],
        );
      });
      res.status(200).json({ message: "Zone updated successfully." });

      return;
    }
    case "DELETE": {
      const { id } = req.body as { id?: number | string };
      const zoneId = Number(id);

      if (!Number.isInteger(zoneId) || zoneId <= 0) {
        res.status(400).json({ message: "Zone ID is required." });

        return;
      }

      try {
        await withConnection(async (conn) => {
          await conn.query("DELETE FROM zones WHERE id = ?", [zoneId]);
        });
        res.status(200).json({ message: "Zone deleted successfully." });
      } catch (error: any) {
        if (error.code === "ER_ROW_IS_REFERENCED_2" || error.code === "23503") {
          res.status(409).json({
            message:
              "Cannot delete zone. Please remove all tables from this zone first.",
          });

          return;
        }
        throw error;
      }

      return;
    }
    default:
      ensureHttpMethod(req, res, ["GET", "POST", "PUT", "DELETE"]);
  }
};

const handleTableRequest = async (
  req: NextApiRequest,
  res: NextApiResponse,
  targetDate: string,
) => {
  switch (req.method) {
    case "GET": {
      const data = await withConnection(async (conn) => {
        const [zonesRows, tablesRows] = await Promise.all([
          conn.query("SELECT * FROM zones ORDER BY id ASC"),
          conn.query(
            `
              SELECT
                t.*,
                z.name AS zone_name,
                b.id AS booking_id,
                b.status AS booking_status,
                b.user_id AS booked_by_user_id,
                b.slip_image_url,
                b.total_price AS booking_total_price,
                u.display_name AS booked_by_user_name
              FROM tables t
              JOIN zones z ON t.zone_id = z.id
              LEFT JOIN bookings b
                ON t.id = b.table_id
                AND b.booking_date = ?
                AND b.status IN ('confirmed', 'awaiting_confirmation', 'pending_payment')
              LEFT JOIN users u ON b.user_id = u.id
              ORDER BY t.zone_id, t.table_number
            `,
            [targetDate],
          ),
        ]);

        return {
          zones: zonesRows as ZoneRow[],
          tables: tablesRows as TableRow[],
        };
      });

      res.status(200).json(data);

      return;
    }
    case "POST": {
      const { table_number, capacity, zone_id } = req.body as {
        table_number?: string;
        capacity?: number;
        zone_id?: number;
      };

      if (!table_number || !capacity || !zone_id) {
        res.status(400).json({ message: "Missing required fields." });

        return;
      }

      const result = await withConnection(async (conn) => {
        return conn.query<{ id: number }>(
          "INSERT INTO tables (table_number, capacity, zone_id) VALUES (?, ?, ?) RETURNING id",
          [table_number, capacity, zone_id],
        );
      });

      res.status(201).json({
        message: "Table created successfully",
        id: Array.isArray(result) ? Number(result[0]?.id) : 0,
      });

      return;
    }
    case "PUT": {
      const { ids, capacity, zone_id } = req.body as {
        ids?: number[] | string[];
        capacity?: number;
        zone_id?: number;
      };

      const normalizedIds = normalizeIds(ids);

      if (normalizedIds.length === 0) {
        res.status(400).json({ message: "Table IDs are required." });

        return;
      }

      const updates: string[] = [];
      const params: unknown[] = [];

      if (capacity !== undefined) {
        updates.push("capacity = ?");
        params.push(capacity);
      }

      if (zone_id !== undefined) {
        updates.push("zone_id = ?");
        params.push(zone_id);
      }

      if (updates.length === 0) {
        res.status(400).json({ message: "No fields to update." });

        return;
      }

      params.push(...normalizedIds);

      await withConnection(async (conn) => {
        await conn.query(
          `UPDATE tables SET ${updates.join(
            ", ",
          )} WHERE id IN (${buildPlaceholders(normalizedIds.length)})`,
          params,
        );
      });

      res.status(200).json({ message: "Tables updated successfully." });

      return;
    }

    case "DELETE": {
      const { ids, tableId } = req.body as {
        ids?: number[] | string[];
        tableId?: number;
      };

      let normalizedIds: number[] = [];

      if (tableId) {
        normalizedIds = [Number(tableId)];
      } else if (ids) {
        normalizedIds = normalizeIds(ids);
      }

      if (normalizedIds.length === 0) {
        res.status(400).json({ message: "Table ID(s) are required." });
        return;
      }

      try {
        await withConnection(async (conn) => {
          const placeholders = buildPlaceholders(normalizedIds.length);
          const existingBookings = await conn.query(
            `SELECT DISTINCT table_id FROM bookings WHERE table_id IN (${placeholders}) LIMIT 1`,
            normalizedIds,
          );

          if (Array.isArray(existingBookings) && existingBookings.length > 0) {
            throw new Error(
              "Cannot delete table: This table has existing bookings associated with it.",
            );
          }

          const deleteResult = await conn.query(
            `DELETE FROM tables WHERE id IN (${placeholders})`,
            normalizedIds,
          );
          const affectedRows = Array.isArray(deleteResult)
            ? 0
            : (deleteResult.affectedRows ?? 0);

          if (affectedRows === 0) {
            throw new Error("Table not found or already deleted.");
          }
        });

        res.status(200).json({ message: "Tables deleted successfully." });
      } catch (error: any) {
        if (error.message.startsWith("Cannot delete")) {
          res.status(409).json({ message: error.message });
        } else {
          throw error;
        }
      }

      return;
    }

    default:
      ensureHttpMethod(req, res, ["GET", "POST", "PUT", "DELETE"]);
  }
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (!(await requireSession(req, res, { roles: ["admin"] }))) {
    return;
  }

  const { entity, date } = req.query;
  const targetDate =
    typeof date === "string" && date.length > 0
      ? new Date(date).toISOString().slice(0, 10)
      : new Date().toISOString().slice(0, 10);

  try {
    if (entity === "zones") {
      await handleZoneRequest(req, res);

      return;
    }

    await handleTableRequest(req, res, targetDate);
  } catch (error) {
    if (
      (error as any)?.code === "ER_ROW_IS_REFERENCED_2" ||
      (error as any)?.code === "23503"
    ) {
      res.status(409).json({
        message:
          "Cannot delete zone. Please remove all tables from this zone first.",
      });

      return;
    }
    console.error("Admin tables manage API error:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
}
