import type { GetServerSideProps } from "next";
import type { BookingHistory } from "@/components/profile/BookingHistoryCard";
import type { Ticket } from "@/types/tickets";
import type {
  EventOrderSummary,
  EventOrderStatus,
} from "@/types/event-orders";
import type {
  BookingOrderSummary,
  BookingOrderStatus,
} from "@/types/booking-orders";


import { useState, useEffect, useCallback, useMemo } from "react";
import { useSession } from "next-auth/react";
import { getServerSession } from "next-auth/next";
import { authOptions } from "./api/auth/[...nextauth]";
import DefaultLayout from "@/layouts/default";
import { TicketCard } from "@/components/events/TicketCard";
import { EventOrderCard } from "@/components/events/EventOrderCard";
import { BookingOrderCard } from "@/components/booking/BookingOrderCard";
import { BookingHistoryList } from "@/components/profile/BookingHistoryList";
import { ProfileHeader } from "@/components/profile/ProfileHeader";
import { TransferBookingModal } from "@/components/profile/TransferBookingModal";
import { QrCodeModal, CancelModal } from "@/components/profile/ActionModals";
import { Pagination } from "@heroui/pagination";

const PROFILE_ITEMS_PER_PAGE = 1;

const paginate = <T,>(items: T[], page: number, pageSize: number): T[] => {
  const start = Math.max((page - 1) * pageSize, 0);
  return items.slice(start, start + pageSize);
};

const clampPage = (currentPage: number, totalItems: number, pageSize: number) => {
  if (totalItems <= 0) {
    return 1;
  }
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  return Math.min(Math.max(currentPage, 1), totalPages);
};

const getPageRange = (page: number, totalItems: number, pageSize: number) => {
  if (totalItems <= 0) {
    return { start: 0, end: 0 };
  }
  const start = (page - 1) * pageSize + 1;
  const end = Math.min(totalItems, page * pageSize);
  return { start, end };
};

interface ProfilePageProps {
  tickets: Ticket[];
}

