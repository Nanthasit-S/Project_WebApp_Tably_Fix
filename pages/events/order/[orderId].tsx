import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/router";
import NextLink from "next/link";
import { format } from "date-fns";
import { th } from "date-fns/locale";

import DefaultLayout from "@/layouts/default";
import { BookingSlipModal } from "@/components/booking/BookingSlipModal";

type EventOrderStatus = "pending" | "paid" | "expired" | "cancelled";

type EventOrderResponse = {
  id: string;
  event_title: string;
  event_date: string;
  quantity: number;
  total_amount: number;
  status: EventOrderStatus;
  expires_at: string | null;
  requires_payment: boolean;
  promptpay_qr: string;
};

const formatCurrency = (amount: number) =>
  amount.toLocaleString("th-TH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const statusLabelMap: Record<EventOrderStatus, string> = {
  pending: "รอชำระเงิน",
  paid: "ชำระเงินแล้ว",
  expired: "คำสั่งซื้อหมดอายุ",
  cancelled: "คำสั่งซื้อถูกยกเลิก",
};

const statusClassMap: Record<EventOrderStatus, string> = {
  pending: "text-amber-200",
  paid: "text-emerald-200",
  expired: "text-rose-200",
  cancelled: "text-rose-200",
};

const EventOrderPage = () => {
  const router = useRouter();
  const { orderId } = router.query;
  const [order, setOrder] = useState<EventOrderResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isConfirming, setIsConfirming] = useState(false);
  const [isSlipModalOpen, setIsSlipModalOpen] = useState(false);
  const [now, setNow] = useState(() => Date.now());

  const fetchOrderStatus = useCallback(
    async (showLoading = false) => {
      if (!orderId || typeof orderId !== "string") {
        if (showLoading) {
          setIsLoading(false);
        }

        return;
      }

      if (showLoading) {
        setIsLoading(true);
      }

      setError(null);
      try {
        const response = await fetch(
          `/api/events/order-status?orderId=${encodeURIComponent(orderId)}`,
        );

        if (!response.ok) {
          const data = await response.json().catch(() => ({}));

          throw new Error(
            data.message || "ไม่สามารถดึงสถานะคำสั่งซื้อได้ กรุณาลองอีกครั้ง",
          );
        }

        const data: EventOrderResponse = await response.json();

        setOrder(data);
      } catch (err: any) {
        setError(err.message);
      } finally {
        if (showLoading) {
          setIsLoading(false);
        }
      }
    },
    [orderId],
  );

  useEffect(() => {
    fetchOrderStatus(true);
  }, [fetchOrderStatus]);

  useEffect(() => {
    if (!order || order.status !== "pending") {
      return;
    }

    const interval = setInterval(() => {
      fetchOrderStatus(false);
    }, 10000);

    return () => clearInterval(interval);
  }, [order, fetchOrderStatus]);

  useEffect(() => {
    if (!order?.expires_at || order.status !== "pending") {
      return;
    }

    const interval = setInterval(() => setNow(Date.now()), 1000);

    return () => clearInterval(interval);
  }, [order?.expires_at, order?.status]);

  const formattedEventDate = useMemo(() => {
    if (!order?.event_date) return "-";
    try {
      return format(
        new Date(order.event_date),
        "EEEE ที่ d MMMM yyyy HH:mm น.",
        {
          locale: th,
        },
      );
    } catch {
      return order.event_date;
    }
  }, [order?.event_date]);

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
  const statusClass = order ? statusClassMap[order.status] : "text-white/60";

  const requiresPayment = Boolean(order?.requires_payment);
  const isPending = order?.status === "pending";
  const isExpired = order?.status === "expired";
  const isPaid = order?.status === "paid";

  const timeLeftSeconds = useMemo(() => {
    if (!order?.expires_at || order.status !== "pending") {
      return 0;
    }

    const expiresAt = new Date(order.expires_at).getTime();

    if (Number.isNaN(expiresAt)) {
      return 0;
    }

    const diff = Math.floor((expiresAt - now) / 1000);

    return diff > 0 ? diff : 0;
  }, [order?.expires_at, order?.status, now]);

  const countdownLabel = useMemo(() => {
    const minutes = Math.floor(timeLeftSeconds / 60);
    const seconds = timeLeftSeconds % 60;

    return `${minutes.toString().padStart(2, "0")}:${seconds
      .toString()
      .padStart(2, "0")}`;
  }, [timeLeftSeconds]);

  const handleConfirmPayment = useCallback(
    async (payload: { refNbr: string; file: File }) => {
      const { refNbr } = payload;
      if (!order || !orderId || typeof orderId !== "string") {
        return;
      }

      setIsConfirming(true);
      try {
        const response = await fetch("/api/events/verify-payment", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            orderId,
            refNbr,
            amount: order.total_amount,
          }),
        });
        const data = await response.json();

        if (!response.ok) {
          throw new Error(
            data.message || "ไม่สามารถยืนยันการชำระเงินได้ กรุณาลองอีกครั้ง",
          );
        }

        await fetchOrderStatus(true);
        setIsSlipModalOpen(false);
      } catch (err: any) {
        alert(err.message);
      } finally {
        setIsConfirming(false);
      }
    },
    [order, orderId, fetchOrderStatus],
  );

  const handleDownloadPromptPayQr = useCallback(() => {
    if (!order?.promptpay_qr) {
      return;
    }

    const link = document.createElement("a");
    link.href = order.promptpay_qr;
    link.download = `event-order-${order.id}-promptpay.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, [order?.id, order?.promptpay_qr]);

  const handleRetry = useCallback(() => {
    fetchOrderStatus(true);
  }, [fetchOrderStatus]);

  if (isLoading) {
    return (
      <DefaultLayout>
        <div className="flex h-[calc(100vh-160px)] items-center justify-center gap-3 text-muted">
          <span className="inline-flex h-12 w-12 animate-spin rounded-full border-2 border-white/30 border-t-transparent" />
          <p className="text-sm">กำลังโหลดสถานะคำสั่งซื้อ...</p>
        </div>
      </DefaultLayout>
    );
  }

  if (error) {
    return (
      <DefaultLayout>
        <div className="mx-auto mt-16 max-w-lg rounded-3xl border border-rose-400/40 bg-rose-500/10 px-6 py-10 text-center text-rose-100">
          <h1 className="text-xl font-semibold">ไม่สามารถดึงข้อมูลได้</h1>
          <p className="mt-3 text-sm text-rose-100/90">{error}</p>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <button
              className="inline-flex items-center justify-center rounded-full border border-rose-300/40 px-5 py-2 text-sm font-semibold uppercase text-rose-100 transition hover:border-rose-200/70 hover:text-white"
              type="button"
              onClick={handleRetry}
            >
              ลองอีกครั้ง
            </button>
            <button
              className="inline-flex items-center justify-center rounded-full border border-white/15 px-5 py-2 text-sm font-semibold uppercase text-white/70 transition hover:border-white/35 hover:text-white"
              type="button"
              onClick={() => router.push("/events")}
            >
              กลับไปดูกิจกรรม
            </button>
          </div>
        </div>
      </DefaultLayout>
    );
  }

  if (!order) {
    return (
      <DefaultLayout>
        <div className="flex h-[calc(100vh-160px)] flex-col items-center justify-center gap-4 text-muted">
          <p className="text-sm">ไม่พบคำสั่งซื้อที่คุณต้องการ</p>
          <NextLink
            className="rounded-full border border-soft px-4 py-2 text-xs font-semibold uppercase text-primary transition hover:border-strong hover:text-white"
            href="/events"
          >
            กลับไปดูกิจกรรม
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
            href="/events"
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
            กลับไปยังอีเวนต์
          </NextLink>
          <span>หมายเลขคำสั่งซื้อ #{order.id.slice(0, 8).toUpperCase()}</span>
        </div>

        <div className="grid gap-8 lg:grid-cols-[1.6fr_1fr]">
          <div className="space-y-6">
            <header className="space-y-4 rounded-3xl border border-white/10 bg-white/5 px-6 py-6">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <p className="text-xs uppercase text-white/45">
                    สถานะคำสั่งซื้อ
                  </p>
                  <h1 className="mt-2 text-2xl font-semibold text-white sm:text-3xl">
                    {order.event_title}
                  </h1>
                  <p className="mt-1 text-sm text-white/60">
                    {formattedEventDate}
                  </p>
                </div>
                <span className={`text-sm font-semibold ${statusClass}`}>
                  {statusLabel}
                </span>
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <div className="rounded-2xl border border-white/10 bg-white/4 px-4 py-3">
                  <p className="text-[11px] uppercase text-white/45">ยอดรวม</p>
                  <p className="mt-2 text-lg font-semibold text-white">
                    {formatCurrency(order.total_amount)} THB
                  </p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/4 px-4 py-3">
                  <p className="text-[11px] uppercase text-white/45">
                    จำนวนบัตร
                  </p>
                  <p className="mt-2 text-lg font-semibold text-white">
                    {order.quantity.toLocaleString("th-TH")} ใบ
                  </p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/4 px-4 py-3">
                  <p className="text-[11px] uppercase text-white/45">สถานะ</p>
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
                  เพื่อไม่ให้คำสั่งซื้อหมดอายุ
                </div>
              ) : null}
            </header>

            <div className="rounded-3xl border border-white/10 bg-white/5 px-6 py-6 text-sm leading-7 text-white/70">
              <p>
                หลังจากชำระเงินสำเร็จ
                ระบบจะอัปเดตสถานะและออกบัตรเข้าร่วมงานให้อัตโนมัติ
                คุณสามารถตรวจสอบบัตรของคุณได้ที่หน้าโปรไฟล์
              </p>
            </div>
          </div>

          <aside className="space-y-6">
            <div className="rounded-3xl border border-white/10 bg-white/5 px-6 py-6 text-white/70">
              <p className="text-xs uppercase text-white/45">สถานะล่าสุด</p>
              <p className="mt-2 text-2xl font-semibold text-white">
                {statusLabel}
              </p>
              {isPending && formattedExpiresAt ? (
                <p className="mt-3 text-sm">
                  กรุณาชำระเงินภายใน{" "}
                  <span className="font-semibold text-white">
                    {formattedExpiresAt}
                  </span>
                </p>
              ) : null}
              {isPaid ? (
                <p className="mt-3 text-sm">
                  ระบบบันทึกการชำระเงินเรียบร้อยแล้ว ขอบคุณที่ใช้บริการ
                </p>
              ) : null}
              {isExpired ? (
                <p className="mt-3 text-sm">
                  คำสั่งซื้อนี้หมดอายุแล้ว
                  หากยังต้องการเข้าร่วมกิจกรรมโปรดสร้างคำสั่งซื้อใหม่
                </p>
              ) : null}
              {order?.status === "cancelled" ? (
                <p className="mt-3 text-sm">
                  คำสั่งซื้อถูกยกเลิก หากมีข้อสงสัยโปรดติดต่อเจ้าหน้าที่
                </p>
              ) : null}
            </div>

            {requiresPayment ? (
              <div className="space-y-5 rounded-3xl border border-white/10 bg-white/5 px-6 py-6">
                <div className="space-y-2 text-sm text-white/70">
                  <p className="text-xs uppercase text-white/45">
                    ยอดที่ต้องชำระ
                  </p>
                  <p className="text-3xl font-semibold text-white">
                    {formatCurrency(order.total_amount)} THB
                  </p>
                </div>

                {isPending ? (
                  <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-xs text-white/60">
                    <span>เวลาที่เหลือ</span>
                    <span className="font-mono text-lg text-white">
                      {countdownLabel}
                    </span>
                  </div>
                ) : null}

                {order.promptpay_qr ? (
                  <div className="relative overflow-hidden rounded-3xl border border-cyan-400/30 bg-gradient-to-br from-cyan-500/10 via-sky-500/5 to-transparent px-6 py-6 text-center text-white/70 shadow-[0_30px_80px_-40px_rgba(14,116,144,0.65)]">
                    <div className="absolute inset-0 opacity-60">
                      <div className="absolute -top-24 left-1/2 h-52 w-52 -translate-x-1/2 rounded-full bg-cyan-400/25 blur-3xl" />
                      <div className="absolute -bottom-24 right-10 h-48 w-48 rounded-full bg-sky-500/20 blur-3xl" />
                    </div>
                    <div className="relative space-y-5">
                      <div className="space-y-2">
                        <span className="inline-flex items-center justify-center rounded-full border border-cyan-300/60 bg-black/30 px-4 py-1 text-[11px] font-semibold uppercase text-cyan-100">
                          PromptPay
                        </span>
                        <h3 className="text-xl font-semibold text-white">
                          สแกนเพื่อชำระเงิน
                        </h3>
                        <p className="text-xs text-white/65">
                          เปิดแอปธนาคารของคุณ สแกนคิวอาร์ในหน้านี้ แล้วตรวจสอบยอดก่อนยืนยันการชำระ
                        </p>
                      </div>

                      <div className="relative mx-auto w-full max-w-[240px]">
                        <div className="absolute inset-0 rounded-[28px] bg-cyan-400/30 blur-3xl" />
                        <div className="relative rounded-[28px] border border-white/15 bg-black/30 p-4 shadow-[0_25px_70px_-35px_rgba(8,145,178,0.65)]">
                          <img
                            alt="PromptPay QR code"
                            className="w-full rounded-2xl bg-white p-3"
                            src={order.promptpay_qr}
                          />
                        </div>
                      </div>

                      <div className="space-y-2 text-left text-xs leading-relaxed text-white/70 sm:text-sm">
                        <p className="text-center font-semibold text-white/90">
                          ขั้นตอนก่อนชำระเงิน
                        </p>
                        <ul className="space-y-2">
                          <li className="flex items-start gap-2">
                            <span className="mt-1 h-1.5 w-1.5 rounded-full bg-cyan-300" />
                            <span>เปิดแอปธนาคารแล้วเลือกเมนูสแกนจ่าย</span>
                          </li>
                          <li className="flex items-start gap-2">
                            <span className="mt-1 h-1.5 w-1.5 rounded-full bg-cyan-300" />
                            <span>สแกนคิวอาร์ด้านบน ตรวจสอบยอดและยืนยันการชำระเงิน</span>
                          </li>
                          <li className="flex items-start gap-2">
                            <span className="mt-1 h-1.5 w-1.5 rounded-full bg-cyan-300" />
                            <span>อัปโหลดสลิปให้ระบบตรวจสอบเพื่อออกบัตรเข้างานอัตโนมัติ</span>
                          </li>
                        </ul>
                      </div>

                      <div className="flex justify-center">
                        <button
                          className="inline-flex items-center gap-2 rounded-full border border-cyan-300/60 bg-black/20 px-5 py-2 text-sm font-semibold text-cyan-100 transition hover:border-cyan-200 hover:bg-black/30"
                          type="button"
                          onClick={handleDownloadPromptPayQr}
                        >
                          <svg
                            className="h-4 w-4"
                            fill="none"
                            stroke="currentColor"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="1.8"
                            viewBox="0 0 24 24"
                          >
                            <path d="M12 5v10" />
                            <path d="M8 11l4 4 4-4" />
                            <path d="M5 19h14" />
                          </svg>
                          ดาวน์โหลด QR Code
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white/60">
                    ไม่พบ QR Code สำหรับคำสั่งซื้อนี้
                  </div>
                )}

                <div className="flex flex-col gap-3 border-t border-white/10 pt-4 sm:flex-row">
                  <button
                    className="w-full rounded-full border border-white/20 px-5 py-3 text-sm font-semibold text-white/80 transition hover:border-white/40 hover:text-white sm:w-auto"
                    type="button"
                    onClick={() => fetchOrderStatus(true)}
                  >
                    เช็กสถานะอีกครั้ง
                  </button>
                  {isPending ? (
                    <button
                      className="w-full rounded-full border border-emerald-400/40 bg-emerald-500/20 px-5 py-3 text-sm font-semibold text-emerald-100 transition hover:bg-emerald-500/30 sm:w-auto"
                      type="button"
                      onClick={() => setIsSlipModalOpen(true)}
                    >
                      อัปโหลดสลิปโอนเงิน
                    </button>
                  ) : null}
                </div>
              </div>
            ) : (
              <div className="rounded-3xl border border-white/10 bg-white/5 px-6 py-6 text-sm text-white/70">
                <p>คำสั่งซื้อนี้ไม่จำเป็นต้องชำระเงิน</p>
              </div>
            )}
          </aside>
        </div>
      </section>

      {order ? (
        <BookingSlipModal
          isOpen={isSlipModalOpen}
          isSubmitting={isConfirming}
          qrCodeUrl={order.promptpay_qr}
          totalFee={order.total_amount}
          onClose={() => setIsSlipModalOpen(false)}
          onSubmit={handleConfirmPayment}
        />
      ) : null}
    </DefaultLayout>
  );
};

export default EventOrderPage;
