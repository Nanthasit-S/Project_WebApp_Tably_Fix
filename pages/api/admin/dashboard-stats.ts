import type { NextApiRequest, NextApiResponse } from "next";

import { ensureHttpMethod, requireSession } from "@/lib/api-utils";
import { withConnection } from "@/lib/db";

type CountRow = { total: number | string | bigint };
type PendingBookingRow = {
  id: number;
  user_id: number;
  slip_image_url: string | null;
  table_number: string;
  display_name: string;
  picture_url: string | null;
  booking_date: string;
};

type ModuleTotalsRow = {
  tables: number;
  zones: number;
  activeEvents: number;
  totalBookings: number;
  confirmedBookings: number;
  awaitingBookings: number;
  cancelledBookings: number;
};

type BookingTrendRow = {
  booking_date: string | Date;
  confirmed: number | bigint;
  awaiting: number | bigint;
  cancelled: number | bigint;
};

type EventOrderSummaryRow = {
  totalOrders: number | string | bigint;
  pendingOrders: number | string | bigint;
  paidOrders: number | string | bigint;
  expiredOrders: number | string | bigint;
  cancelledOrders: number | string | bigint;
};

type EventOrderTrendRow = {
  created_at: string | Date;
  paidCount: number | bigint;
  pendingCount: number | bigint;
};

type TicketSummaryRow = {
  totalTickets: number | string | bigint;
  validTickets: number | string | bigint;
  usedTickets: number | string | bigint;
  cancelledTickets: number | string | bigint;
};

type TicketTrendRow = {
  created_at: string | Date;
  issuedCount: number | bigint;
};

type RoleRow = { role: string | null; total: number | string | bigint };

type RecentBookingRow = {
  id: number;
  status: string;
  created_at: string;
  booking_date: string;
  table_number: string | null;
  display_name: string | null;
};

