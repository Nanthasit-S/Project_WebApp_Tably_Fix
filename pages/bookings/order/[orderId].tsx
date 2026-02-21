import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/router";
import NextLink from "next/link";
import { format } from "date-fns";
import { th } from "date-fns/locale";

import DefaultLayout from "@/layouts/default";
import { BookingSlipModal } from "@/components/booking/BookingSlipModal";

type BookingOrderStatus = "pending" | "paid" | "expired" | "cancelled";

type BookingOrderResponse = {
  id: string;
  booking_date: string;
  total_amount: number;
  status: BookingOrderStatus;
  expires_at: string | null;
  requires_payment: boolean;
  promptpay_qr: string;
  tables: Array<{
    id: number;
    table_number: string;
    zone_name: string | null;
    booking_fee: number;
  }>;
};

const formatCurrency = (amount: number) =>
  amount.toLocaleString("th-TH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const statusLabelMap: Record<BookingOrderStatus, string> = {
  pending: "รอการชำระเงิน",
  paid: "ชำระเงินแล้ว",
  expired: "คำสั่งจองหมดอายุ",
  cancelled: "คำสั่งจองถูกยกเลิก",
};

const statusClassMap: Record<BookingOrderStatus, string> = {
  pending: "text-amber-200",
  paid: "text-emerald-200",
  expired: "text-rose-200",
  cancelled: "text-rose-200",
};