export default function ProfilePage({ tickets }: ProfilePageProps) {
  const { data: session } = useSession();
  const [bookingHistory, setBookingHistory] = useState<BookingHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [eventOrders, setEventOrders] = useState<EventOrderSummary[]>([]);
  const [eventOrdersLoading, setEventOrdersLoading] = useState(true);
  const [bookingOrders, setBookingOrders] = useState<BookingOrderSummary[]>([]);
  const [bookingOrdersLoading, setBookingOrdersLoading] = useState(true);

  const [isQrModalOpen, setQrModalOpen] = useState(false);
  const [isCancelModalOpen, setCancelModalOpen] = useState(false);
  const [isTransferModalOpen, setTransferModalOpen] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<BookingHistory | null>(
    null,
  );
  const [bookingHistoryPage, setBookingHistoryPage] = useState(1);
  const [bookingOrderPage, setBookingOrderPage] = useState(1);
  const [eventOrderPage, setEventOrderPage] = useState(1);
  const [ticketPage, setTicketPage] = useState(1);

  const fetchHistory = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/bookings/history");

      if (!response.ok) {
        throw new Error("ไม่สามารถโหลดประวัติการจองได้");
      }
      const data = await response.json();

      setBookingHistory(data);
    } catch (error) {
      console.error("ไม่สามารถดึงประวัติการจองได้:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchBookingOrders = useCallback(async () => {
    setBookingOrdersLoading(true);
    try {
      const response = await fetch("/api/bookings/my-orders");

      if (!response.ok) {
        throw new Error("Unable to load booking orders.");
      }
      const data = await response.json();

      setBookingOrders(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Unable to fetch booking orders:", error);
    } finally {
      setBookingOrdersLoading(false);
    }
  }, []);

  const fetchEventOrders = useCallback(async () => {
    setEventOrdersLoading(true);
    try {
      const response = await fetch("/api/events/my-orders");

      if (!response.ok) {
        throw new Error("Unable to load event orders.");
      }
      const data = await response.json();

      setEventOrders(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Unable to fetch event orders:", error);
    } finally {
      setEventOrdersLoading(false);
    }
  }, []);

  const markExpiredOrders = useCallback(() => {
    const now = Date.now();

    setEventOrders((currentOrders) => {
      let hasChanges = false;

      const nextOrders = currentOrders.map((order) => {
        if (order.status === "pending" && order.expires_at) {
          const expiresAt = new Date(order.expires_at).getTime();

          if (!Number.isNaN(expiresAt) && expiresAt <= now) {
            hasChanges = true;
            return { ...order, status: "expired" as EventOrderStatus };
          }
        }

        return order;
      });

      return hasChanges ? nextOrders : currentOrders;
    });

    setBookingOrders((currentOrders) => {
      let hasChanges = false;

      const nextOrders = currentOrders.map((order) => {
        if (order.status === "pending" && order.expires_at) {
          const expiresAt = new Date(order.expires_at).getTime();

          if (!Number.isNaN(expiresAt) && expiresAt <= now) {
            hasChanges = true;
            return { ...order, status: "expired" as BookingOrderStatus };
          }
        }

        return order;
      });

      return hasChanges ? nextOrders : currentOrders;
    });
  }, []);

  useEffect(() => {
    if (session) {
      fetchHistory();
      fetchEventOrders();
      fetchBookingOrders();
    }
  }, [session, fetchHistory, fetchEventOrders, fetchBookingOrders]);
  useEffect(() => {
    markExpiredOrders();
  }, [markExpiredOrders, bookingOrders, eventOrders]);
  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const interval = window.setInterval(markExpiredOrders, 5000);

    return () => {
      window.clearInterval(interval);
    };
  }, [markExpiredOrders]);

  useEffect(() => {
    setBookingHistoryPage((prev) =>
      clampPage(prev, bookingHistory.length, PROFILE_ITEMS_PER_PAGE),
    );
  }, [bookingHistory]);

  useEffect(() => {
    setBookingOrderPage((prev) =>
      clampPage(prev, bookingOrders.length, PROFILE_ITEMS_PER_PAGE),
    );
  }, [bookingOrders]);

  useEffect(() => {
    setEventOrderPage((prev) =>
      clampPage(prev, eventOrders.length, PROFILE_ITEMS_PER_PAGE),
    );
  }, [eventOrders]);

  useEffect(() => {
    setTicketPage((prev) =>
      clampPage(prev, tickets.length, PROFILE_ITEMS_PER_PAGE),
    );
  }, [tickets]);
  const upcomingBooking = useMemo(() => {
    if (bookingHistory.length === 0) {
      return null;
    }
    const nextBooking = [...bookingHistory]
      .filter(
        (booking) =>
          booking.status === "confirmed" ||
          booking.status === "awaiting_confirmation",
      )
      .sort(
        (a, b) =>
          new Date(a.booking_date).getTime() -
          new Date(b.booking_date).getTime(),
      )[0];

    return nextBooking ?? null;
  }, [bookingHistory]);
  const bookingHistoryTotalPages = Math.max(
    1,
    Math.ceil(bookingHistory.length / PROFILE_ITEMS_PER_PAGE),
  );
  const paginatedBookingHistory = useMemo(
    () => paginate(bookingHistory, bookingHistoryPage, PROFILE_ITEMS_PER_PAGE),
    [bookingHistory, bookingHistoryPage],
  );
  const paginatedBookingOrders = useMemo(
    () => paginate(bookingOrders, bookingOrderPage, PROFILE_ITEMS_PER_PAGE),
    [bookingOrders, bookingOrderPage],
  );
  const bookingOrdersTotalPages = Math.max(
    1,
    Math.ceil(bookingOrders.length / PROFILE_ITEMS_PER_PAGE),
  );
  const bookingOrdersRange = useMemo(
    () =>
      getPageRange(
        bookingOrderPage,
        bookingOrders.length,
        PROFILE_ITEMS_PER_PAGE,
      ),
    [bookingOrderPage, bookingOrders.length],
  );
  const paginatedEventOrders = useMemo(
    () => paginate(eventOrders, eventOrderPage, PROFILE_ITEMS_PER_PAGE),
    [eventOrders, eventOrderPage],
  );
  const eventOrdersTotalPages = Math.max(
    1,
    Math.ceil(eventOrders.length / PROFILE_ITEMS_PER_PAGE),
  );
  const eventOrdersRange = useMemo(
    () =>
      getPageRange(
        eventOrderPage,
        eventOrders.length,
        PROFILE_ITEMS_PER_PAGE,
      ),
    [eventOrderPage, eventOrders.length],
  );
  const paginatedTickets = useMemo(
    () => paginate(tickets, ticketPage, PROFILE_ITEMS_PER_PAGE),
    [tickets, ticketPage],
  );
  const ticketTotalPages = Math.max(
    1,
    Math.ceil(tickets.length / PROFILE_ITEMS_PER_PAGE),
  );
  const ticketRange = useMemo(
    () => getPageRange(ticketPage, tickets.length, PROFILE_ITEMS_PER_PAGE),
    [ticketPage, tickets.length],
  );

  const handleShowQr = useCallback((booking: BookingHistory) => {
    setSelectedBooking(booking);
    setQrModalOpen(true);
  }, []);

  const handleCancel = useCallback((booking: BookingHistory) => {
    setSelectedBooking(booking);
    setCancelModalOpen(true);
  }, []);

  const handleTransfer = useCallback((booking: BookingHistory) => {
    setSelectedBooking(booking);
    setTransferModalOpen(true);
  }, []);

  const confirmCancel = useCallback(
    async (bookingId: number) => {
      try {
        const response = await fetch("/api/bookings/cancel", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ bookingId }),
        });

        if (!response.ok) {
          const errorData = await response.json();

          throw new Error(errorData.message || "ยกเลิกการจองไม่สำเร็จ");
        }
        window.alert("ยกเลิกการจองเรียบร้อยแล้ว");
        fetchHistory();
      } catch (error: any) {
        window.alert(`เกิดข้อผิดพลาด: ${error.message}`);
      } finally {
        setCancelModalOpen(false);
      }
    },
    [fetchHistory],
  );

  const handleClearHistory = useCallback(() => {
    const confirmed = window.confirm(
      "คุณแน่ใจหรือไม่ว่าต้องการล้างประวัติการจอง? การดำเนินการนี้จะลบรายการที่สร้างไว้ทั้งหมดและไม่สามารถกู้คืนได้",
    );

    if (!confirmed) {
      return;
    }

    fetch("/api/bookings/clear-history", { method: "POST" })
      .then((response) => {
        if (!response.ok) {
          throw new Error("ไม่สามารถล้างประวัติการจองได้");
        }
        window.alert("ล้างประวัติการจองเรียบร้อยแล้ว");
        fetchHistory();
      })
      .catch((error) => {
        console.error(error);
        window.alert("ล้างประวัติการจองไม่สำเร็จ");
      });
  }, [fetchHistory]);

  const canClearHistory = bookingHistory.some((booking) =>
    ["completed", "cancelled"].includes(booking.status),
  );
  const hasTickets = tickets.length > 0;
  const hasBookingOrders = bookingOrders.length > 0;
  const hasEventOrders = eventOrders.length > 0;

  return (
    <DefaultLayout>
      <section className="mt-10 grid gap-4">
        <div className="relative mx-auto max-w-7xl px-4 pb-12 pt-6 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1.05fr_1.95fr]">
            <div className="space-y-6">
              {session?.user ? <ProfileHeader user={session.user} /> : null}
            </div>

            <div className="space-y-6">
              <div>
                {!loading ? (
                  <div className="rounded-3xl border border-white/10 bg-zinc-950/80 p-6 backdrop-blur">
                    <BookingHistoryList
                      bookings={paginatedBookingHistory}
                      canClearHistory={canClearHistory}
                      onCancel={handleCancel}
                      onClearHistory={handleClearHistory}
                      onShowQr={handleShowQr}
                      onTransfer={handleTransfer}
                      pagination={{
                        currentPage: bookingHistoryPage,
                        pageSize: PROFILE_ITEMS_PER_PAGE,
                        totalItems: bookingHistory.length,
                        totalPages: bookingHistoryTotalPages,
                        onPageChange: (page) => setBookingHistoryPage(page),
                      }}
                    />
                  </div>
                ) : (
                  <div className="rounded-3xl border border-white/10 bg-zinc-950/80 p-10 text-center text-zinc-400">
                    กำลังโหลดประวัติการจอง...
                  </div>
                )}
              </div>

              <section
                className="rounded-3xl border border-white/10 bg-zinc-950/80 p-6 backdrop-blur"
                id="booking-orders"
              >
                <div className="space-y-4">
                  <div>
                    <h2 className="text-xs font-semibold uppercase text-zinc-400">
                      คำสั่งจองโต๊ะของฉัน
                    </h2>
                  </div>

                  {bookingOrdersLoading ? (
                    <div className="rounded-3xl border border-white/10 bg-zinc-950/80 p-10 text-center text-zinc-400">
                      กำลังโหลดคำสั่งจองโต๊ะ...
                    </div>
                  ) : hasBookingOrders ? (
                    <div className="space-y-4">
                      {paginatedBookingOrders.map((order) => (
                        <BookingOrderCard key={order.id} order={order} />
                      ))}
                      {bookingOrders.length > PROFILE_ITEMS_PER_PAGE ? (
                        <div className="flex flex-col items-center justify-between gap-3 pt-2 text-zinc-400 sm:flex-row">
                          <span className="text-xs">
                            หน้า {bookingOrderPage.toLocaleString("th-TH")} จาก{" "}
                            {bookingOrdersTotalPages.toLocaleString("th-TH")} • แสดง{" "}
                            {bookingOrdersRange.start.toLocaleString("th-TH")} -{" "}
                            {bookingOrdersRange.end.toLocaleString("th-TH")} จาก{" "}
                            {bookingOrders.length.toLocaleString("th-TH")} รายการ
                          </span>
                          <Pagination
                            classNames={{
                              base: "rounded-full border border-white/10 bg-white/5 px-2 py-1",
                            }}
                            showControls
                            page={bookingOrderPage}
                            total={bookingOrdersTotalPages}
                            onChange={(page) => setBookingOrderPage(page)}
                          />
                        </div>
                      ) : null}
                    </div>
                  ) : (
                    <div className="rounded-3xl border border-dashed border-white/10 bg-zinc-950/80 px-6 py-16 text-center text-zinc-400">
                      <p className="text-lg font-semibold text-white">
                        ยังไม่มีคำสั่งจองโต๊ะ
                      </p>
                      <p className="mt-2 text-sm">
                        เมื่อคุณเริ่มจองโต๊ะ
                        ระบบจะแสดงคำสั่งจองที่สร้างไว้ที่นี่เพื่อกลับมาตรวจสอบหรือชำระเงินได้สะดวก
                      </p>
                    </div>
                  )}
                </div>
              </section>

              <section
                className="rounded-3xl border border-white/10 bg-zinc-950/80 p-6 backdrop-blur"
                id="event-orders"
              >
                <div className="space-y-4">
                  <div>
                    <h2 className="text-xs font-semibold uppercase text-zinc-400">
                      คำสั่งซื้ออีเวนต์ของฉัน
                    </h2>
                    <p className="mt-2 text-sm text-zinc-400">
                      กลับไปยังหน้าติดตามการสั่งซื้อเพื่อชำระเงินหรือดูสถานะล่าสุดของบัตรที่จองไว้
                    </p>
                  </div>

                  {eventOrdersLoading ? (
                    <div className="rounded-3xl border border-white/10 bg-zinc-950/80 p-10 text-center text-zinc-400">
                      กำลังโหลดคำสั่งซื้อ...
                    </div>
                  ) : hasEventOrders ? (
                    <div className="space-y-4">
                      {paginatedEventOrders.map((order) => (
                        <EventOrderCard key={order.id} order={order} />
                      ))}
                      {eventOrders.length > PROFILE_ITEMS_PER_PAGE ? (
                        <div className="flex flex-col items-center justify-between gap-3 pt-2 text-zinc-400 sm:flex-row">
                          <span className="text-xs">
                            หน้า {eventOrderPage.toLocaleString("th-TH")} จาก{" "}
                            {eventOrdersTotalPages.toLocaleString("th-TH")} • แสดง{" "}
                            {eventOrdersRange.start.toLocaleString("th-TH")} -{" "}
                            {eventOrdersRange.end.toLocaleString("th-TH")} จาก{" "}
                            {eventOrders.length.toLocaleString("th-TH")} รายการ
                          </span>
                          <Pagination
                            classNames={{
                              base: "rounded-full border border-white/10 bg-white/5 px-2 py-1",
                            }}
                            showControls
                            page={eventOrderPage}
                            total={eventOrdersTotalPages}
                            onChange={(page) => setEventOrderPage(page)}
                          />
                        </div>
                      ) : null}
                    </div>
                  ) : (
                    <div className="rounded-3xl border border-dashed border-white/10 bg-zinc-950/80 px-6 py-16 text-center text-zinc-400">
                      <p className="text-lg font-semibold text-white">
                        ยังไม่มีคำสั่งซื้ออีเวนต์
                      </p>
                      <p className="mt-2 text-sm">
                        เมื่อคุณเริ่มสั่งซื้อบัตร
                        ระบบจะแสดงคำสั่งซื้อที่สร้างไว้ที่นี่เพื่อให้กลับมาตรวจสอบหรือชำระเงินได้สะดวก
                      </p>
                    </div>
                  )}
                </div>
              </section>

              <section
                className="rounded-3xl border border-white/10 bg-zinc-950/80 p-6 backdrop-blur"
                id="tickets"
              >
                <div className="space-y-4">
                  <div>
                    <h2 className="text-xs font-semibold uppercase text-zinc-400">
                      ตั๋วของฉัน
                    </h2>
                    <p className="mt-2 text-sm text-zinc-400">
                      แสดงตั๋วอีเวนต์ทั้งหมดที่ซื้อไว้
                      พร้อมแสดงคิวอาร์โค้ดเพื่อเข้างาน
                    </p>
                  </div>

                  <div className="space-y-4">
                    {hasTickets ? (
                      <>
                        {paginatedTickets.map((ticket) => (
                          <TicketCard key={ticket.id} ticket={ticket} />
                        ))}
                        {tickets.length > PROFILE_ITEMS_PER_PAGE ? (
                          <div className="flex flex-col items-center justify-between gap-3 pt-2 text-zinc-400 sm:flex-row">
                            <span className="text-xs">
                              หน้า {ticketPage.toLocaleString("th-TH")} จาก{" "}
                              {ticketTotalPages.toLocaleString("th-TH")} • แสดง{" "}
                              {ticketRange.start.toLocaleString("th-TH")} -{" "}
                              {ticketRange.end.toLocaleString("th-TH")} จาก{" "}
                              {tickets.length.toLocaleString("th-TH")} รายการ
                            </span>
                            <Pagination
                              classNames={{
                                base: "rounded-full border border-white/10 bg-white/5 px-2 py-1",
                              }}
                              showControls
                              page={ticketPage}
                              total={ticketTotalPages}
                              onChange={(page) => setTicketPage(page)}
                            />
                          </div>
                        ) : null}
                      </>
                    ) : (
                      <div className="rounded-3xl border border-dashed border-white/10 bg-zinc-950/80 px-6 py-16 text-center text-zinc-400">
                        <p className="text-lg font-semibold text-white">
                          คุณยังไม่มีบัตรเข้าร่วมกิจกรรม
                        </p>
                        <p className="mt-2 text-sm">
                          ไปที่เมนูอีเวนต์เพื่อเลือกชมกิจกรรมและซื้อบัตรล่วงหน้าได้ทันที
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </section>
            </div>
          </div>
        </div>
      </section>

      <QrCodeModal
        booking={selectedBooking}
        isOpen={isQrModalOpen}
        onClose={() => setQrModalOpen(false)}
      />

      <CancelModal
        booking={selectedBooking}
        isOpen={isCancelModalOpen}
        onClose={() => setCancelModalOpen(false)}
        onConfirm={confirmCancel}
      />

      <TransferBookingModal
        booking={selectedBooking}
        isOpen={isTransferModalOpen}
        onClose={() => setTransferModalOpen(false)}
        onTransferSuccess={() => {
          fetchHistory();
          setTransferModalOpen(false);
        }}
      />
    </DefaultLayout>
  );
}

export const getServerSideProps: GetServerSideProps<ProfilePageProps> = async (
  context,
) => {
  const session = await getServerSession(context.req, context.res, authOptions);

  if (!session) {
    return {
      redirect: {
        destination: "/",
        permanent: false,
      },
    };
  }

  if (session.user) {
    if (typeof session.user.email === "undefined") {
      session.user.email = null;
    }
    if (typeof session.user.image === "undefined") {
      session.user.image = null;
    }
  }

  let tickets: Ticket[] = [];

  if (session.user?.id) {
    try {
      const origin = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
      const response = await fetch(`${origin}/api/events/my-tickets`, {
        headers: {
          Cookie: context.req.headers.cookie ?? "",
        },
      });

      if (response.ok) {
        tickets = (await response.json()) as Ticket[];
      } else {
        console.warn(
          "Failed to fetch tickets for profile page:",
          response.statusText,
        );
      }
    } catch (error) {
      console.error("My tickets SSR error:", error);
    }
  }

  return {
    props: {
      session,
      tickets,
    },
  };
};
