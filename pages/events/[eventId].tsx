import type { GetServerSideProps } from "next";

import NextLink from "next/link";
import Image from "next/image";
import { useCallback, useMemo, useState } from "react";
import { useRouter } from "next/router";
import { useSession, signIn } from "@/lib/next-auth-react";
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
        ? format(eventDate, "EEEE à¸—à¸µà¹ˆ d MMMM yyyy HH:mm à¸™.", { locale: th })
        : "à¸à¸³à¸«à¸™à¸”à¸à¸²à¸£à¸ˆà¸°à¹à¸ˆà¹‰à¸‡à¹ƒà¸«à¹‰à¸—à¸£à¸²à¸š",
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
      return "à¹„à¸¡à¹ˆà¸¡à¸µà¸‚à¹‰à¸­à¸¡à¸¹à¸¥à¸ªà¸–à¸²à¸™à¸°à¸ˆà¸³à¸«à¸™à¹ˆà¸²à¸¢";
    }
    if (isSoldOut) {
      return "à¸ˆà¸³à¸«à¸™à¹ˆà¸²à¸¢à¸«à¸¡à¸”à¹à¸¥à¹‰à¸§";
    }
    if (!isEventActive) {
      return "à¸¢à¸±à¸‡à¹„à¸¡à¹ˆà¹€à¸›à¸´à¸”à¸ˆà¸³à¸«à¸™à¹ˆà¸²à¸¢";
    }

    return "à¸à¸³à¸¥à¸±à¸‡à¸ˆà¸³à¸«à¸™à¹ˆà¸²à¸¢";
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
        throw new Error(data.message || "à¹„à¸¡à¹ˆà¸ªà¸²à¸¡à¸²à¸£à¸–à¸ªà¸£à¹‰à¸²à¸‡à¸„à¸³à¸ªà¸±à¹ˆà¸‡à¸‹à¸·à¹‰à¸­à¹„à¸”à¹‰à¹ƒà¸™à¸‚à¸“à¸°à¸™à¸µà¹‰");
      }

      if (!data.requiresPayment || data.status === "paid") {
        alert("à¸¢à¸·à¸™à¸¢à¸±à¸™à¸„à¸³à¸ªà¸±à¹ˆà¸‡à¸‹à¸·à¹‰à¸­à¹€à¸£à¸µà¸¢à¸šà¸£à¹‰à¸­à¸¢à¹à¸¥à¹‰à¸§ à¹€à¸£à¸²à¸ˆà¸°à¸žà¸²à¸„à¸¸à¸“à¹„à¸›à¸¢à¸±à¸‡à¸«à¸™à¹‰à¸²à¸šà¸±à¸•à¸£à¸—à¸±à¸™à¸—à¸µ");
        router.push("/profile/tickets");

        return;
      }

      router.push(`/events/order/${data.orderId}`);
    } catch (error: any) {
      alert(`à¹€à¸à¸´à¸”à¸‚à¹‰à¸­à¸œà¸´à¸”à¸žà¸¥à¸²à¸”: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!event) {
    return (
      <DefaultLayout>
        <div className="flex h-[calc(100vh-160px)] flex-col items-center justify-center gap-3 text-muted">
          <span className="inline-flex h-12 w-12 animate-spin rounded-full border-2 border-white/30 border-t-transparent" />
          <p className="text-sm">à¸à¸³à¸¥à¸±à¸‡à¹‚à¸«à¸¥à¸”à¸£à¸²à¸¢à¸¥à¸°à¹€à¸­à¸µà¸¢à¸”à¸à¸´à¸ˆà¸à¸£à¸£à¸¡...</p>
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
            à¸à¸¥à¸±à¸šà¹„à¸›à¸”à¸¹à¸à¸´à¸ˆà¸à¸£à¸£à¸¡à¸­à¸·à¹ˆà¸™
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
                      à¸£à¸²à¸¢à¸¥à¸°à¹€à¸­à¸µà¸¢à¸”à¸à¸´à¸ˆà¸à¸£à¸£à¸¡
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
                    à¸à¸´à¸ˆà¸à¸£à¸£à¸¡à¸™à¸µà¹‰à¸¢à¸±à¸‡à¹„à¸¡à¹ˆà¸¡à¸µà¸„à¸³à¸šà¸£à¸£à¸¢à¸²à¸¢à¹€à¸žà¸´à¹ˆà¸¡à¹€à¸•à¸´à¸¡
                    à¹€à¸£à¸²à¸ˆà¸°à¸­à¸±à¸›à¹€à¸”à¸•à¸‚à¹‰à¸­à¸¡à¸¹à¸¥à¸—à¸±à¸™à¸—à¸µà¸—à¸µà¹ˆà¹„à¸”à¹‰à¸£à¸±à¸šà¸ˆà¸²à¸à¸œà¸¹à¹‰à¸ˆà¸±à¸”à¸‡à¸²à¸™
                  </p>
                )}
              </div>
            </div>

            <div className="rounded-3xl border border-white/10 bg-white/5 px-6 py-6">
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="rounded-2xl border border-white/10 bg-white/4 px-4 py-3">
                  <p className="text-[11px] uppercase text-white/45">
                    à¸§à¸±à¸™à¹à¸¥à¸°à¹€à¸§à¸¥à¸²
                  </p>
                  <p className="mt-2 text-lg font-semibold text-white">
                    {formattedEventDate}
                  </p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/4 px-4 py-3">
                  <p className="text-[11px] uppercase text-white/45">
                    à¸šà¸±à¸•à¸£à¸„à¸‡à¹€à¸«à¸¥à¸·à¸­
                  </p>
                  <p className="mt-2 text-lg font-semibold text-white">
                    {ticketsRemaining.toLocaleString("th-TH")} /{" "}
                    {event.total_tickets.toLocaleString("th-TH")} à¹ƒà¸š
                  </p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/4 px-4 py-3">
                  <p className="text-[11px] uppercase text-white/45">
                    à¸£à¸²à¸„à¸²à¸•à¹ˆà¸­à¹ƒà¸š
                  </p>
                  <p className="mt-2 text-lg font-semibold text-white">
                    {requiresPayment
                      ? `${formatCurrency(priceAsNumber)} à¸šà¸²à¸—`
                      : "à¹€à¸‚à¹‰à¸²à¸£à¹ˆà¸§à¸¡à¸Ÿà¸£à¸µ"}
                  </p>
                </div>
              </div>

              <div className="mt-6 space-y-3">
                <div>
                  <div className="flex items-center justify-between text-xs uppercase text-white/50">
                    <span>à¸¢à¸­à¸”à¸‚à¸²à¸¢à¸£à¸§à¸¡</span>
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
                à¸‚à¹‰à¸­à¸¡à¸¹à¸¥à¹€à¸žà¸´à¹ˆà¸¡à¹€à¸•à¸´à¸¡
              </h2>
              <div className="mt-4 space-y-4 text-sm leading-7 text-white/70">
                {descriptionParagraphs.length > 1
                  ? descriptionParagraphs
                      .slice(1)
                      .map((paragraph, index) => <p key={index}>{paragraph}</p>)
                  : descriptionParagraphs.length === 0 && (
                      <p>
                        à¸«à¸²à¸à¸„à¸¸à¸“à¸•à¹‰à¸­à¸‡à¸à¸²à¸£à¸£à¸²à¸¢à¸¥à¸°à¹€à¸­à¸µà¸¢à¸”à¹€à¸žà¸´à¹ˆà¸¡à¹€à¸•à¸´à¸¡à¹€à¸à¸µà¹ˆà¸¢à¸§à¸à¸±à¸šà¸à¸´à¸ˆà¸à¸£à¸£à¸¡à¸™à¸µà¹‰
                        à¸à¸£à¸¸à¸“à¸²à¸•à¸´à¸”à¸•à¹ˆà¸­à¸œà¸¹à¹‰à¸ˆà¸±à¸”à¸‡à¸²à¸™
                        à¸«à¸£à¸·à¸­à¸•à¸´à¸”à¸•à¸²à¸¡à¸›à¸£à¸°à¸à¸²à¸¨à¸œà¹ˆà¸²à¸™à¸Šà¹ˆà¸­à¸‡à¸—à¸²à¸‡à¹‚à¸‹à¹€à¸Šà¸µà¸¢à¸¥à¸¡à¸µà¹€à¸”à¸µà¸¢à¸‚à¸­à¸‡à¹€à¸£à¸²
                      </p>
                    )}
                <ul className="list-disc space-y-2 pl-5 text-white/60">
                  <li>
                    à¸à¸£à¸¸à¸“à¸²à¸Šà¸³à¸£à¸°à¹€à¸‡à¸´à¸™à¸ à¸²à¸¢à¹ƒà¸™ 15 à¸™à¸²à¸—à¸µà¸«à¸¥à¸±à¸‡à¸ˆà¸²à¸à¸à¸”à¸ªà¸±à¹ˆà¸‡à¸‹à¸·à¹‰à¸­
                    à¹€à¸žà¸·à¹ˆà¸­à¸£à¸±à¸à¸©à¸²à¸ªà¸´à¸—à¸˜à¸´à¹Œà¸‚à¸­à¸‡à¸„à¸¸à¸“
                  </li>
                </ul>
              </div>
            </div>
          </div>

          <aside className="space-y-6">
            <div className="rounded-3xl border border-white/12 bg-white/5 px-6 py-6">
              <h2 className="text-lg font-semibold text-white">
                à¸‚à¸±à¹‰à¸™à¸•à¸­à¸™à¸à¸²à¸£à¸ªà¸±à¹ˆà¸‡à¸‹à¸·à¹‰à¸­
              </h2>
              <div className="mt-4 space-y-4">
                <p className="text-sm font-medium text-white/80">
                  à¹€à¸¥à¸·à¸­à¸à¸ˆà¸³à¸™à¸§à¸™à¸šà¸±à¸•à¸£à¸—à¸µà¹ˆà¸•à¹‰à¸­à¸‡à¸à¸²à¸£
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
                    ? `à¸‹à¸·à¹‰à¸­à¹„à¸”à¹‰à¸ªà¸¹à¸‡à¸ªà¸¸à¸” ${purchaseCap.toLocaleString("th-TH")} à¹ƒà¸š (à¹€à¸«à¸¥à¸·à¸­ ${ticketsRemaining.toLocaleString(
                        "th-TH",
                      )} à¹ƒà¸š)`
                    : "à¸ˆà¸³à¸«à¸™à¹ˆà¸²à¸¢à¸«à¸¡à¸”à¹à¸¥à¹‰à¸§"}
                </p>
              </div>

              {requiresPayment ? (
                <div className="mt-4 rounded-2xl border border-emerald-400/30 bg-emerald-500/15 px-4 py-3 text-sm text-emerald-100">
                  à¸¢à¸­à¸”à¸Šà¸³à¸£à¸°à¸£à¸§à¸¡{" "}
                  <span className="text-lg font-semibold text-white">
                    {formatCurrency(totalCost)} à¸šà¸²à¸—
                  </span>
                </div>
              ) : (
                <div className="mt-4 rounded-2xl border border-amber-400/30 bg-amber-500/15 px-4 py-3 text-sm text-amber-100">
                  à¹€à¸‚à¹‰à¸²à¸£à¹ˆà¸§à¸¡à¸Ÿà¸£à¸µ à¹„à¸¡à¹ˆà¸¡à¸µà¸„à¹ˆà¸²à¹ƒà¸Šà¹‰à¸ˆà¹ˆà¸²à¸¢
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
                    <span>à¸à¸³à¸¥à¸±à¸‡à¸ªà¹ˆà¸‡à¸„à¸³à¸ªà¸±à¹ˆà¸‡à¸‹à¸·à¹‰à¸­...</span>
                  </span>
                ) : isSoldOut ? (
                  "à¸ˆà¸³à¸«à¸™à¹ˆà¸²à¸¢à¸«à¸¡à¸”à¹à¸¥à¹‰à¸§"
                ) : (
                  `à¸¢à¸·à¸™à¸¢à¸±à¸™à¸à¸²à¸£à¸ˆà¸­à¸‡ ${quantity.toLocaleString("th-TH")} à¹ƒà¸š`
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