const BookingOrderPage = () => {
  const router = useRouter();
  const { orderId } = router.query;
  const [order, setOrder] = useState<BookingOrderResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isConfirming, setIsConfirming] = useState(false);
  const [isSlipModalOpen, setIsSlipModalOpen] = useState(false);

  const isPending = order?.status === "pending";
  const requiresPayment = Boolean(order?.requires_payment);
  const isExpired = order?.status === "expired";
  const isPaid = order?.status === "paid";

  const formattedBookingDate = useMemo(() => {
    if (!order?.booking_date) return "-";
    try {
      return format(new Date(order.booking_date), "EEEEที่ d MMMM yyyy", {
        locale: th,
      });
    } catch {
      return order.booking_date;
    }
  }, [order?.booking_date]);

  const formattedExpiresAt = useMemo(() => {
    if (!order?.expires_at) return null;
    try {
      return format(new Date(order.expires_at), "d MMM yyyy HH:mm น.", {
        locale: th,
      });
    } catch {
      return order.expires_at;
    }
  }, [order?.expires_at]);

  const statusLabel = order ? statusLabelMap[order.status] : "-";
  const statusClass = order ? statusClassMap[order.status] : "text-muted";

  const fetchOrderStatus = useCallback(async () => {
    if (!orderId || typeof orderId !== "string") {
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(
        `/api/bookings/order-status?orderId=${encodeURIComponent(orderId)}`,
      );

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));

        throw new Error(data.message || "ไม่สามารถโหลดสถานะคำสั่งจองได้");
      }

      const data: BookingOrderResponse = await response.json();

      setOrder(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [orderId]);

  useEffect(() => {
    fetchOrderStatus();
  }, [fetchOrderStatus]);

  useEffect(() => {
    if (!isPending) {
      return;
    }

    const interval = setInterval(fetchOrderStatus, 10000);

    return () => clearInterval(interval);
  }, [fetchOrderStatus, isPending]);

  const handleConfirmPayment = useCallback(
    async ({ refNbr, file }: { refNbr: string; file: File }) => {
      if (!order || !orderId || typeof orderId !== "string") {
        return;
      }
      setIsConfirming(true);
      try {
        const formData = new FormData();
        formData.append("orderId", orderId);
        formData.append("refNbr", refNbr);
        formData.append("amount", String(order.total_amount));
        formData.append("slip", file);

        const response = await fetch("/api/bookings/verify-payment", {
          method: "POST",
          body: formData,
        });
        const data = await response.json();

        if (!response.ok) {
          throw new Error(
            data.message || "ไม่สามารถตรวจสอบสลิปได้ กรุณาลองใหม่อีกครั้ง",
          );
        }

        await fetchOrderStatus();
        setIsSlipModalOpen(false);
      } catch (err: any) {
        alert(err.message);
      } finally {
        setIsConfirming(false);
      }
    },
    [order, orderId, fetchOrderStatus],
  );

  if (isLoading) {
    return (
      <DefaultLayout>
        <div className="flex h-[calc(100vh-160px)] items-center justify-center gap-3 text-muted">
          <span className="inline-flex h-12 w-12 animate-spin rounded-full border-2 border-white/30 border-t-transparent" />
          <p className="text-sm">กำลังโหลดคำสั่งจอง...</p>
        </div>
      </DefaultLayout>
    );
  }

  if (error) {
    return (
      <DefaultLayout>
        <div className="mx-auto mt-16 max-w-lg rounded-3xl border border-rose-400/40 bg-rose-500/10 px-6 py-10 text-center text-rose-100">
          <h1 className="text-xl font-semibold">เกิดข้อผิดพลาด</h1>
          <p className="mt-3 text-sm text-rose-100/90">{error}</p>
          <button
            className="mt-6 inline-flex items-center justify-center rounded-full border border-rose-300/40 px-5 py-2 text-sm font-semibold uppercase text-rose-100 transition hover:border-rose-200/70 hover:text-white"
            type="button"
            onClick={() => router.push("/booking")}
          >
            กลับสู่หน้าจองโต๊ะ
          </button>
        </div>
      </DefaultLayout>
    );
  }

  if (!order) {
    return (
      <DefaultLayout>
        <div className="flex h-[calc(100vh-160px)] flex-col items-center justify-center gap-4 text-muted">
          <p className="text-sm">ไม่พบคำสั่งจองที่ต้องการ</p>
          <NextLink
            className="rounded-full border border-soft px-4 py-2 text-xs font-semibold uppercase text-primary transition hover:border-strong hover:text-white"
            href="/booking"
          >
            กลับไปหน้าจองโต๊ะ
          </NextLink>
        </div>
      </DefaultLayout>
    );
  }

  return (
    <DefaultLayout>
      <section className="relative mx-auto mt-10 w-full max-w-5xl px-4 pb-16 text-white sm:px-6 lg:px-8">
        <div className="mb-8 flex items-center justify-between text-xs uppercase text-white/55">
          <NextLink
            className="inline-flex items-center gap-2 text-white/60 transition hover:text-white"
            href="/booking"
          >
            <span className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-white/20">
              <svg
                height="12"
                viewBox="0 0 24 24"
                width="12"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M15 19l-7-7l7-7"
                  fill="none"
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="1.5"
                />
              </svg>
            </span>
            กลับหน้าจองโต๊ะ
          </NextLink>
          <span>คำสั่งจองหมายเลข {order.id.slice(0, 8)}</span>
        </div>

        <div className="grid gap-8 lg:grid-cols-[1.6fr_1fr]">
          <div className="space-y-6">
            <header className="space-y-4 rounded-3xl border border-white/10 bg-white/5 px-6 py-6 ">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h1 className="mt-2 text-2xl font-semibold text-white">
                    ยืนยันการจองโต๊ะสำหรับ {formattedBookingDate}
                  </h1>
                </div>
                <span className={`text-sm font-semibold ${statusClass}`}>
                  {statusLabel}
                </span>
              </div>
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="rounded-2xl border border-white/10 bg-white/4 px-4 py-3">
                  <p className="text-[11px] uppercase text-white/45">
                    ยอดที่ต้องชำระ
                  </p>
                  <p className="mt-2 text-lg font-semibold text-white">
                    {formatCurrency(order.total_amount)} THB
                  </p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/4 px-4 py-3">
                  <p className="text-[11px] uppercase text-white/45">
                    จำนวนโต๊ะ
                  </p>
                  <p className="mt-2 text-lg font-semibold text-white">
                    {order.tables.length.toLocaleString("th-TH")} โต๊ะ
                  </p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/4 px-4 py-3">
                  <p className="text-[11px] uppercase text-white/45">
                    สถานะล่าสุด
                  </p>
                  <p className="mt-2 text-lg font-semibold text-white">
                    {statusLabel}
                  </p>
                </div>
              </div>
              {isPending && formattedExpiresAt ? (
                <div className="rounded-2xl border border-amber-400/30 bg-amber-500/15 px-5 py-3 text-xs text-amber-100">
                  กรุณาชำระเงินภายใน{" "}
                  <span className="font-semibold text-white">
                    {formattedExpiresAt}
                  </span>{" "}
                  มิฉะนั้นระบบจะคืนที่นั่งให้อัตโนมัติ
                </div>
              ) : null}
            </header>
          </div>

          <aside className="space-y-6">
            {requiresPayment ? (
              <div className="rounded-3xl border border-emerald-400/30 bg-emerald-500/10 p-6 text-emerald-50 shadow-[0_25px_80px_-55px_rgba(16,185,129,0.45)]">
                <p className="text-xs uppercase text-emerald-200">
                  ขั้นตอนที่ 1
                </p>
                <h2 className="mt-2 text-lg font-semibold text-white">
                  สแกน QR Code เพื่อชำระเงิน
                </h2>
                <p className="mt-3 text-sm">
                  ใช้แอปธนาคารหรือ PromptPay สแกนโค้ดเพื่อชำระยอดรวม
                  ระบบจะล็อคที่นั่งไว้ให้จนกว่าจะครบกำหนดเวลา
                </p>
                <div className="mt-6 flex flex-col items-center gap-4 rounded-3xl border border-white/10 bg-black/20 p-5">
                  {order.promptpay_qr ? (
                    <img
                      alt="PromptPay QR Code"
                      className="h-56 w-56 rounded-2xl border border-white/10 bg-white/4 p-4 shadow-inner"
                      src={order.promptpay_qr}
                    />
                  ) : (
                    <div className="flex h-32 w-full items-center justify-center text-sm text-white/70">
                      ไม่สามารถโหลด QR Code ได้
                    </div>
                  )}
                  <p className="text-xs text-emerald-100/80">
                    ยอดที่ต้องชำระ:{" "}
                    <span className="font-semibold text-white">
                      {formatCurrency(order.total_amount)} THB
                    </span>
                  </p>
                </div>
              </div>
            ) : null}

            {isPending ? (
              <div className="rounded-3xl border border-white/12 bg-white/5 p-6 shadow-[0_30px_90px_-60px_rgba(56,189,248,0.55)]">
                <p className="text-xs uppercase text-white/50">ขั้นตอนที่ 2</p>
                <h2 className="mt-2 text-lg font-semibold text-white">
                  ส่งสลิปเพื่อยืนยันการชำระเงิน
                </h2>
                <p className="mt-3 text-sm text-white/70">
                  อัปโหลดสลิปหรือสแกน QR จากไฟล์ ระบบจะตรวจสอบอัตโนมัติทันที
                </p>
                <button
                  className="mt-6 w-full rounded-2xl bg-gradient-to-r from-emerald-400 via-cyan-400 to-sky-500 px-5 py-3 text-sm font-semibold uppercase text-[#041026] transition transform hover:scale-[1.03] hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
                  disabled={isConfirming}
                  type="button"
                  onClick={() => setIsSlipModalOpen(true)}
                >
                  {isConfirming ? (
                    <span className="inline-flex items-center gap-2">
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-[#030617]/40 border-t-transparent" />
                      <span>กำลังตรวจสอบ...</span>
                    </span>
                  ) : (
                    "อัปโหลดสลิปเพื่อยืนยันการชำระเงิน"
                  )}
                </button>
              </div>
            ) : null}

            {isExpired ? (
              <div className="rounded-3xl border border-rose-400/30 bg-rose-500/10 p-6 text-rose-50">
                <p className="text-xs uppercase text-rose-200">
                  คำสั่งจองหมดอายุ
                </p>
                <h2 className="mt-2 text-lg font-semibold text-white">
                  คำสั่งจองถูกยกเลิกอัตโนมัติ
                </h2>
                <p className="mt-3 text-sm">
                  ลองกลับไปที่หน้าจองโต๊ะเพื่อเลือกที่นั่งใหม่อีกครั้ง
                  หากต้องการความช่วยเหลือ ติดต่อทีมงานได้ทันที
                </p>
                <NextLink
                  className="mt-4 inline-flex items-center justify-center rounded-full border border-white/15 px-4 py-2 text-xs font-semibold uppercase text-white/70 transition hover:border-white/35 hover:text-white"
                  href="/booking"
                >
                  เปิดหน้าจองโต๊ะอีกครั้ง
                </NextLink>
              </div>
            ) : null}
          </aside>
        </div>
      </section>

      <BookingSlipModal
        headerText="ยืนยันการชำระเงินค่าจองโต๊ะ"
        isOpen={isSlipModalOpen}
        isSubmitting={isConfirming}
        qrCodeUrl={order.promptpay_qr}
        totalFee={order.total_amount}
        onClose={() => setIsSlipModalOpen(false)}
        onSubmit={handleConfirmPayment}
      />
    </DefaultLayout>
  );
};

export default BookingOrderPage;