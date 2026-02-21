import type { NextApiRequest, NextApiResponse } from "next";

import crypto from "crypto";

import { ensureHttpMethod, requireSession } from "@/lib/api-utils";
import { withTransaction } from "@/lib/db";
import {
  ensureBookingOrdersSchema,
  expireStaleBookingOrders,
  BOOKING_ORDER_STATUSES,
} from "@/lib/booking-orders";
import { getLineIdByInternalId, sendPushMessage } from "@/lib/lineMessagingApi";

type HttpError = Error & { status: number };

type SettingsRow = { setting_key: string; setting_value: string | null };

type TableInfoRow = {
  id: number;
  table_number: string;
  zone_name: string | null;
  booking_fee: number | string | null;
};

type ExistingBookingRow = {
  table_id: number;
  table_number: string;
  status: string;
};

const httpError = (status: number, message: string): HttpError => {
  const error = new Error(message) as HttpError;

  error.status = status;

  return error;
};

const buildPlaceholders = (values: unknown[]) =>
  values.map(() => "?").join(", ");

const normalizeDate = (value: string) => {
  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return parsed.toISOString().slice(0, 10);
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

  const { tableIds, bookingDate } = req.body as {
    tableIds?: unknown;
    bookingDate?: string;
  };

  if (!Array.isArray(tableIds) || tableIds.length === 0 || !bookingDate) {
    res
      .status(400)
      .json({ message: "Table IDs and booking date are required." });

    return;
  }

  const uniqueTableIds = Array.from(
    new Set(tableIds.map((id) => Number(id))),
  ).filter((id) => Number.isInteger(id) && id > 0);

  if (uniqueTableIds.length === 0) {
    res.status(400).json({ message: "Invalid table IDs provided." });

    return;
  }

  const normalizedDate = normalizeDate(bookingDate);

  if (!normalizedDate) {
    res.status(400).json({ message: "Invalid booking date provided." });

    return;
  }

  const userId = session.user.id;

  try {
    const result = await withTransaction(async (conn) => {
      await ensureBookingOrdersSchema(conn);
      await expireStaleBookingOrders(conn);

      // (ส่วนการตั้งค่าและการตรวจสอบโควต้าเหมือนเดิม)
      const settingsRows = (await conn.query(
        `
          SELECT setting_key, setting_value
          FROM settings
          WHERE setting_key IN ('max_bookings_per_user', 'booking_fee')
        `,
      )) as SettingsRow[];

      const settingsMap = new Map(
        settingsRows.map((row) => [row.setting_key, row.setting_value]),
      );
      const maxBookingsPerUser = Number.parseInt(
        settingsMap.get("max_bookings_per_user") ?? "0",
        10,
      );
      const defaultBookingFee = Number(settingsMap.get("booking_fee") ?? "0");

      if (maxBookingsPerUser > 0) {
        const userBookings = (await conn.query(
          `
            SELECT COUNT(*) AS count
            FROM bookings
            WHERE user_id = ?
              AND booking_date = ?
              AND status IN ('confirmed', 'pending_payment')
            FOR UPDATE
          `,
          [userId, normalizedDate],
        )) as Array<{ count: number | string | bigint }>;

        const existingCount = Number(userBookings[0]?.count ?? 0);

        if (existingCount + uniqueTableIds.length > maxBookingsPerUser) {
          throw httpError(
            409,
            `คำสั่งจองนี้จะทำให้คุณเกินโควตาจำนวนการจอง ${maxBookingsPerUser.toLocaleString(
              "th-TH",
            )} โต๊ะต่อคืน`,
          );
        }
      }

      const placeholders = buildPlaceholders(uniqueTableIds);
      const tableInfo = (await conn.query(
        `
          SELECT
            t.id,
            t.table_number,
            z.name AS zone_name,
            COALESCE(z.booking_fee, ?) AS booking_fee
          FROM tables t
          LEFT JOIN zones z ON t.zone_id = z.id
          WHERE t.id IN (${placeholders})
        `,
        [defaultBookingFee, ...uniqueTableIds],
      )) as TableInfoRow[];

      if (tableInfo.length !== uniqueTableIds.length) {
        throw httpError(404, "ไม่พบโต๊ะที่คุณเลือกบางส่วน");
      }
      
      // --- 1. แก้ไขตรรกะการตรวจสอบโต๊ะซ้ำ ---
      // (เลือกแถวทั้งหมดที่เกี่ยวข้องมาล็อคไว้ก่อน)
      const existingBookings = (await conn.query(
        `
          SELECT
            b.table_id,
            t.table_number,
            b.status
          FROM bookings b
          JOIN tables t ON b.table_id = t.id
          WHERE b.table_id IN (${placeholders})
            AND b.booking_date = ?
          FOR UPDATE
        `,
        [...uniqueTableIds, normalizedDate],
      )) as ExistingBookingRow[];
      
      const existingMap = new Map(existingBookings.map(b => [b.table_id, b]));
      const hardConflicts: ExistingBookingRow[] = [];

      for (const tableId of uniqueTableIds) {
          const booking = existingMap.get(tableId);
          // (ตาราง bookings ไม่มี status 'expired', เราจะใช้ 'cancelled' ตามที่ lib/booking-orders.ts อัปเดต)
          if (booking && booking.status !== 'cancelled') {
             hardConflicts.push(booking);
          }
      }

      if (hardConflicts.length > 0) {
        const conflictTables = hardConflicts
          .map((row) => `โต๊ะ ${row.table_number}`)
          .join(", ");

        throw httpError(
          409,
          `${conflictTables} ถูกจับจองไว้แล้ว กรุณารีเฟรชและลองใหม่อีกครั้ง`,
        );
      }
      // --- จบส่วนที่ 1 ---


      // (ส่วนคำนวณ totalFee เหมือนเดิม)
      const totalFee = tableInfo.reduce((sum, row) => {
        const fee = Number(row.booking_fee ?? defaultBookingFee ?? 0);

        return sum + (Number.isFinite(fee) ? fee : 0);
      }, 0);

      const orderId = crypto.randomUUID();
      const requiresPayment = totalFee > 0;
      const orderStatus = requiresPayment
        ? BOOKING_ORDER_STATUSES.PENDING
        : BOOKING_ORDER_STATUSES.PAID;
      const bookingStatus = requiresPayment ? "pending_payment" : "confirmed";
      const expiresAt = requiresPayment
        ? new Date(Date.now() + 15 * 60 * 1000)
        : null;

      // (ส่วน INSERT ลง booking_orders เหมือนเดิม)
      await conn.query(
        `
          INSERT INTO booking_orders (
            id,
            user_id,
            booking_date,
            total_fee,
            status,
            expires_at,
            paid_at
          )
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `,
        [
          orderId,
          userId,
          normalizedDate,
          totalFee,
          orderStatus,
          expiresAt,
          requiresPayment ? null : new Date(),
        ],
      );

      // --- 2. แก้ไขตรรกะการ INSERT/UPDATE ---
      // (เปลี่ยนจาก for loop ที่ INSERT เสมอ มาเป็น UPDATE/INSERT)
      const updatePromises: Promise<any>[] = [];

      for (const table of tableInfo) {
        const existingBooking = existingMap.get(table.id);

        if (existingBooking) {
          // ถ้าเจอแถวเก่า (status 'cancelled') -> UPDATE
          updatePromises.push(conn.query(
            `
              UPDATE bookings
              SET user_id = ?, status = ?, order_id = ?, is_hidden_from_user = 0
              WHERE table_id = ? AND booking_date = ?
            `,
            [userId, bookingStatus, orderId, table.id, normalizedDate]
          ));
        } else {
          // ถ้าไม่เจอแถว -> INSERT
          updatePromises.push(conn.query(
            `
              INSERT INTO bookings (
                user_id, table_id, booking_date, status, order_id
              )
              VALUES (?, ?, ?, ?, ?)
            `,
            [userId, table.id, normalizedDate, bookingStatus, orderId]
          ));
        }
      }
      // รอให้ทุกอย่างเสร็จ
      await Promise.all(updatePromises);
      // --- จบส่วนที่ 2 ---

      return {
        orderId,
        requiresPayment,
        totalFee,
        orderStatus,
        expiresAt: expiresAt?.toISOString() ?? null,
        tables: tableInfo.map((table) => ({
          id: table.id,
          table_number: table.table_number,
          zone_name: table.zone_name,
          booking_fee: Number(table.booking_fee ?? defaultBookingFee ?? 0),
        })),
      };
    });

    // (ส่วนการส่ง Line และ Response เหมือนเดิม)
    if (!result.requiresPayment) {
      const lineId = await getLineIdByInternalId(userId);

      if (lineId) {
        await sendPushMessage(
          lineId,
          [
            "การจองได้รับการยืนยันแล้ว",
            `วันที่: ${normalizedDate}`,
            `โต๊ะ: ${result.tables
              .map((table) => table.table_number)
              .join(", ")}`,
          ].join("\n"),
        );
      }
    }

    res.status(201).json({
      orderId: result.orderId,
      requiresPayment: result.requiresPayment,
      status: result.orderStatus,
      totalFee: result.totalFee,
      expiresAt: result.expiresAt,
      tables: result.tables,
    });
  } catch (error) {
    const status = (error as Partial<HttpError>).status ?? 500;
    const message =
      status === 500
        ? (error as Error).message || "ไม่สามารถสร้างคำสั่งจองได้"
        : (error as Error).message;

    if (status === 500) {
      console.error("Create booking order error:", error);
    }
    res.status(status).json({ message });
  }
}