type RecentEventOrderRow = {
  id: string;
  status: string;
  created_at: string;
  quantity: number;
  event_title: string | null;
  display_name: string | null;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (!ensureHttpMethod(req, res, ["GET"])) {
    return;
  }

  if (!(await requireSession(req, res, { roles: ["admin"] }))) {
    return;
  }

  try {
    const today = new Date().toISOString().slice(0, 10);
    const response = await withConnection(async (conn) => {
      const [
        userCountRows,
        todaysBookingRows,
        pendingCountRows,
        pendingBookingsRows,
        moduleTotalsRows,
        bookingTrendRows,
        eventOrderSummaryRows,
        eventOrderTrendRows,
        ticketSummaryRows,
        ticketTrendRows,
        roleRows,
        recentBookingsRows,
        recentEventOrdersRows,
      ] = await Promise.all([
        conn.query("SELECT COUNT(*) AS total FROM users"),
        conn.query(
          "SELECT COUNT(*) AS total FROM bookings WHERE booking_date = ?",
          [today],
        ),
        conn.query(
          "SELECT COUNT(*) AS total FROM bookings WHERE status = 'awaiting_confirmation'",
        ),
        conn.query(
          `
            SELECT
              b.id,
              b.user_id,
              b.slip_image_url,
              b.booking_date,
              t.table_number,
              u.display_name,
              u.picture_url
            FROM bookings b
            JOIN users u ON b.user_id = u.id
            JOIN tables t ON b.table_id = t.id
            WHERE b.status = 'awaiting_confirmation'
            ORDER BY b.created_at DESC
            LIMIT 5
          `,
        ),
        conn.query(
          `
            SELECT
              (SELECT COUNT(*) FROM tables) AS tables,
              (SELECT COUNT(*) FROM zones) AS zones,
              (
                SELECT COUNT(*)
                FROM events
                WHERE COALESCE(CAST(is_active AS TEXT), '0') IN ('1', 'true') OR (date IS NOT NULL AND date >= CURRENT_DATE)
              ) AS activeEvents,
              (SELECT COUNT(*) FROM bookings) AS totalBookings,
              (
                SELECT COUNT(*)
                FROM bookings
                WHERE status = 'confirmed'
              ) AS confirmedBookings,
              (
                SELECT COUNT(*)
                FROM bookings
                WHERE status = 'awaiting_confirmation'
              ) AS awaitingBookings,
              (
                SELECT COUNT(*)
                FROM bookings
                WHERE status = 'cancelled'
              ) AS cancelledBookings
          `,
        ),
        conn.query(
          `
            SELECT
              DATE(booking_date) AS booking_date,
              SUM(CASE WHEN status = 'confirmed' THEN 1 ELSE 0 END) AS confirmed,
              SUM(CASE WHEN status = 'awaiting_confirmation' THEN 1 ELSE 0 END) AS awaiting,
              SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) AS cancelled
            FROM bookings
            WHERE booking_date >= CURRENT_DATE - INTERVAL '6 days'
            GROUP BY DATE(booking_date)
            ORDER BY booking_date
          `,
        ),
        conn.query(
          `
            SELECT
              COUNT(*) AS totalOrders,
              SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) AS pendingOrders,
              SUM(CASE WHEN status = 'paid' THEN 1 ELSE 0 END) AS paidOrders,
              SUM(CASE WHEN status = 'expired' THEN 1 ELSE 0 END) AS expiredOrders,
              SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) AS cancelledOrders
            FROM event_orders
          `,
        ),
        conn.query(
          `
            SELECT
              DATE(created_at) AS created_at,
              SUM(CASE WHEN status = 'paid' THEN 1 ELSE 0 END) AS paidCount,
              SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) AS pendingCount
            FROM event_orders
            WHERE created_at >= CURRENT_DATE - INTERVAL '6 days'
            GROUP BY DATE(created_at)
            ORDER BY created_at
          `,
        ),
        conn.query(
          `
            SELECT
              COUNT(*) AS totalTickets,
              SUM(CASE WHEN status = 'valid' THEN 1 ELSE 0 END) AS validTickets,
              SUM(CASE WHEN status = 'used' THEN 1 ELSE 0 END) AS usedTickets,
              SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) AS cancelledTickets
            FROM event_tickets
          `,
        ),
        conn.query(
          `
            SELECT
              DATE(created_at) AS created_at,
              COUNT(*) AS issuedCount
            FROM event_tickets
            WHERE created_at >= CURRENT_DATE - INTERVAL '6 days'
            GROUP BY DATE(created_at)
            ORDER BY created_at
          `,
        ),
        conn.query(
          "SELECT COALESCE(role, 'user') AS role, COUNT(*) AS total FROM users GROUP BY role",
        ),
        conn.query(
          `
            SELECT
              b.id,
              b.status,
              b.created_at,
              b.booking_date,
              t.table_number,
              u.display_name
            FROM bookings b
            JOIN users u ON b.user_id = u.id
            LEFT JOIN tables t ON b.table_id = t.id
            ORDER BY b.created_at DESC
            LIMIT 5
          `,
        ),
        conn.query(
          `
            SELECT
              o.id,
              o.status,
              o.created_at,
              o.quantity,
              e.title AS event_title,
              u.display_name
            FROM event_orders o
            JOIN events e ON o.event_id = e.id
            JOIN users u ON o.user_id = u.id
            ORDER BY o.created_at DESC
            LIMIT 5
          `,
        ),
      ]);

      return {
        userCount: (userCountRows as CountRow[])[0]?.total ?? 0,
        todaysBookings: (todaysBookingRows as CountRow[])[0]?.total ?? 0,
        pendingCount: (pendingCountRows as CountRow[])[0]?.total ?? 0,
        pendingBookings: pendingBookingsRows as PendingBookingRow[],
        moduleTotals: (moduleTotalsRows as ModuleTotalsRow[])[0] ?? {
          tables: 0,
          zones: 0,
          activeEvents: 0,
          totalBookings: 0,
          confirmedBookings: 0,
          awaitingBookings: 0,
          cancelledBookings: 0,
        },
        bookingTrends: bookingTrendRows as BookingTrendRow[],
        eventOrderSummary: (eventOrderSummaryRows as EventOrderSummaryRow[])[0],
        eventOrderTrends: eventOrderTrendRows as EventOrderTrendRow[],
        ticketSummary: (ticketSummaryRows as TicketSummaryRow[])[0],
        ticketTrends: ticketTrendRows as TicketTrendRow[],
        roleDistribution: roleRows as RoleRow[],
        recentBookings: recentBookingsRows as RecentBookingRow[],
        recentEventOrders: recentEventOrdersRows as RecentEventOrderRow[],
      };
    });

    const stats = {
      totalUsers: Number(response.userCount) || 0,
      todaysBookings: Number(response.todaysBookings) || 0,
      pendingConfirmations: Number(response.pendingCount) || 0,
    };

    const normalizedBookings = response.pendingBookings.map((booking) => ({
      ...booking,
      id: Number(booking.id),
      user_id: Number(booking.user_id),
      booking_date: booking.booking_date,
    }));

    const safeModuleTotals = {
      tables: Number(response.moduleTotals.tables) || 0,
      zones: Number(response.moduleTotals.zones) || 0,
      activeEvents: Number(response.moduleTotals.activeEvents) || 0,
      totalBookings: Number(response.moduleTotals.totalBookings) || 0,
      confirmedBookings: Number(response.moduleTotals.confirmedBookings) || 0,
      awaitingBookings: Number(response.moduleTotals.awaitingBookings) || 0,
      cancelledBookings: Number(response.moduleTotals.cancelledBookings) || 0,
    };

    const dayMap = new Map<string, BookingTrendRow>();

    for (const row of response.bookingTrends) {
      const key =
        typeof row.booking_date === "string"
          ? row.booking_date.slice(0, 10)
          : new Date(row.booking_date).toISOString().slice(0, 10);

      dayMap.set(key, row);
    }

    const eventMap = new Map<string, EventOrderTrendRow>();

    for (const row of response.eventOrderTrends) {
      const key =
        typeof row.created_at === "string"
          ? row.created_at.slice(0, 10)
          : new Date(row.created_at).toISOString().slice(0, 10);

      eventMap.set(key, row);
    }

    const ticketMap = new Map<string, TicketTrendRow>();

    for (const row of response.ticketTrends) {
      const key =
        typeof row.created_at === "string"
          ? row.created_at.slice(0, 10)
          : new Date(row.created_at).toISOString().slice(0, 10);

      ticketMap.set(key, row);
    }

    const normalizedTrends = Array.from({ length: 7 }).map((_, index) => {
      const date = new Date();

      date.setDate(date.getDate() - (6 - index));
      const key = date.toISOString().slice(0, 10);
      const booking = dayMap.get(key);
      const events = eventMap.get(key);
      const tickets = ticketMap.get(key);

      return {
        date: key,
        bookingsConfirmed: Number(booking?.confirmed ?? 0),
        bookingsAwaiting: Number(booking?.awaiting ?? 0),
        bookingsCancelled: Number(booking?.cancelled ?? 0),
        ordersPaid: Number(events?.paidCount ?? 0),
        ordersPending: Number(events?.pendingCount ?? 0),
        ticketsIssued: Number(tickets?.issuedCount ?? 0),
      };
    });

    const eventSummary = {
      totalOrders: Number(response.eventOrderSummary?.totalOrders ?? 0),
      pendingOrders: Number(response.eventOrderSummary?.pendingOrders ?? 0),
      paidOrders: Number(response.eventOrderSummary?.paidOrders ?? 0),
      expiredOrders: Number(response.eventOrderSummary?.expiredOrders ?? 0),
      cancelledOrders: Number(response.eventOrderSummary?.cancelledOrders ?? 0),
    };

    const ticketSummary = {
      totalTickets: Number(response.ticketSummary?.totalTickets ?? 0),
      validTickets: Number(response.ticketSummary?.validTickets ?? 0),
      usedTickets: Number(response.ticketSummary?.usedTickets ?? 0),
      cancelledTickets: Number(response.ticketSummary?.cancelledTickets ?? 0),
    };

    const roleDistribution = (response.roleDistribution ?? []).map((row) => ({
      role: row.role ?? "user",
      total: Number(row.total ?? 0),
    }));

    const recentBookings = (response.recentBookings ?? []).map((row) => ({
      id: `booking-${row.id}`,
      type: "booking",
      title: row.table_number ? `จองโต๊ะ ${row.table_number}` : "การจองโต๊ะ",
      actor: row.display_name ?? "ไม่ระบุ",
      status: row.status,
      timestamp: row.created_at,
      meta: [{ label: "วันที่เข้ารับบริการ", value: row.booking_date }],
    }));

    const recentEventOrders = (response.recentEventOrders ?? []).map((row) => ({
      id: `event-${row.id}`,
      type: "event",
      title: row.event_title
        ? `อีเวนต์: ${row.event_title}`
        : "คำสั่งซื้ออีเวนต์",
      actor: row.display_name ?? "ไม่ระบุ",
      status: row.status,
      timestamp: row.created_at,
      meta: [{ label: "จำนวนบัตร", value: `${row.quantity}` }],
    }));

    const recentActivity = [...recentBookings, ...recentEventOrders]
      .sort(
        (a, b) =>
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
      )
      .slice(0, 10);

    const systemTimeline = normalizedTrends.map((point) => ({
      date: point.date,
      bookings: point.bookingsConfirmed + point.bookingsAwaiting,
      events: point.ordersPaid + point.ordersPending,
      tickets: point.ticketsIssued,
      detail: point,
    }));

    res.status(200).json({
      stats,
      pendingBookings: normalizedBookings,
      moduleTotals: safeModuleTotals,
      bookingTrends: normalizedTrends,
      eventMetrics: eventSummary,
      ticketMetrics: ticketSummary,
      roleDistribution,
      systemTimeline,
      recentActivity,
    });
  } catch (error) {
    console.error("Dashboard stats API error:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
}
