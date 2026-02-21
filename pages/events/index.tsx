// pages/events.tsx
import type { GetServerSideProps } from "next";
import { useRouter } from "next/router";
import { useMemo } from "react";
import { addDays, parseISO } from "date-fns";
import {
  Card, CardBody, CardHeader, Chip, Divider, Input, Select, SelectItem, Button,
} from "@heroui/react";

import DefaultLayout from "@/layouts/default";
import { EventCard, type Event } from "@/components/events/EventCard";

type ExtendedEvent = Event & {
  dateISO?: Date;
  // เพิ่ม field เผื่อ EventCard ต้องการ image แบบมาตรฐาน
  image?: string;
  imageUrl?: string;
  cover?: string;
};

interface EventsPageProps {
  events: ExtendedEvent[];
}

const getPendingTickets = (event: Event) => Number(event.pending_tickets ?? 0);

const getAvailableTickets = (event: Event) => {
  if (typeof (event as Event & { available_tickets?: number }).available_tickets === "number") {
    return Math.max(Number((event as Event & { available_tickets?: number }).available_tickets ?? 0), 0);
  }
  return Math.max(event.total_tickets - event.tickets_sold - getPendingTickets(event), 0);
};

export default function EventsPage({ events }: EventsPageProps) {
  const router = useRouter();

  const sortedEvents = useMemo<ExtendedEvent[]>(() => {
    return [...events]
      .map((e) => {
        let d: Date | undefined = undefined;
        if (e.date) {
          const parsed = parseISO(e.date as unknown as string);
          if (!isNaN(parsed.getTime())) d = parsed;
        }
        return { ...e, dateISO: d };
      })
      .filter((e) => e.dateISO) // กันวันที่ไม่ถูกต้อง
      .sort((a, b) => (a.dateISO!.getTime() - b.dateISO!.getTime()));
  }, [events]);

  const now = new Date();
  const upcomingEvents = useMemo(() => {
    const threshold = addDays(now, -1).getTime();
    return sortedEvents.filter((e) => (e.dateISO?.getTime() ?? 0) >= threshold);
  }, [sortedEvents, now]);

  const availableCount = useMemo(
    () => upcomingEvents.filter((e) => e.is_active && getAvailableTickets(e) > 0).length,
    [upcomingEvents],
  );

  return (
    <DefaultLayout>
      <section className="mx-auto mt-12 w-full max-w-6xl px-4 pb-16 sm:px-6">
        <Card className="rounded-3xl border border-white/10 bg-black/30 shadow-2xl backdrop-blur-xl">
          <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-2xl font-semibold text-white">อีเว้นต์ทั้งหมด</h1>
                <Chip
                  className="text-xs font-semibold uppercase bg-emerald-500/15 text-emerald-200 border border-emerald-400/40"
                  radius="full"
                  variant="flat"
                >
                  จำหน่ายบัตร {availableCount.toLocaleString("th-TH")} อีเว้นต์
                </Chip>
              </div>
              <p className="text-sm text-white/70">
                อีเว้นต์{" "}
                <span className="font-semibold text-white">
                  {upcomingEvents.length.toLocaleString("th-TH")}
                </span>{" "}
                ที่กำลังจะมาถึง
              </p>
            </div>

            <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
            <Input
              aria-label="ค้นหาอีเว้นต์"
              className="min-w-[220px]"
              classNames={{
                inputWrapper:
                  "bg-transparent border-white/20 hover:border-white/30 focus:border-transparent focus:ring-0 data-[hover=true]:bg-transparent data-[focus-visible=true]:outline-none",
                input: "text-white placeholder:text-white/50",
              }}
              placeholder="ค้นหาอีเว้นต์..."
              radius="full"
              size="sm"
              startContent={<span className="i-lucide-search text-white/60" />}
              variant="bordered"
            />
              <Select
                aria-label="เรียงลำดับ"
                className="min-w-[160px]"
                placeholder="เรียงลำดับ"
                radius="full"
                size="sm"
                variant="bordered"
              >
                <SelectItem key="latest">ล่าสุด</SelectItem>
                <SelectItem key="soonest">ใกล้จะถึง</SelectItem>
                <SelectItem key="name">ตามชื่อ</SelectItem>
              </Select>
            </div>
          </CardHeader>

          <Divider className="mx-6 bg-white/10" />

          <CardBody>
            {upcomingEvents.length > 0 ? (
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {upcomingEvents.map(({ dateISO, ...event }) => (
                  <div
                    key={event.id}
                    className="rounded-2xl border border-white/10 bg-white/5 p-1 transition hover:scale-[1.01] hover:border-white/20"
                  >
                    <EventCard event={{ ...event, image: event.image || event.imageUrl || event.cover }} />
                  </div>
                ))}
              </div>
            ) : (
              <Card className="rounded-3xl border border-dashed border-white/15 bg-white/5">
                <CardBody className="flex flex-col items-center gap-4 py-12 text-center text-white/70">
                  <svg className="h-10 w-10 text-white/40" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                    <path d="M8 7V3m8 4V3M3 9h18M5 9v9a3 3 0 0 0 3 3h8a3 3 0 0 0 3-3V9" />
                    <path d="M7.5 13h9M7.5 17h6" />
                  </svg>
                  <h2 className="text-lg font-semibold text-white">ยังไม่มีอีเว้นต์ที่จะมาถึงตอนนี้</h2>
                  <p className="max-w-md text-sm">
                    เราเพิ่มอีเว้นต์ใหม่อยู่เรื่อย ๆ โปรดกลับมาตรวจสอบอีกครั้ง หรือกดรีเฟรชหน้าเพื่ออัปเดตล่าสุด
                  </p>
                  <div className="mt-2 flex flex-col gap-2 sm:flex-row">
                    <Button
                      className="border border-white/15 bg-white/10 text-white hover:bg-white/15"
                      radius="full"
                      variant="flat"
                      onClick={() => location.reload()}
                    >
                      รีเฟรชรายการ
                    </Button>
                    <Button
                      className="border-white/25 text-white/80 hover:text-white"
                      radius="full"
                      variant="bordered"
                      onClick={() => router.push("/")}
                    >
                      กลับหน้าแรก
                    </Button>
                  </div>
                </CardBody>
              </Card>
            )}
          </CardBody>
        </Card>
      </section>
    </DefaultLayout>
  );
}

