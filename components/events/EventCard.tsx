import NextLink from "next/link";
import { useMemo } from "react";
import { Card, CardBody, CardFooter } from "@heroui/card";
import { Chip} from "@heroui/react";
import { Badge } from "@heroui/badge";
import { format, parseISO } from "date-fns";

export interface Event {
  id: string;
  title: string;
  description: string | null;
  date: string;
  image_url: string | null;
  alt_text: string | null;
  price: number;
  total_tickets: number;
  tickets_sold: number;
  pending_tickets: number | null;
  is_active: boolean;
}

type EventStatusTheme = "default" | "active" | "soldout" | "past";

export const resolveEventMedia = (src?: string | null) => {
  if (!src) return { src: null as string | null, isExternal: false };
  const trimmed = src.trim();

  if (!trimmed) return { src: null as string | null, isExternal: false };

  const normalized = trimmed.replace(/\\/g, "/");

  if (/^https?:\/\//i.test(normalized)) {
    return { src: normalized, isExternal: true };
  }

  if (normalized.startsWith("//")) {
    return { src: `https:${normalized}`, isExternal: true };
  }

  const withLeadingSlash = normalized.startsWith("/")
    ? normalized
    : `/${normalized}`;

  return { src: withLeadingSlash, isExternal: false };
};

const getPriceLabel = (price: number) => {
  const numericPrice = Number(price);

  if (Number.isFinite(numericPrice) && numericPrice > 0) {
    return `ราคา ${numericPrice.toLocaleString("th-TH")} บาท`;
  }

  return "Free entry";
};

const getPendingTickets = (event: Event) => Number(event.pending_tickets ?? 0);

const getAvailableTickets = (event: Event) => {
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

const getEventStatus = (event: Event, isPast: boolean) => {
  if (isPast) {
    return {
      label: "Past event",
      theme: "past" as EventStatusTheme,
      ticketsRemaining: 0,
    };
  }

  const ticketsRemaining = getAvailableTickets(event);
  const isSoldOut = ticketsRemaining <= 0;

  if (isSoldOut) {
    return {
      label: "หมด",
      theme: "soldout" as EventStatusTheme,
      ticketsRemaining,
    };
  }

  if (event.is_active) {
    return {
      label: "เปิดขาย",
      theme: "active" as EventStatusTheme,
      ticketsRemaining,
    };
  }

  return {
    label: "เร็วๆนี้",
    theme: "default" as EventStatusTheme,
    ticketsRemaining,
  };
};

const parseEventDate = (value: string): Date | null => {
  if (!value) return null;
  try {
    const parsed = parseISO(value);

    return Number.isNaN(parsed.getTime()) ? null : parsed;
  } catch {
    return null;
  }
};

const formatDescription = (value?: string | null) => {
  if (!value) return null;
  const trimmed = value.trim();

  if (!trimmed) return null;

  return trimmed.length > 100 ? `${trimmed.slice(0, 100)}…` : trimmed;
};

const statusBadgeMap: Record<
  EventStatusTheme,
  { color: "default" | "success" | "danger"; text: string }
> = {
  default: { color: "default", text: "เร็วๆนี้" },
  active: { color: "success", text: "เปิดขาย" },
  soldout: { color: "danger", text: "หมด" },
  past: { color: "default", text: "ที่ผ่านมา" },
};

interface EventCardProps {
  event: any;
  isPast?: boolean;
}

export function EventCard({ event, isPast = false }: EventCardProps) {
  const preferredImage =
    event.image_url ??
    event.image ??
    event.imageUrl ??
    event.cover ??
    null;
  const { src: coverSrc } = resolveEventMedia(preferredImage);
  const eventDate = useMemo(() => parseEventDate(event.date), [event.date]);
  const formattedDate = useMemo(() => {
    if (!eventDate) return "Date to be announced";

    return format(eventDate, "d MMM yyyy HH:mm");
  }, [eventDate]);

  const { theme, ticketsRemaining } = useMemo(
    () => getEventStatus(event, isPast),
    [event, isPast],
  );
  const statusConfig = statusBadgeMap[theme];
  const shortDescription =
    formatDescription(event.description) ??
    "รายละเอียดกิจกรรมจะถูกอัปเดตในเร็ว ๆ นี้";

  return (
    <Card
      isHoverable
      isPressable
      as={NextLink}
      className="group h-full overflow-hidden rounded-2xl"
      href={`/events/${event.id}`}
    >
      <CardBody className="p-0">
        <div className="relative w-full aspect-[16/9] overflow-hidden">
          {coverSrc ? (
            <img
              alt={event.alt_text || event.title}
              className="absolute h-full w-full select-none object-cover"
              loading="lazy"
              src={coverSrc}
            />
          ) : (
            <div className="absolute inset-0 bg-linear-to-br from-sky-500/30 via-indigo-500/20 to-slate-900" />
          )}
<div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-center justify-between gap-3 bg-gradient-to-t from-black/90 via-black/40 to-transparent px-4 pb-4 pt-12">
  {/* สถานะอีเว้นต์ */}
  <Chip
    radius="full"
    variant="flat"
    className={[
      "text-xs font-semibold uppercase",
      "bg-emerald-500/15 text-emerald-200",
      "border border-emerald-400/40",
    ].join(" ")}
  >
    {statusConfig.text}
  </Chip>

  {/* จำนวนบัตรคงเหลือ */}
  {!isPast ? (
    <Chip
      radius="full"
      variant="flat"
      className="
        text-xs font-semibold uppercase
        bg-white/10 text-white/80
        border border-white/20
      "
    >
      {ticketsRemaining.toLocaleString("th-TH")} เหลือ
    </Chip>
  ) : null}
</div>

        </div>
      </CardBody>

      <CardFooter className="mt-auto flex w-full flex-col items-start gap-4">
        <div className="flex-1 space-y-1.5 min-w-0">
          <h3 className="text-lg font-semibold text-white line-clamp-2 break-words">
            {event.title}
          </h3>
          <p className="text-sm text-white/60">{formattedDate}</p>
          <p className="pt-2 text-sm leading-relaxed text-white/70 line-clamp-3">
            {shortDescription}
          </p>
        </div>

        <div className="flex w-full items-center justify-between">
          <span className="text-base font-semibold text-white/90">
            {getPriceLabel(event.price)}
          </span>
          <span className="inline-flex items-center rounded-full border border-white/20 px-3 py-1 text-xs font-semibold uppercase text-white/70">
            ดูรายละเอียด
          </span>
        </div>
      </CardFooter>
    </Card>
  );
}
