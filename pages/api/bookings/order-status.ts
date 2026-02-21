import type { NextApiRequest, NextApiResponse } from "next";

import QRCode from "qrcode";
import promptpay from "promptpay-qr";

import { ensureHttpMethod, requireSession } from "@/lib/api-utils";
import { withTransaction } from "@/lib/db";
import {
  ensureBookingOrdersSchema,
  expireStaleBookingOrders,
  BOOKING_ORDER_STATUSES,
} from "@/lib/booking-orders";

type BookingOrderRow = {
  id: string;
  user_id: number;
  booking_date: string;
  total_fee: number | string;
  status: string;
  expires_at: string | null;
  ref_nbr: string | null;
};

type BookingTableRow = {
  table_id: number;
  table_number: string;
  zone_name: string | null;
  booking_fee: number | string | null;
};

type SettingsRow = { setting_key: string; setting_value: string | null };

const normalizeAmount = (value: number | string) => {
  const amount = Number(value);

  return Number.isFinite(amount) ? amount : 0;
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

  const { orderId } = req.query;

  if (typeof orderId !== "string" || orderId.trim().length === 0) {
    res.status(400).json({ message: "Order ID is required." });

    return;
  }

  try {
    const result = await withTransaction(async (conn) => {
      await ensureBookingOrdersSchema(conn);
      await expireStaleBookingOrders(conn);

      const orderRows = (await conn.query(
        `
          SELECT
            id,
            user_id,
            booking_date,
            total_fee,
            status,
            expires_at,
            ref_nbr
          FROM booking_orders
          WHERE id = ?
          FOR UPDATE
        `,
        [orderId],
      )) as BookingOrderRow[];

      if (orderRows.length === 0) {
        return null;
      }

      const order = orderRows[0];

      if (order.user_id !== session.user.id) {
        throw Object.assign(new Error("Forbidden"), { status: 403 });
      }

      if (
        order.status === BOOKING_ORDER_STATUSES.PENDING &&
        order.expires_at &&
        new Date(order.expires_at).getTime() <= Date.now()
      ) {
        await conn.query(
          "UPDATE booking_orders SET status = 'expired', updated_at = NOW() WHERE id = ?",
          [orderId],
        );
        await conn.query(
          `
            UPDATE bookings
            SET status = 'cancelled'
            WHERE order_id = ? AND status = 'pending_payment'
          `,
          [orderId],
        );

        order.status = BOOKING_ORDER_STATUSES.EXPIRED;
      }

      const settingsRows = (await conn.query(
        `
          SELECT setting_key, setting_value
          FROM settings
          WHERE setting_key IN ('booking_fee')
        `,
      )) as SettingsRow[];

      const settingsMap = new Map(
        settingsRows.map((row) => [row.setting_key, row.setting_value]),
      );
      const defaultBookingFee = Number(settingsMap.get("booking_fee") ?? "0");

      const tableRows = (await conn.query(
        `
          SELECT
            b.table_id,
            t.table_number,
            z.name AS zone_name,
            COALESCE(z.booking_fee, ?) AS booking_fee
          FROM bookings b
          JOIN tables t ON b.table_id = t.id
          LEFT JOIN zones z ON t.zone_id = z.id
          WHERE b.order_id = ?
          ORDER BY t.table_number ASC
        `,
        [defaultBookingFee, orderId],
      )) as BookingTableRow[];

      return { order, tables: tableRows, defaultBookingFee };
    });

    if (!result) {
      res.status(404).json({ message: "Order not found." });

      return;
    }

    const { order, tables, defaultBookingFee } = result;
    const totalAmount = normalizeAmount(order.total_fee);
    const requiresPayment =
      totalAmount > 0 && order.status === BOOKING_ORDER_STATUSES.PENDING;
    let promptpayQr = "";

    if (requiresPayment) {
      const promptpayAccount = process.env.PROMPTPAY_ACCOUNT;

      if (promptpayAccount) {
        const payload = promptpay(promptpayAccount, { amount: totalAmount });

        promptpayQr = await QRCode.toDataURL(payload);
      }
    }

    res.status(200).json({
      id: order.id,
      booking_date: order.booking_date,
      total_amount: totalAmount,
      status: order.status,
      expires_at: order.expires_at,
      requires_payment: requiresPayment,
      promptpay_qr: promptpayQr,
      tables: tables.map((table) => ({
        id: table.table_id,
        table_number: table.table_number,
        zone_name: table.zone_name,
        booking_fee: Number(table.booking_fee ?? defaultBookingFee ?? 0),
      })),
    });
  } catch (error) {
    const status = (error as Partial<{ status?: number }>).status ?? 500;
    const message =
      status === 500
        ? (error as Error).message || "Failed to load booking order status."
        : (error as Error).message;

    if (status === 500) {
      console.error("Booking order status API error:", error);
    }
    res.status(status).json({ message });
  }
}
