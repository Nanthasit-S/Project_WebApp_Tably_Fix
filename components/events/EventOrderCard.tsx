import type { EventOrderSummary } from "@/types/event-orders";

import React, { useMemo } from "react";
import NextLink from "next/link";
import Image from "next/image";
import { format, formatDistanceToNowStrict } from "date-fns";
import { th } from "date-fns/locale";

import { resolveEventMedia } from "@/components/events/EventCard";

const statusStyleMap: Record<
  EventOrderSummary["status"],
  { label: string; className: string }
> = {
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
    label: "คำสั่งซื้อหมดอายุ",
    className:
      "border border-rose-400/40 bg-rose-500/15 text-rose-100 shadow-[0_18px_45px_-30px_rgba(244,63,94,0.45)]",
  },
  cancelled: {
    label: "คำสั่งซื้อถูกยกเลิก",
    className:
      "border border-rose-400/40 bg-rose-500/15 text-rose-100 shadow-[0_18px_45px_-30px_rgba(244,63,94,0.45)]",
  },
};

const formatCurrency = (amount: number) =>
  amount.toLocaleString("th-TH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

export const EventOrderCard: React.FC<{ order: EventOrderSummary }> = ({
  order,
}) => {
  const { src: coverImage, isExternal: isExternalCover } = useMemo(
    () => resolveEventMedia(order.event.image_url ?? null),
    [order.event.image_url],
  );
  const eventDateDisplay = useMemo(() => {
    try {
      return format(new Date(order.event.date), "d MMM yyyy HH:mm น.", {
        locale: th,
      });
    } catch {
      return order.event.date;
    }
  }, [order.event.date]);

  const expiresDisplay = useMemo(() => {
    if (!order.expires_at || order.status !== "pending") {
      return null;
    }

    const expiresAt = new Date(order.expires_at);

    if (Number.isNaN(expiresAt.getTime())) {
      return null;
    }

    if (expiresAt.getTime() <= Date.now()) {
      return "หมดเวลาชำระเงินแล้ว";
    }

    return `เหลือเวลา ${formatDistanceToNowStrict(expiresAt, {
      locale: th,
    })}`;
  }, [order.expires_at, order.status]);

  const statusConfig = statusStyleMap[order.status] ?? statusStyleMap.pending;
  const orderUrl = `/events/order/${order.id}`;
  const totalDisplay =
    order.total_amount > 0
      ? `${formatCurrency(order.total_amount)} บาท`
      : "ฟรี (ไม่มีค่าใช้จ่าย)";

  return (
    <article className="glass-card flex flex-col gap-5 rounded-3xl border border-white/5 bg-white/5 p-5">
      <div className="flex flex-col gap-4 md:flex-row">
        <div className="relative h-48 w-full overflow-hidden rounded-2xl md:h-40 md:w-44">
          {coverImage ? (
            <Image
              fill
              alt={order.event.title}
              className="object-cover transition duration-500 hover:scale-105"
              src={coverImage}
              unoptimized={isExternalCover}
            />
          ) : (
            <div className="absolute inset-0 bg-linear-to-br from-indigo-500/30 via-sky-500/20 to-zinc-900" />
          )}
          <span
            className={`absolute left-4 top-4 inline-flex items-center rounded-full px-3 py-1 text-[11px] font-semibold uppercase ${statusConfig.className}`}
          >
            {statusConfig.label}
          </span>
        </div>

        <div className="flex flex-1 flex-col justify-between gap-4">
          <div className="space-y-2">
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase text-zinc-400">
                  อีเวนต์
                </p>
                <h3 className="mt-1 text-lg font-semibold text-white">
                  {order.event.title}
                </h3>
              </div>
              <div className="text-right text-xs text-zinc-400">
                <p>จำนวน {order.quantity.toLocaleString("th-TH")} ใบ</p>
                <p className="font-semibold text-white">{totalDisplay}</p>
              </div>
            </div>
            <p className="text-sm text-zinc-400">{eventDateDisplay}</p>
            {expiresDisplay ? (
              <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase text-amber-200">
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-amber-300" />
                {expiresDisplay}
              </p>
            ) : null}
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-xs text-zinc-400">
              {order.requires_payment && order.status === "pending"
                ? "ชำระเงินภายใน 15 นาทีเพื่อยืนยันคำสั่งซื้อ มิฉะนั้นระบบจะคืนจำนวนบัตรอัตโนมัติ"
                : order.status === "paid"
                  ? "คุณสามารถดูบัตรได้จากหน้าตั๋วของฉัน"
                  : "คุณยังคงสามารถเปิดหน้ารายละเอียดคำสั่งซื้อเพื่อดูสถานะได้"}
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              {order.status === "pending" && order.requires_payment ? (
                <NextLink
                  className="inline-flex items-center justify-center gap-2 rounded-full border border-emerald-400/50 bg-emerald-500/20 px-5 py-2 text-xs font-semibold uppercase text-emerald-100 transition hover:border-emerald-300/70 hover:bg-emerald-500/25 hover:text-white"
                  href={orderUrl}
                >
                  ชำระเงิน
                </NextLink>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </article>
  );
};
