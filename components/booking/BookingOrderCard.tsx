import type { BookingOrderSummary } from "@/types/booking-orders";

import React, { useMemo } from "react";
import NextLink from "next/link";
import { format } from "date-fns";
import { th } from "date-fns/locale";

const statusMap = {
  pending: {
    label: "รอการชำระเงิน",
    className:
      "border border-amber-400/40 bg-amber-500/15 text-amber-100 shadow-[0_18px_45px_-30px_rgba(251,191,36,0.45)]",
  },
  paid: {
    label: "ชำระเงินแล้ว",
    className:
      "border border-emerald-400/40 bg-emerald-500/15 text-emerald-100 shadow-[0_18px_45px_-30px_rgba(16,185,129,0.45)]",
  },
  expired: {
    label: "คำสั่งจองหมดอายุ",
    className:
      "border border-rose-400/40 bg-rose-500/15 text-rose-100 shadow-[0_18px_45px_-30px_rgba(244,63,94,0.45)]",
  },
  cancelled: {
    label: "คำสั่งจองถูกยกเลิก",
    className:
      "border border-rose-400/40 bg-rose-500/15 text-rose-100 shadow-[0_18px_45px_-30px_rgba(244,63,94,0.45)]",
  },
} as const;

const formatCurrency = (amount: number) =>
  amount.toLocaleString("th-TH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

export const BookingOrderCard: React.FC<{
  order: BookingOrderSummary;
}> = ({ order }) => {
  const bookingDateDisplay = useMemo(() => {
    try {
      return format(new Date(order.booking_date), "d MMM yyyy", {
        locale: th,
      });
    } catch {
      return order.booking_date;
    }
  }, [order.booking_date]);

  const statusInfo = statusMap[order.status] ?? statusMap.pending;
  const orderUrl = `/bookings/order/${order.id}`;

  return (
    <article className="glass-card flex flex-col gap-5 rounded-3xl border border-white/5 bg-white/5 p-5">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs uppercase text-white/45">คำสั่งจองวันที่</p>
          <h3 className="mt-1 text-lg font-semibold text-white">
            {bookingDateDisplay}
          </h3>
        </div>
        <span
          className={`inline-flex items-center rounded-full px-4 py-1 text-[11px] font-semibold uppercase ${statusInfo.className}`}
        >
          {statusInfo.label}
        </span>
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-white/70">
        <p className="text-xs uppercase text-white/40">รายละเอียด</p>
        <div className="mt-3 flex flex-wrap items-center gap-4">
          <div>
            <p className="text-xs text-white/50">ยอดชำระ</p>
            <p className="text-base font-semibold text-white">
              {formatCurrency(order.total_amount)} THB
            </p>
          </div>
          <div>
            <p className="text-xs text-white/50">จำนวนโต๊ะ</p>
            <p className="text-base font-semibold text-white">
              {order.tables.length.toLocaleString("th-TH")} โต๊ะ
            </p>
          </div>
          {order.expires_at ? (
            <div>
              <p className="text-xs text-white/50">หมดเขตชำระเงิน</p>
              <p className="text-base font-semibold text-white">
                {format(new Date(order.expires_at), "d MMMM yyyy, HH:mm", {
                  locale: th,
                })}
              </p>
            </div>
          ) : null}
        </div>
      </div>

      <div className="space-y-3 rounded-2xl border border-white/10 bg-white/2 px-4 py-3 text-xs text-white/60">
        {order.tables.map((table) => (
          <div
            key={table.id}
            className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/3 px-4 py-2 text-white/70"
          >
            <span className="font-semibold text-white">
              โต๊ะ {table.table_number}
            </span>
            <div className="flex items-center gap-3">
              <span className="rounded-full border border-white/15 px-3 py-1 text-[11px] uppercase text-white/60">
                โซน {table.zone_name ?? "-"}
              </span>
              <span className="font-semibold text-white">
                {table.booking_fee > 0
                  ? `${formatCurrency(table.booking_fee)} THB`
                  : "ไม่มีค่ามัดจำ"}
              </span>
            </div>
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-2 text-xs text-white/60 sm:flex-row sm:justify-between sm:items-center">
        <p>
          {order.status === "pending"
            ? "ขั้นตอนถัดไป: ชำระเงินและอัปโหลดสลิปเพื่อยืนยัน"
            : "คุณสามารถเปิดหน้าคำสั่งจองเพื่อดูรายละเอียดเพิ่มเติมได้"}
        </p>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <NextLink
            className="inline-flex items-center justify-center rounded-full border border-white/15 px-4 py-2 text-xs font-semibold uppercase text-white transition hover:border-white/35 hover:text-white"
            href={orderUrl}
          >
            เปิดหน้าคำสั่งจอง
          </NextLink>
          {order.status === "pending" ? (
            <NextLink
              className="inline-flex items-center justify-center rounded-full border border-emerald-400/40 bg-emerald-500/20 px-4 py-2 text-xs font-semibold uppercase text-emerald-100 transition hover:border-emerald-300/70 hover:bg-emerald-500/30 hover:text-white"
              href={orderUrl}
            >
              ชำระเงินตอนนี้
            </NextLink>
          ) : null}
        </div>
      </div>
    </article>
  );
};
