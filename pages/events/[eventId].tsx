import type { GetServerSideProps } from "next";

import NextLink from "next/link";
import Image from "next/image";
import { useCallback, useMemo, useState } from "react";
import { useRouter } from "next/router";
import { useSession, signIn } from "next-auth/react";
import { format, formatDistanceToNow } from "date-fns";
import { th } from "date-fns/locale";

import DefaultLayout from "@/layouts/default";
import { Event, resolveEventMedia } from "@/components/events/EventCard";

interface EventPageProps {
  event: (Event & { is_active?: boolean }) | null;
}

const formatCurrency = (amount: number) =>
  amount.toLocaleString("th-TH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const InlineSpinner = ({ className = "" }: { className?: string }) => (
  <span
    className={`inline-flex h-5 w-5 animate-spin rounded-full border-2 border-white/50 border-t-transparent ${className}`}
  />
);

export default function EventPage({ event }: EventPageProps) {
  const router = useRouter();
  const { data: session } = useSession();
  const [quantity, setQuantity] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const ticketsRemaining = useMemo(() => {
    if (!event) return 0;

    if (
      typeof (event as Event & { available_tickets?: number })
        .available_tickets === "number"
    ) {
      return Math.max(
        (event as Event & { available_tickets?: number }).available_tickets ??
          0,
        0,
      );
    }

    const pendingTickets = Number(event.pending_tickets ?? 0);

    return Math.max(
      0,
      event.total_tickets - event.tickets_sold - pendingTickets,
    );
  }, [event]);

  const isSoldOut = ticketsRemaining <= 0;
  const priceAsNumber = useMemo(
    () => (event ? Number(event.price) : 0),
    [event],
  );
  const requiresPayment = priceAsNumber > 0;
  const totalCost = useMemo(
    () => (requiresPayment ? priceAsNumber * quantity : 0),
    [requiresPayment, priceAsNumber, quantity],
  );

  const eventDate = useMemo(
    () => (event ? new Date(event.date) : null),
    [event],
  );
  const formattedEventDate = useMemo(
    () =>
      eventDate
        ? format(eventDate, "EEEE ที่ d MMMM yyyy HH:mm น.", { locale: th })
        : "กำหนดการจะแจ้งให้ทราบ",
    [eventDate],
  );
  const relativeEventDate = useMemo(
    () =>
      eventDate
        ? formatDistanceToNow(eventDate, { locale: th, addSuffix: true })
        : "",
    [eventDate],
  );

  const isEventActive = useMemo(() => {
    if (!event) return false;
    const value = (event as Event & { is_active?: boolean | number | string })
      .is_active;

    if (value === undefined || value === null) return true;
    if (typeof value === "boolean") return value;

    return Number(value) === 1;
  }, [event]);

  const saleStatus = useMemo(() => {
    if (!event) {
      return "ไม่มีข้อมูลสถานะจำหน่าย";
    }
    if (isSoldOut) {
      return "จำหน่ายหมดแล้ว";
    }
    if (!isEventActive) {
      return "ยังไม่เปิดจำหน่าย";
    }

    return "กำลังจำหน่าย";
  }, [event, isSoldOut, isEventActive]);

  const saleBadgeClass = isSoldOut
    ? "border border-rose-400/40 bg-rose-500/15 text-rose-100"
    : !isEventActive
      ? "border border-amber-400/40 bg-amber-500/15 text-amber-100"
      : "border border-emerald-400/40 bg-emerald-500/15 text-emerald-100";

  const ticketsProgress = useMemo(() => {
    if (!event || event.total_tickets <= 0) return 0;

    return Math.min(
      100,
      Math.round((event.tickets_sold / event.total_tickets) * 100),
    );
  }, [event]);

  const purchaseCap = useMemo(() => {
    if (ticketsRemaining <= 0) return 0;

    return Math.min(ticketsRemaining, 10);
  }, [ticketsRemaining]);

  const descriptionParagraphs = useMemo(() => {
    if (!event?.description) return [];

    return event.description
      .split("\n")
      .map((paragraph) => paragraph.trim())
      .filter(Boolean);
  }, [event?.description]);

  const { src: coverImage, isExternal: isExternalCover } = useMemo(
    () => resolveEventMedia(event?.image_url ?? null),
    [event?.image_url],
  );

  const handleQuantityChange = useCallback(
    (nextValue: number) => {
      if (!event) return;
      if (purchaseCap <= 0) return;
      const clamped = Math.min(Math.max(1, nextValue), purchaseCap);

      setQuantity(clamped);
    },
    [event, purchaseCap],
  );

  const increaseQuantity = useCallback(
    () => handleQuantityChange(quantity + 1),
    [handleQuantityChange, quantity],
  );
  const decreaseQuantity = useCallback(
    () => handleQuantityChange(quantity - 1),
    [handleQuantityChange, quantity],
  );

  const handleCreateOrder = async () => {
    if (!event) return;
    if (!session) {
      signIn("line", { callbackUrl: router.asPath });

      return;
    }
    if (isSoldOut || purchaseCap <= 0) return;

    setIsSubmitting(true);
    try {
      const response = await fetch("/api/events/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventId: event.id, quantity }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "ไม่สามารถสร้างคำสั่งซื้อได้ในขณะนี้");
      }

      if (!data.requiresPayment || data.status === "paid") {
        alert("ยืนยันคำสั่งซื้อเรียบร้อยแล้ว เราจะพาคุณไปยังหน้าบัตรทันที");
        router.push("/profile/tickets");

        return;
      }

      router.push(`/events/order/${data.orderId}`);
    } catch (error: any) {
      alert(`เกิดข้อผิดพลาด: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!event) {
    return (
      <DefaultLayout>
        <div className="flex h-[calc(100vh-160px)] flex-col items-center justify-center gap-3 text-muted">
          <span className="inline-flex h-12 w-12 animate-spin rounded-full border-2 border-white/30 border-t-transparent" />
          <p className="text-sm">กำลังโหลดรายละเอียดกิจกรรม...</p>
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
            กลับไปดูกิจกรรมอื่น
          </NextLink>
        </div>

        <div className="grid gap-8 lg:grid-cols-[1.6fr_1fr]">
          <div className="space-y-6">
            <div className="overflow-hidden rounded-3xl border border-white/10 bg-white/5">
              <div className="relative h-[320px] w-full sm:h-[420px]">
                {coverImage ? (
                  <Image
                    fill
                    priority
                    alt={event.alt_text || event.title}
                    className="object-cover"
                    src={coverImage}
                    unoptimized={isExternalCover}
                  />
                ) : (
                  <div className="absolute inset-0 bg-linear-to-br from-indigo-500/30 via-sky-500/20 to-slate-900" />
                )}
                {relativeEventDate ? (
                  <span className="absolute left-6 top-6 rounded-full border border-white/20 bg-black/60 px-4 py-1 text-[11px] font-semibold uppercase text-white">
                    {relativeEventDate}
                  </span>
                ) : null}
              </div>
              <div className="space-y-4 px-6 py-6">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="space-y-2">
                    <p className="text-xs font-semibold uppercase text-white/45">
                      รายละเอียดกิจกรรม
                    </p>
                    <h1 className="text-3xl font-semibold text-white md:text-4xl">
                      {event.title}
                    </h1>
                  </div>
                  <span
                    className={`inline-flex items-center rounded-full px-4 py-1 text-[11px] font-semibold uppercase ${saleBadgeClass}`}
                  >
                    {saleStatus}
                  </span>
                </div>
                {descriptionParagraphs.length > 0 ? (
                  <p className="text-lg leading-8 text-white/70">
                    {descriptionParagraphs[0]}
                  </p>
                ) : (
                  <p className="text-lg leading-8 text-white/70">
                    กิจกรรมนี้ยังไม่มีคำบรรยายเพิ่มเติม
                    เราจะอัปเดตข้อมูลทันทีที่ได้รับจากผู้จัดงาน
                  </p>
                )}
              </div>
            </div>

            <div className="rounded-3xl border border-white/10 bg-white/5 px-6 py-6">
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="rounded-2xl border border-white/10 bg-white/4 px-4 py-3">
                  <p className="text-[11px] uppercase text-white/45">
                    วันและเวลา
                  </p>
                  <p className="mt-2 text-lg font-semibold text-white">
                    {formattedEventDate}
                  </p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/4 px-4 py-3">
                  <p className="text-[11px] uppercase text-white/45">
                    บัตรคงเหลือ
                  </p>
                  <p className="mt-2 text-lg font-semibold text-white">
                    {ticketsRemaining.toLocaleString("th-TH")} /{" "}
                    {event.total_tickets.toLocaleString("th-TH")} ใบ
                  </p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/4 px-4 py-3">
                  <p className="text-[11px] uppercase text-white/45">
                    ราคาต่อใบ
                  </p>
                  <p className="mt-2 text-lg font-semibold text-white">
                    {requiresPayment
                      ? `${formatCurrency(priceAsNumber)} บาท`
                      : "เข้าร่วมฟรี"}
                  </p>
                </div>
              </div>

              <div className="mt-6 space-y-3">
                <div>
                  <div className="flex items-center justify-between text-xs uppercase text-white/50">
                    <span>ยอดขายรวม</span>
                    <span>{ticketsProgress}%</span>
                  </div>
                  <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-white/10">
                    <div
                      className="h-full rounded-full bg-linear-to-r from-emerald-400 via-cyan-400 to-indigo-500"
                      style={{ width: `${ticketsProgress}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-white/10 bg-white/5 px-6 py-6">
              <h2 className="text-lg font-semibold text-white">
                ข้อมูลเพิ่มเติม
              </h2>
              <div className="mt-4 space-y-4 text-sm leading-7 text-white/70">
                {descriptionParagraphs.length > 1
                  ? descriptionParagraphs
                      .slice(1)
                      .map((paragraph, index) => <p key={index}>{paragraph}</p>)
                  : descriptionParagraphs.length === 0 && (
                      <p>
                        หากคุณต้องการรายละเอียดเพิ่มเติมเกี่ยวกับกิจกรรมนี้
                        กรุณาติดต่อผู้จัดงาน
                        หรือติดตามประกาศผ่านช่องทางโซเชียลมีเดียของเรา
                      </p>
                    )}
                <ul className="list-disc space-y-2 pl-5 text-white/60">
                  <li>
                    กรุณาชำระเงินภายใน 15 นาทีหลังจากกดสั่งซื้อ
                    เพื่อรักษาสิทธิ์ของคุณ
                  </li>
                </ul>
              </div>
            </div>
          </div>

          <aside className="space-y-6">
            <div className="rounded-3xl border border-white/12 bg-white/5 px-6 py-6">
              <h2 className="text-lg font-semibold text-white">
                ขั้นตอนการสั่งซื้อ
              </h2>
              <div className="mt-4 space-y-4">
                <p className="text-sm font-medium text-white/80">
                  เลือกจำนวนบัตรที่ต้องการ
                </p>
                <div className="flex items-center justify-between rounded-2xl border border-white/15 bg-black/20 px-3 py-2">
                  <button
                    className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/20 text-lg font-semibold text-white transition hover:border-white/40 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
                    disabled={isSoldOut || quantity <= 1}
                    type="button"
                    onClick={decreaseQuantity}
                  >
                    -
                  </button>
                  <span className="text-2xl font-semibold text-white">
                    {isSoldOut ? 0 : quantity}
                  </span>
                  <button
                    className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/20 text-lg font-semibold text-white transition hover:border-white/40 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
                    disabled={isSoldOut || quantity >= purchaseCap}
                    type="button"
                    onClick={increaseQuantity}
                  >
                    +
                  </button>
                </div>
                <p className="text-xs text-white/60">
                  {ticketsRemaining > 0
                    ? `ซื้อได้สูงสุด ${purchaseCap.toLocaleString("th-TH")} ใบ (เหลือ ${ticketsRemaining.toLocaleString(
                        "th-TH",
                      )} ใบ)`
                    : "จำหน่ายหมดแล้ว"}
                </p>
              </div>

              {requiresPayment ? (
                <div className="mt-4 rounded-2xl border border-emerald-400/30 bg-emerald-500/15 px-4 py-3 text-sm text-emerald-100">
                  ยอดชำระรวม{" "}
                  <span className="text-lg font-semibold text-white">
                    {formatCurrency(totalCost)} บาท
                  </span>
                </div>
              ) : (
                <div className="mt-4 rounded-2xl border border-amber-400/30 bg-amber-500/15 px-4 py-3 text-sm text-amber-100">
                  เข้าร่วมฟรี ไม่มีค่าใช้จ่าย
                </div>
              )}

              <button
                className="mt-6 inline-flex w-full items-center justify-center rounded-full border border-emerald-400/40 bg-emerald-500/20 px-5 py-3 text-sm font-semibold uppercase text-emerald-100 transition hover:border-emerald-300/70 hover:bg-emerald-500/30 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
                disabled={
                  isSubmitting ||
                  isSoldOut ||
                  !isEventActive ||
                  purchaseCap <= 0
                }
                type="button"
                onClick={handleCreateOrder}
              >
                {isSubmitting ? (
                  <span className="inline-flex items-center gap-2">
                    <InlineSpinner />
                    <span>กำลังส่งคำสั่งซื้อ...</span>
                  </span>
                ) : isSoldOut ? (
                  "จำหน่ายหมดแล้ว"
                ) : (
                  `ยืนยันการจอง ${quantity.toLocaleString("th-TH")} ใบ`
                )}
              </button>
            </div>
          </aside>
        </div>
      </section>
    </DefaultLayout>
  );
}

export const getServerSideProps: GetServerSideProps<EventPageProps> = async (
  context,
) => {
  const { eventId } = context.params ?? {};

  if (!eventId || Array.isArray(eventId)) {
    return { notFound: true };
  }

  const host = context.req.headers.host ?? "localhost:3000";
  const forwardedProto = context.req.headers["x-forwarded-proto"];
  const protocol = Array.isArray(forwardedProto)
    ? forwardedProto[0]
    : (forwardedProto ?? (host.includes("localhost") ? "http" : "https"));
  const baseUrl = (
    process.env.NEXT_PUBLIC_SITE_URL ?? `${protocol}://${host}`
  ).replace(/\/$/, "");

  try {
    const res = await fetch(`${baseUrl}/api/events/${eventId}`, {
      headers: { cookie: context.req.headers.cookie ?? "" },
      cache: "no-store",
    });

    if (res.status === 404) {
      return { notFound: true };
    }

    if (!res.ok) {
      throw new Error(`Failed to load event ${eventId}`);
    }

    const event = await res.json();

    return { props: { event } };
  } catch (error) {
    console.error("Event page SSR error:", error);

    return { props: { event: null } };
  }
};
