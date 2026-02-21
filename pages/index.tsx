import type { Event } from "@/components/events/EventCard";

import { GetServerSideProps } from "next";
import { signIn, useSession } from "@/lib/next-auth-react";
import { useRouter } from "next/router";
import { useCallback, useEffect, useMemo, useState } from "react";
import NextLink from "next/link";
import Image from "next/image";
import { format, formatDistanceToNow, parseISO } from "date-fns";
import { th } from "date-fns/locale";

import { resolveEventMedia } from "@/components/events/EventCard";
import { Navbar } from "@/components/shared/Navbar";
import { LoginRequiredModal } from "@/components/auth/LoginRequiredModal";
import { fontSans } from "@/config/fonts";

interface IndexPageProps {
  events: Event[];
  isBookingEnabled: boolean;
  bookingFee: number;
}

interface SliderEvent extends Event {
  dateObj: Date;
}

const parseEventDate = (value: string): Date | null => {
  if (!value) {
    return null;
  }

  try {
    const parsed = parseISO(value);

    return Number.isNaN(parsed.getTime()) ? null : parsed;
  } catch {
    return null;
  }
};

const formatDescription = (value?: string | null) => {
  if (!value) {
    return undefined;
  }

  const trimmed = value.trim();

  if (!trimmed) {
    return undefined;
  }

  return trimmed.length > 140 ? `${trimmed.slice(0, 140)}...` : trimmed;
};

const getPriceLabel = (price: Event["price"]) => {
  const numericPrice = Number(price);

  if (Number.isFinite(numericPrice) && numericPrice > 0) {
    return `THB ${numericPrice.toLocaleString("th-TH")}`;
  }

  return "Free entry";
};

const statusClassMap = {
  default: "border border-white/20 bg-white/10 text-white/80",
  active: "border border-emerald-400/50 bg-emerald-500/20 text-emerald-100",
  soldout: "border border-rose-400/50 bg-rose-500/20 text-rose-100",
} as const;

type EventStatusTheme = keyof typeof statusClassMap;

const getPendingTickets = (event: Event | SliderEvent) =>
  Number(event.pending_tickets ?? 0);

const getAvailableTickets = (event: Event | SliderEvent) => {
  if (
    typeof (event as Event & { available_tickets?: number })
      .available_tickets === "number"
  ) {
    return Math.max(
      Number(
        (event as Event & { available_tickets?: number }).available_tickets ??
          0,
      ),
      0,
    );
  }

  return Math.max(
    event.total_tickets - event.tickets_sold - getPendingTickets(event),
    0,
  );
};

const getEventStatus = (event: Event | SliderEvent) => {
  const ticketsRemaining = getAvailableTickets(event);
  const isSoldOut = ticketsRemaining <= 0;

  if (isSoldOut) {
    return {
      label: "à¸šà¸±à¸•à¸£à¸«à¸¡à¸”",
      theme: "soldout" as EventStatusTheme,
      ticketsRemaining,
    };
  }

  if (event.is_active) {
    return {
      label: "à¹€à¸›à¸´à¸”à¸‚à¸²à¸¢",
      theme: "active" as EventStatusTheme,
      ticketsRemaining,
    };
  }

  return {
    label: "à¸›à¸´à¸”à¸Šà¸±à¹ˆà¸§à¸„à¸£à¸²à¸§",
    theme: "soldout" as EventStatusTheme,
    ticketsRemaining,
  };
};