export const getServerSideProps: GetServerSideProps<EventsPageProps> = async (context) => {
  const host = context.req.headers.host ?? "localhost:3000";
  const forwardedProto = context.req.headers["x-forwarded-proto"];
  const forwardedValue = Array.isArray(forwardedProto)
    ? forwardedProto[0]
    : forwardedProto;
  const socket = context.req.socket as { encrypted?: boolean } | undefined;
  const protocol =
    forwardedValue && typeof forwardedValue === "string"
      ? forwardedValue
      : socket?.encrypted
        ? "https"
        : "http";
  const baseUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? `${protocol}://${host}`).replace(/\/$/, "");
  const apiUrl = `${baseUrl}/api/events`;
  const toAbs = (u?: string) =>
    !u ? "" : u.startsWith("http") ? u : `${baseUrl}${u.startsWith("/") ? "" : "/"}${u}`;

  try {
    const res = await fetch(apiUrl, {
      headers: { cookie: context.req.headers.cookie ?? "" },
      cache: "no-store",
    });

    const eventsData = res.ok ? await res.json() : [];
    const safeArr = Array.isArray(eventsData) ? eventsData : [];

    const events: ExtendedEvent[] = safeArr.map((e) => {
      const rawImg = e.cover || e.image || e.image_url || e.imageUrl || e.thumbnail;
      const absImg = toAbs(rawImg);
      return {
        ...e,
        cover: absImg,
        imageUrl: absImg,
        image: absImg,
      };
    });

    return { props: { events } };
  } catch (error) {
    console.error("Failed to fetch events:", error);
    return { props: { events: [] } };
  }
};
