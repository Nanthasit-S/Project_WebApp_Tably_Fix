import React, { useMemo } from "react";
import NextLink from "next/link";
import { Pagination } from "@heroui/pagination";

import { BookingHistoryCard, type BookingHistory } from "./BookingHistoryCard";

interface ListPaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  pageSize: number;
  onPageChange: (page: number) => void;
}

interface BookingHistoryListProps {
  bookings: BookingHistory[];
  onShowQr: (booking: BookingHistory) => void;
  onCancel: (booking: BookingHistory) => void;
  onTransfer: (booking: BookingHistory) => void;
  onClearHistory: () => void;
  canClearHistory: boolean;
  pagination?: ListPaginationProps;
}

const DeleteIcon = () => (
  <svg
    className="text-muted"
    height="18"
    viewBox="0 0 24 24"
    width="18"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zm13-15h-3.5l-1-1h-5l-1 1H5v2h14V4z"
      fill="currentColor"
    />
  </svg>
);

const clearButtonBase =
  "inline-flex items-center gap-2 rounded-full border px-4 py-2 text-xs font-semibold uppercase transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/60";

export const BookingHistoryList: React.FC<BookingHistoryListProps> = ({
  bookings,
  onShowQr,
  onCancel,
  onTransfer,
  onClearHistory,
  canClearHistory,
  pagination,
}) => {
  const paginationDetails = useMemo(() => {
    if (!pagination || pagination.totalPages <= 1) {
      return null;
    }

    const { currentPage, pageSize, totalItems } = pagination;
    const start = (currentPage - 1) * pageSize + 1;
    const end = Math.min(totalItems, currentPage * pageSize);

    return { ...pagination, start, end };
  }, [pagination]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 border-b border-soft pb-4 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-lg font-semibold text-white">ประวัติการจอง</h2>
        <button
          className={`${clearButtonBase} ${
            canClearHistory
              ? "border-soft bg-white/5 text-zinc-400 hover:border-strong hover:bg-white/10 hover:text-white"
              : "cursor-not-allowed border-white/10 bg-white/5 text-zinc-400 opacity-50"
          }`}
          disabled={!canClearHistory}
          type="button"
          onClick={onClearHistory}
        >
          <DeleteIcon />
          ล้างประวัติ
        </button>
      </div>

      {bookings.length > 0 ? (
        <div className="space-y-4">
          {bookings.map((booking) => (
            <BookingHistoryCard
              key={booking.id}
              booking={booking}
              onCancel={onCancel}
              onShowQr={onShowQr}
              onTransfer={onTransfer}
            />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center gap-4 rounded-3xl border border-white/5 bg-white/5 py-10 text-center text-zinc-300 backdrop-blur-sm">
          <p>ยังไม่มีประวัติการจอง</p>
          <NextLink
            className="rounded-full border border-soft px-6 py-2 text-xs font-semibold uppercase text-white transition hover:border-strong hover:bg-white/10"
            href="/booking"
          >
            จองโต๊ะ
          </NextLink>
        </div>
      )}

      {paginationDetails ? (
        <div className="flex flex-col items-center justify-between gap-3 pt-2 text-zinc-400 sm:flex-row">
          <span className="text-xs">
            หน้า {paginationDetails.currentPage.toLocaleString("th-TH")} จาก{" "}
            {paginationDetails.totalPages.toLocaleString("th-TH")} • แสดง{" "}
            {paginationDetails.start.toLocaleString("th-TH")} -{" "}
            {paginationDetails.end.toLocaleString("th-TH")} จาก{" "}
            {paginationDetails.totalItems.toLocaleString("th-TH")} รายการ
          </span>
          <Pagination
            classNames={{
              base: "rounded-full border border-white/10 bg-white/5 px-2 py-1",
            }}
            showControls
            page={paginationDetails.currentPage}
            total={paginationDetails.totalPages}
            onChange={paginationDetails.onPageChange}
          />
        </div>
      ) : null}
    </div>
  );
};