export default function IndexPage({
  events,
  isBookingEnabled,
  bookingFee,
}: IndexPageProps) {
  const { status } = useSession();
  const router = useRouter();
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);

  const isLoading = status === "loading";
  const isAuthenticated = status === "authenticated";

  const handlePrimaryAction = useCallback(() => {
    if (isAuthenticated) {
      router.push("/booking");

      return;
    }
    if (!isLoading) {
      setIsLoginModalOpen(true);
    }
  }, [isAuthenticated, isLoading, router]);

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.push("/profile");
    }
  }, [isAuthenticated, isLoading, router]);

  const sliderEvents = useMemo<SliderEvent[]>(() => {
    const parsed = events
      .map((event) => {
        const dateObj = parseEventDate(event.date);

        if (!dateObj) {
          return null;
        }

        return { ...event, dateObj };
      })
      .filter((event): event is SliderEvent => Boolean(event));

    if (parsed.length === 0) {
      return [];
    }

    const now = Date.now();
    const dayAgo = now - 24 * 60 * 60 * 1000;
    const upcoming = parsed.filter(
      (event) => event.dateObj.getTime() >= dayAgo,
    );

    const orderedSource = (upcoming.length > 0 ? upcoming : parsed).sort(
      (a, b) => a.dateObj.getTime() - b.dateObj.getTime(),
    );

    return orderedSource.slice(0, 6);
  }, [events]);

  if (isLoading || isAuthenticated) {
    return (
      <main
        className={`${fontSans.className} flex min-h-screen items-center justify-center text-white
          bg-black/40 backdrop-blur-md`}
      >
        <div aria-live="polite" className="flex flex-col items-center gap-3">
          <span className="inline-flex h-10 w-10 animate-spin rounded-full border-2 border-white/30 border-t-transparent" />
          <p className="text-sm text-white/70">à¸£à¸­à¹à¸›à¹Šà¸š à¸à¸³à¸¥à¸±à¸‡à¹‚à¸«à¸¥à¸”à¸‚à¹‰à¸­à¸¡à¸¹à¸¥!...</p>
        </div>
      </main>
    );
  }

  const sliderCount = sliderEvents.length;
  const heroPrimary = sliderEvents[0] ?? null;
  const totalRemainingTickets = sliderEvents.reduce(
    (acc, event) => acc + getEventStatus(event).ticketsRemaining,
    0,
  );

  const heroStats = heroPrimary
    ? [
        {
          label: "Upcoming Events",
          value: sliderCount.toString().padStart(2, "0"),
        },
        {
          label: "Tickets Remaining",
          value: totalRemainingTickets.toLocaleString("th-TH"),
        },
        {
          label: "Starting Price",
          value: getPriceLabel(heroPrimary.price),
        },
      ]
    : [
        {
          label: "Events Live",
          value: sliderCount.toString().padStart(2, "0"),
        },
        { label: "Weekly Refresh", value: "Weekly" },
        { label: "Concierge Support", value: "24/7" },
      ];

  const heroPrimaryDisplay = heroPrimary
    ? {
        formattedDate: format(heroPrimary.dateObj, "d MMM yyyy HH:mm", {
          locale: th,
        }),
        relativeDate: formatDistanceToNow(heroPrimary.dateObj, {
          locale: th,
          addSuffix: true,
        }),
        description: formatDescription(heroPrimary.description),
        price: getPriceLabel(heroPrimary.price),
        status: getEventStatus(heroPrimary),
        media: resolveEventMedia(heroPrimary.image_url),
      }
    : null;

  const heroSecondary = sliderEvents.slice(1, 3);
  const featuredEvents = sliderEvents.slice(0, 3);

  return (
    <main className={`${fontSans.className} min-h-screen text-primary`}>
      <Navbar />

      <div className="relative mx-auto max-w-7xl px-4 pt-24 md:pt-32 lg:px-8">
        <div className="pointer-events-none absolute -top-40 left-1/2 z-0 h-[520px] w-[1200px] -translate-x-1/2 bg-[radial-gradient(600px_circle_at_30%_20%,rgba(99,102,241,0.22),transparent_60%),radial-gradient(700px_circle_at_70%_0,rgba(45,212,191,0.18),transparent_65%)] opacity-80 blur-[100px] md:blur-[140px]" />

        <section className="relative z-10 mb-14 md:mb-20">
          <div className="relative mx-auto max-w-5xl overflow-hidden rounded-3xl border border-white/10 bg-zinc-900/40 p-8 shadow-2xl backdrop-blur-lg md:p-12">
            <div className="pointer-events-none absolute inset-0 [mask-image:radial-gradient(80%_80%_at_50%_0%,black,transparent)]">
              <div className="pointer-events-none absolute -top-28 left-1/2 h-56 w-[70%] -translate-x-1/2 rounded-full bg-[radial-gradient(closest-side,rgba(6,182,212,0.35),rgba(16,185,129,0.25),transparent_80%)] blur-2xl" />
            </div>

            <div className="pointer-events-none absolute inset-0 opacity-[0.06] [background:linear-gradient(0deg,transparent_24px,rgba(255,255,255,0.12)_25px),linear-gradient(90deg,transparent_24px,rgba(255,255,255,0.12)_25px)] [background-size:25px_25px]" />

            <div className="relative z-10 flex flex-col items-center text-center">
              <span
                className={[
                  "inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-[13px] font-semibold",
                  isBookingEnabled
                    ? "border-emerald-400/40 bg-emerald-500/12 text-emerald-200"
                    : "border-rose-400/40 bg-rose-500/12 text-rose-200",
                ].join(" ")}
              >
                <span
                  className={[
                    "h-2.5 w-2.5 rounded-full",
                    isBookingEnabled ? "bg-emerald-400" : "bg-rose-400",
                  ].join(" ")}
                />
                {isBookingEnabled
                  ? "à¸à¸²à¸£à¸ˆà¸­à¸‡à¹‚à¸•à¹Šà¸°à¸–à¸¹à¸à¹€à¸›à¸´à¸”à¸­à¸¢à¸¹à¹ˆ"
                  : "à¸à¸²à¸£à¸ˆà¸­à¸‡à¹‚à¸•à¹Šà¸°à¸–à¸¹à¸à¸›à¸´à¸”à¸­à¸¢à¸¹à¹ˆ"}
              </span>

              <h1 className="mt-6 max-w-3xl text-balance text-4xl font-extrabold text-white sm:text-5xl lg:text-6xl">
                à¸ˆà¸­à¸‡à¹‚à¸•à¹Šà¸°à¸‚à¸­à¸‡à¸„à¸¸à¸“à¸¥à¹ˆà¸§à¸‡à¸«à¸™à¹‰à¸²
              </h1>

              <p className="mt-5 max-w-2xl text-pretty text-base leading-7 text-white/70 sm:text-lg sm:leading-8">
                à¹‚à¸•à¹Šà¸°à¸”à¸µà¸¡à¸µà¹„à¸¡à¹ˆà¸¡à¸²à¸ à¸ˆà¸­à¸‡à¸•à¸­à¸™à¸™à¸µà¹‰à¹€à¸¥à¸¢ à¸ˆà¸°à¹„à¸”à¹‰à¹„à¸¡à¹ˆà¸žà¸¥à¸²à¸”à¸„à¸·à¸™à¸žà¸´à¹€à¸¨à¸©à¸ªà¸¸à¸”à¸¡à¸±à¸™à¸ªà¹Œ ðŸ˜ŽðŸŽ¶
              </p>
              <div className="mt-8 flex w-full flex-col items-center justify-center gap-3 sm:mt-10 sm:flex-row">
                <button
                  className={[
                    "w-full sm:w-auto rounded-full px-7 py-3 text-base font-semibold",
                    "border border-emerald-400/40 bg-emerald-500/15 text-emerald-100",
                    "backdrop-blur-sm shadow-[0_8px_30px_-10px_rgba(16,185,129,0.25)]",
                    "transition-all duration-300 hover:bg-emerald-500/25 hover:shadow-[0_14px_40px_-10px_rgba(16,185,129,0.35)]",
                    "disabled:cursor-not-allowed disabled:opacity-60",
                  ].join(" ")}
                  disabled={!isBookingEnabled}
                  type="button"
                  onClick={handlePrimaryAction}
                >
                  {isBookingEnabled ? "à¸ˆà¸­à¸‡à¹‚à¸•à¹Šà¸°à¹€à¸¥à¸¢" : "à¸›à¸´à¸”à¸£à¸±à¸šà¸ˆà¸­à¸‡à¸Šà¸±à¹ˆà¸§à¸„à¸£à¸²à¸§"}
                </button>

                <NextLink
                  className={[
                    "w-full sm:w-auto rounded-full px-7 py-3 text-base font-semibold",
                    "border border-white/15 bg-white/5 text-white/85",
                    "transition-colors duration-200 hover:border-white/25 hover:bg-white/[0.08]",
                  ].join(" ")}
                  href="/events"
                >
                  à¸”à¸¹à¸­à¸µà¹€à¸§à¸™à¸•à¹Œ
                </NextLink>
              </div>

              {bookingFee > 0 && isBookingEnabled && (
                <p className="mt-5 text-sm text-white/50">
                  *à¸¡à¸µà¸„à¹ˆà¸²à¸˜à¸£à¸£à¸¡à¹€à¸™à¸µà¸¢à¸¡à¸à¸²à¸£à¸ˆà¸­à¸‡ {bookingFee.toLocaleString("th-TH")} à¸šà¸²à¸—
                </p>
              )}
            </div>
          </div>
        </section>
      </div>

      <div className="mx-auto max-w-7xl px-4 pb-12 pt-20 lg:px-8">
        <div className="relative z-0">
          <section className="space-y-8">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase text-emerald-300">
                  à¸­à¸µà¹€à¸§à¹‰à¸™à¸•à¹Œà¸—à¸µà¹ˆà¸à¸³à¸¥à¸±à¸‡à¸ˆà¸°à¹€à¸à¸´à¸”à¸‚à¸¶à¹‰à¸™
                </p>
                <h2 className="mt-2 text-3xl font-semibold text-white md:text-4xl">
                  à¸«à¹‰à¸²à¸¡à¸žà¸¥à¸²à¸”
                </h2>
              </div>
              <NextLink
                className="inline-flex items-center gap-2 rounded-full border border-white/20 px-5 py-2 text-sm font-semibold text-white/80 transition hover:border-white/35 hover:bg-white/10 hover:text-white"
                href="/events"
              >
                à¸”à¸¹à¸­à¸µà¹€à¸§à¸™à¸•à¹Œà¸—à¸±à¹‰à¸‡à¸«à¸¡à¸”
              </NextLink>
            </div>

            {featuredEvents.length > 0 ? (
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {featuredEvents.map((event) => {
                  const cardDate = format(event.dateObj, "d MMM yyyy HH:mm", {
                    locale: th,
                  });
                  const cardDescription = formatDescription(event.description);
                  const {
                    label: statusLabel,
                    theme: statusTheme,
                    ticketsRemaining,
                  } = getEventStatus(event);
                  const badgeClass = statusClassMap[statusTheme];
                  const { src: coverSrc, isExternal } = resolveEventMedia(
                    event.image_url,
                  );

                  return (
                    <article
                      key={event.id}
                      className="group relative flex h-full flex-col overflow-hidden rounded-[28px] border border-white/10 bg-zinc-950/70 p-1.5 backdrop-blur-xl transition duration-300 "
                    >
                      <div className="relative h-56 overflow-hidden rounded-[22px] bg-zinc-800">
                        {coverSrc ? (
                          <Image
                            fill
                            alt={event.alt_text || event.title}
                            className="object-cover opacity-80 transition duration-500 ease-out group-hover:scale-105 group-hover:opacity-100"
                            sizes="(min-width: 1024px) 33vw, (min-width: 768px) 50vw, 100vw"
                            src={coverSrc}
                            unoptimized={isExternal}
                          />
                        ) : (
                          <div className="absolute inset-0 bg-linear-to-br from-sky-500/30 via-indigo-500/20 to-slate-900" />
                        )}
                        <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-3 bg-linear-to-t from-black/90 via-black/40 to-transparent px-4 pb-4 pt-12 text-white/80">
                          <span
                            className={`inline-flex items-center rounded-full px-3 py-1 text-[11px] font-semibold uppercase ${badgeClass}`}
                          >
                            {statusLabel}
                          </span>
                          <span className="text-[11px] font-semibold uppercase">
                            {ticketsRemaining.toLocaleString("th-TH")} left
                          </span>
                        </div>
                      </div>

                      <div className="flex flex-1 flex-col gap-4 p-5 text-white/80">
                        <div className="space-y-1.5">
                          <h3 className="text-lg font-semibold text-white/90 transition-colors duration-300 group-hover:text-emerald-400">
                            {event.title}
                          </h3>
                          <p className="text-sm text-white/60">{cardDate}</p>
                        </div>
                        <p className="flex-1 text-sm leading-relaxed text-white/70">
                          {cardDescription ?? ""}
                        </p>
                        <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-[11px] font-semibold uppercase text-white/70">
                          <span>{getPriceLabel(event.price)}</span>
                          <span>
                            à¸„à¸‡à¹€à¸«à¸¥à¸·à¸­ {ticketsRemaining.toLocaleString("th-TH")}{" "}
                            à¸šà¸±à¸•à¸£
                          </span>
                        </div>
                        <NextLink
                          className="inline-flex items-center justify-center gap-2 rounded-full border border-white/20 bg-white/5 px-4 py-2.5 text-sm font-semibold text-white/85 transition hover:border-white/40 hover:bg-white/10 hover:text-white"
                          href={`/events/${event.id}`}
                        >
                          à¸‹à¸·à¹‰à¸­à¸šà¸±à¸•à¸£
                        </NextLink>
                      </div>
                    </article>
                  );
                })}
              </div>
            ) : (
              <div className="rounded-3xl border border-dashed border-white/20 bg-white/5 px-6 py-14 text-center text-white/70">
                <p className="text-sm">
                  No featured highlights yet. Add events via the dashboard to
                  populate this section.
                </p>
              </div>
            )}
          </section>
        </div>
      </div>

      <LoginRequiredModal
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
        onLogin={() => {
          setIsLoginModalOpen(false);
          signIn("line");
        }}
      />
    </main>
  );
}

