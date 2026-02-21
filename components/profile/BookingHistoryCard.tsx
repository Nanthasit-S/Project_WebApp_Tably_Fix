import React from "react";
import { format } from "date-fns";
import { th as thLocale } from "date-fns/locale";

export interface BookingHistory {
  id: number;
  booking_date: string;
  status: "confirmed" | "awaiting_confirmation" | "cancelled" | "completed";
  table_number: string;
  zone_name: string;
}

interface BookingHistoryCardProps {
  booking: BookingHistory;
  onShowQr: (booking: BookingHistory) => void;
  onCancel: (booking: BookingHistory) => void;
  onTransfer: (booking: BookingHistory) => void;
}

const statusStyles: Record<BookingHistory["status"], string> = {
  confirmed: "bg-emerald-500/15 text-emerald-200 ring-1 ring-emerald-400/40",
  awaiting_confirmation:
    "bg-amber-500/15 text-amber-100 ring-1 ring-amber-400/40",
  cancelled: "bg-rose-500/10 text-rose-200 ring-1 ring-rose-400/30",
  completed: "bg-slate-500/10 text-slate-200 ring-1 ring-slate-500/30",
};

const statusLabelMap: Record<BookingHistory["status"], string> = {
  confirmed: "ยืนยันแล้ว",
  awaiting_confirmation: "รอการยืนยัน",
  cancelled: "ยกเลิกแล้ว",
  completed: "เสร็จสิ้น",
};

const baseButton =
  "rounded-full border px-3 py-1.5 text-xs font-semibold uppercase transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/60";

const buttonThemes = {
  neutral: `${baseButton} border-soft bg-transparent text-zinc-400 hover:border-strong hover:text-white`,
  secondary: `${baseButton} border-sky-400/40 bg-sky-500/10 text-sky-100 hover:bg-sky-500/20`,
  danger: `${baseButton} border-rose-400/40 bg-rose-500/15 text-rose-100 hover:bg-rose-500/25`,
};

export const BookingHistoryCard: React.FC<BookingHistoryCardProps> = ({
  booking,
  onShowQr,
  onCancel,
  onTransfer,
}) => {
  const status = booking.status;
  const isActionable =
    status === "awaiting_confirmation" || status === "confirmed";
  const visitDate = format(new Date(booking.booking_date), "PPP", {
    locale: thLocale,
  });

  return (
    <div className="border border-white/10 bg-white/5 rounded-3xl p-5 text-white">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-sm font-semibold">โต๊ะ {booking.table_number}</p>
          <p className="text-xs uppercase text-zinc-400">
            โซน {booking.zone_name} · {visitDate}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 md:justify-end">
          <span
            className={`inline-flex items-center rounded-full px-4 py-1 text-xs font-semibold uppercase ${statusStyles[status]}`}
          >
            {statusLabelMap[status]}
          </span>
          {isActionable && (
            <>
              <button
                className={buttonThemes.neutral}
                type="button"
                onClick={() => onShowQr(booking)}
              >
                คิวอาร์โค้ด
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
            </>
          )}
        </div>
      </div>
    </div>
  );
};
