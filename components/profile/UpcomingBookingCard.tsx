import type { BookingHistory } from "./BookingHistoryCard";

import React from "react";
import { format } from "date-fns";
import { th as thLocale } from "date-fns/locale";

interface UpcomingBookingCardProps {
  booking: BookingHistory;
  onShowQr: (booking: BookingHistory) => void;
  onCancel: (booking: BookingHistory) => void;
  onTransfer: (booking: BookingHistory) => void;
}

const statusStyleMap: Record<BookingHistory["status"], string> = {
  confirmed: "bg-emerald-500/15 text-emerald-200 ring-1 ring-emerald-400/40",
  awaiting_confirmation:
    "bg-amber-500/15 text-amber-100 ring-1 ring-amber-400/40",
  cancelled: "bg-rose-500/10 text-rose-200 ring-1 ring-rose-400/30",
  completed: "bg-slate-500/10 text-slate-200 ring-1 ring-slate-400/30",
};

const statusLabelMap: Record<BookingHistory["status"], string> = {
  confirmed: "ยืนยันแล้ว",
  awaiting_confirmation: "รอการยืนยัน",
  cancelled: "ยกเลิกแล้ว",
  completed: "เสร็จสิ้น",
};

const baseButton =
  "rounded-full border px-4 py-2 text-xs font-semibold uppercase transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/60";

const buttonThemes = {
  neutral: `${baseButton} border-soft bg-transparent text-muted hover:border-strong hover:text-primary`,
  secondary: `${baseButton} border-sky-400/40 bg-sky-500/10 text-sky-100 hover:bg-sky-500/20`,
  danger: `${baseButton} border-rose-400/40 bg-rose-500/15 text-rose-100 hover:bg-rose-500/25`,
};

export const UpcomingBookingCard: React.FC<UpcomingBookingCardProps> = ({
  booking,
  onShowQr,
  onCancel,
  onTransfer,
}) => {
  const visitDate = format(new Date(booking.booking_date), "EEEEที่ d MMM", {
    locale: thLocale,
  });
  const statusTheme =
    statusStyleMap[booking.status] ?? statusStyleMap.confirmed;

  return (
    <div className="border border-white/10 bg-white/5 rounded-3xl p-6 text-primary">
      <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
        <div className="space-y-3">
          <p className="text-xs font-medium uppercase text-muted">
            การเยี่ยมชมครั้งถัดไป
          </p>
          <h3 className="text-2xl font-semibold leading-snug">
            โต๊ะ {booking.table_number} · โซน {booking.zone_name}
          </h3>
          <p className="text-sm text-muted">{visitDate}</p>
          <span
            className={`inline-flex w-fit items-center rounded-full px-4 py-1 text-xs font-semibold uppercase ${statusTheme}`}
          >
            {statusLabelMap[booking.status]}
          </span>
        </div>

        <div className="flex flex-wrap gap-2 md:justify-end">
          <button
            className={buttonThemes.neutral}
            type="button"
            onClick={() => onShowQr(booking)}
          >
            แสดงคิวอาร์โค้ด
          </button>
          <button
            className={buttonThemes.secondary}
            type="button"
            onClick={() => onTransfer(booking)}
          >
            โอนการจอง
          </button>
          <button
            className={buttonThemes.danger}
            type="button"
            onClick={() => onCancel(booking)}
          >
            ยกเลิก
          </button>
        </div>
      </div>
    </div>
  );
};