export const getServerSideProps: GetServerSideProps<IndexPageProps> = async ({
  req,
}) => {
  const fProto = (req.headers["x-forwarded-proto"] as string | undefined)
    ?.split(",")[0]
    ?.trim();
  const fHost = (req.headers["x-forwarded-host"] as string | undefined)
    ?.split(",")[0]
    ?.trim();
  const host =
    fHost || req.headers.host || `127.0.0.1:${process.env.PORT ?? "3000"}`;
  const isEncrypted = (req.socket as any)?.encrypted === true;
  const protocol = fProto || (isEncrypted ? "https" : "http");
  const origin = (
    process.env.NEXT_PUBLIC_SITE_URL || `${protocol}://${host}`
  ).replace(/\/$/, "");
  const cookie = req.headers.cookie ?? "";

  try {
    const [eventsRes, bookingStatusRes] = await Promise.all([
      fetch(`${origin}/api/slider-images`, {
        headers: { cookie },
        cache: "no-store",
      }),
      fetch(`${origin}/api/booking-status`, {
        headers: { cookie },
        cache: "no-store",
      }),
    ]);

    const eventsData = eventsRes.ok ? await eventsRes.json() : [];
    const events = Array.isArray(eventsData) ? eventsData : [];

    const bookingStatusData = bookingStatusRes.ok
      ? await bookingStatusRes.json()
      : { isBookingEnabled: false, bookingFee: 0 };

    return {
      props: {
        events,
        isBookingEnabled: bookingStatusData.isBookingEnabled ?? false,
        bookingFee: bookingStatusData.bookingFee ?? 0,
      },
    };
  } catch (error) {
    console.error("Failed to fetch data for index page:", error);

    return { props: { events: [], isBookingEnabled: false, bookingFee: 0 } };
  }
};

