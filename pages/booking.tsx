import type { GetServerSideProps } from "next";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getServerSession } from "next-auth/next";
import { useRouter } from "next/router";
import {
  getLocalTimeZone,
  parseDate,
  CalendarDate,
} from "@internationalized/date";
import { DatePicker } from "@heroui/date-picker";
import { authOptions } from "./api/auth/[...nextauth]";
import DefaultLayout from "@/layouts/default";
import { RestaurantLayout } from "@/components/shared/RestaurantLayout";
import { useNotification } from "@/lib/NotificationContext";

interface Table {
  id: number;
  table_number: string;
  capacity: number;
  status: "available" | "reserved" | "pending";
}

interface Zone {
  id: number;
  name: string;
  description?: string;
  booking_fee?: number | null;
  tables: Table[];
}

const LoadingState = ({ message }: { message: string }) => (
  <div className="flex flex-col items-center justify-center gap-4 py-24 text-white/70">
    <span className="h-12 w-12 animate-spin rounded-full border-2 border-white/40 border-t-transparent" />
    <p className="text-sm">{message}</p>
  </div>
);

const AlertIcon = () => (
  <svg
    className="h-12 w-12"
    fill="none"
    stroke="currentColor"
    strokeLinecap="round"
    strokeLinejoin="round"
    strokeWidth="2"
    viewBox="0 0 24 24"
    xmlns="http://www.w3.org/2000/svg"
  >
    <circle cx="12" cy="12" r="10" />
    <line x1="12" x2="12" y1="8" y2="12" />
    <line x1="12" x2="12.01" y1="16" y2="16" />
  </svg>
);

const BookingClosedState = () => (
  <div className="flex flex-col items-center justify-center gap-6 rounded-3xl border border-amber-400/40 bg-amber-500/10 px-10 py-16 text-center text-amber-100">
    <span className="text-amber-100">
      <AlertIcon />
    </span>
    <div className="space-y-3">
      <h3 className="text-2xl font-semibold">ขณะนี้ปิดรับการจองโต๊ะ</h3>
    </div>
  </div>
);

type StepMeta = {
  label: string;
  description: string;
};

const StepCard = ({
  index,
  step,
  isActive,
  isCompleted,
}: {
  index: number;
  step: StepMeta;
  isActive: boolean;
  isCompleted: boolean;
}) => {
  const badgeClass = isActive
    ? "bg-gradient-to-br from-cyan-400 via-sky-400 to-emerald-300 text-[#041026]"
    : isCompleted
      ? "bg-emerald-500/15 text-emerald-100 border border-emerald-400/30"
      : "bg-white/5 text-white/60 border border-white/10";

  return (
    <div
      className={`flex flex-col gap-2 rounded-2xl border ${
        isActive
          ? "border-cyan-400/50 bg-cyan-500/10"
          : "border-white/10 bg-white/5"
      } p-4 transition`}
    >
      <div className="flex items-center gap-3">
        <span
          className={`flex h-10 w-10 items-center justify-center rounded-full text-sm font-semibold ${badgeClass}`}
        >
          {index}
        </span>
        <div>
          <p className="text-[11px] uppercase text-white/45">ขั้นตอน {index}</p>
          <h3 className="text-base font-semibold text-white">{step.label}</h3>
        </div>
      </div>
      <p className="text-xs leading-5 text-white/65">{step.description}</p>
    </div>
  );
};

export default function BookingPage() {
  const router = useRouter();
  const { showNotification } = useNotification();
  const [zones, setZones] = useState<Zone[]>([]);
  const [isBookingEnabled, setIsBookingEnabled] = useState(true);
  const [bookingStatusLoading, setBookingStatusLoading] = useState(true);
  const [tablesLoading, setTablesLoading] = useState(true);
  const [baseBookingFee, setBaseBookingFee] = useState(0);
  const [maxBookings, setMaxBookings] = useState(0);
  const [userBookingsCount, setUserBookingsCount] = useState(0);
  const [userStatusLoading, setUserStatusLoading] = useState(true);
  const [selectedTables, setSelectedTables] = useState<Table[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isBooking, setIsBooking] = useState(false);
  const [selectedDate, setSelectedDate] = useState(
    parseDate(new Date().toISOString().slice(0, 10)),
  );
  const limitWarningDisplayedRef = useRef(false);

  const fetchBookingStatusAndTables = useCallback(async () => {
    setBookingStatusLoading(true);
    setTablesLoading(true);
    setUserStatusLoading(true);

    try {
      const statusRes = await fetch("/api/booking-status");

      if (!statusRes.ok) {
        throw new Error("ไม่สามารถ--รวจสอบสถานะการจองได้");
      }

      const statusData = await statusRes.json();
      const bookingEnabled = Boolean(statusData.isBookingEnabled);
      const parsedMaxFromStatus = Number(statusData.maxBookings ?? 0);

      setIsBookingEnabled(bookingEnabled);
      setBaseBookingFee(Number(statusData.bookingFee ?? 0));
      setMaxBookings(
        Number.isFinite(parsedMaxFromStatus) && parsedMaxFromStatus >= 0
          ? parsedMaxFromStatus
          : 0,
      );

      if (bookingEnabled) {
        const dateParam = selectedDate.toString();
        const [tablesRes, userStatusRes] = await Promise.all([
          fetch(`/api/tables?date=${encodeURIComponent(dateParam)}`),
          fetch(
            `/api/bookings/user-status?date=${encodeURIComponent(dateParam)}`,
          ),
        ]);

        if (!tablesRes.ok) {
          throw new Error("ไม่สามารถโหลดข้อมูลผังโต๊ะได้");
        }
        const tablesData = await tablesRes.json();

        setZones(tablesData ?? []);
        if (userStatusRes.ok) {
          const userStatusData = await userStatusRes.json();
          const currentBookings = Number(userStatusData.currentBookings ?? 0);
          const limitFromUserStatus = Number(
            userStatusData.maxBookings ?? parsedMaxFromStatus ?? 0,
          );
          const normalizedCurrent =
            Number.isFinite(currentBookings) && currentBookings >= 0
              ? currentBookings
              : 0;
          const normalizedMax =
            Number.isFinite(limitFromUserStatus) && limitFromUserStatus >= 0
              ? limitFromUserStatus
              : 0;

          setUserBookingsCount(normalizedCurrent);
          setMaxBookings(normalizedMax);

          if (normalizedMax > 0 && normalizedCurrent >= normalizedMax) {
            setSelectedTables([]);
            setIsModalOpen(false);
          }
        } else {
          setUserBookingsCount(0);
        }
      } else {
        setZones([]);
        setUserBookingsCount(0);
        setSelectedTables([]);
        setIsModalOpen(false);
      }
    } catch (error: any) {
      console.error("Booking page load error:", error);
      showNotification(
        "Error",
        error?.message || "เกิดข้อผิดพลาดระหว่างโหลดข้อมูลการจอง",
        "error",
      );
      setZones([]);
      setUserBookingsCount(0);
      setSelectedTables([]);
      setIsModalOpen(false);
    } finally {
      setBookingStatusLoading(false);
      setTablesLoading(false);
      setUserStatusLoading(false);
    }
  }, [selectedDate, showNotification]);

  useEffect(() => {
    fetchBookingStatusAndTables();
  }, [fetchBookingStatusAndTables]);

  const hasReachedBookingLimit = useMemo(
    () => maxBookings > 0 && userBookingsCount >= maxBookings,
    [maxBookings, userBookingsCount],
  );

  const remainingBookings = useMemo(
    () =>
      maxBookings > 0 ? Math.max(maxBookings - userBookingsCount, 0) : null,
    [maxBookings, userBookingsCount],
  );

  const selectedDateLabel = useMemo(
    () =>
      selectedDate.toDate(getLocalTimeZone()).toLocaleDateString("th-TH", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      }),
    [selectedDate],
  );

  useEffect(() => {
    if (!hasReachedBookingLimit) {
      limitWarningDisplayedRef.current = false;

      return;
    }

    setSelectedTables([]);
    setIsModalOpen(false);

    if (!limitWarningDisplayedRef.current && !userStatusLoading) {
      showNotification(
        "Warning",
        `คุณทำการจองครบจำนวนสูงสุดสำหรับวันที่ ${selectedDateLabel} แล้ว`,
        "info",
      );
      limitWarningDisplayedRef.current = true;
    }
  }, [
    hasReachedBookingLimit,
    selectedDateLabel,
    showNotification,
    userStatusLoading,
  ]);
  const handleTableSelect = (table: Table) => {
    if (hasReachedBookingLimit) {
      showNotification(
        "Warning",
        "คุณใช้สิทธิ์การจองครบจำนวนสูงสุดสำหรับวันนี้แล้ว",
        "info",
      );

      return;
    }

    setSelectedTables((prev) => {
      const exists = prev.some((item) => item.id === table.id);

      if (exists) {
        return prev.filter((item) => item.id !== table.id);
      }

      if (remainingBookings !== null) {
        const remainingSlots = Math.max(remainingBookings - prev.length, 0);

        if (remainingSlots <= 0) {
          showNotification(
            "Info",
            "คุณเลือกโต๊ะครบจำนวนสูงสุดที่สามารถจองได้สำหรับวันนี้แล้ว",
            "info",
          );

          return prev;
        }
      }

      return [...prev, table];
    });
  };

  const handleOpenBookingModal = () => {
    if (hasReachedBookingLimit) {
      showNotification(
        "Warning",
        "คุณใช้สิทธิ์การจองครบจำนวนสูงสุดสำหรับวันนี้แล้ว",
        "info",
      );

      return;
    }

    if (selectedTables.length === 0) {
      showNotification("Info", "โปรดเลือกโต๊ะว่างก่อนยืนยันการจอง", "info");

      return;
    }

    setIsModalOpen(true);
  };

  const handleConfirmBooking = async () => {
    if (hasReachedBookingLimit) {
      showNotification(
        "Warning",
        "คุณใช้สิทธิ์การจองครบจำนวนสูงสุดสำหรับวันนี้แล้ว",
        "info",
      );

      return;
    }

    if (selectedTables.length === 0) {
      return;
    }

    setIsBooking(true);
    try {
      const response = await fetch("/api/bookings/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tableIds: selectedTables.map((table) => table.id),
          bookingDate: selectedDate.toString(),
        }),
      });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "ไม่สามารถสร้างคำสั่งจองได้");
      }

      if (!result.requiresPayment || result.status === "paid") {
        showNotification(
          "Success",
          "ยืนยันการจองเรียบร้อยแล้ว ทีมงานกำลังดูแลขั้น--อน--่อไป",
          "success",
        );
        setIsModalOpen(false);
        setSelectedTables([]);
        await fetchBookingStatusAndTables();
      } else {
        showNotification(
          "Success",
          "สร้างคำสั่งจองแล้ว กรุณาชำระเงินภายใน 15 นาที",
          "success",
        );
        setIsModalOpen(false);
        router.push(`/bookings/order/${result.orderId}`);
      }
    } catch (error: any) {
      showNotification(
        "Error",
        error?.message || "เกิดข้อผิดพลาดในการสร้างคำสั่งจอง",
        "error",
      );
    } finally {
      setIsBooking(false);
    }
  };
  const totalTables = useMemo(
    () => zones.reduce((total, zone) => total + zone.tables.length, 0),
    [zones],
  );

  const availableTables = useMemo(
    () =>
      zones.reduce(
        (total, zone) =>
          total +
          zone.tables.filter((table) => table.status === "available").length,
        0,
      ),
    [zones],
  );

  const reservedTables = Math.max(totalTables - availableTables, 0);

  const selectedTableIds = useMemo(
    () => selectedTables.map((table) => table.id),
    [selectedTables],
  );

  const selectedTablesWithMeta = useMemo(
    () =>
      selectedTables.map((table) => {
        const zone =
          zones.find((zone) =>
            zone.tables.some((item) => item.id === table.id),
          ) ?? null;

        const zoneFee =
          zone && zone.booking_fee != null
            ? Number(zone.booking_fee)
            : baseBookingFee;
        const normalizedFee = Number.isFinite(zoneFee) ? zoneFee : 0;

        return { table, zone, fee: normalizedFee };
      }),
    [selectedTables, zones, baseBookingFee],
  );

  const totalSelectedFee = useMemo(
    () =>
      selectedTablesWithMeta.reduce((sum, item) => sum + item.fee, 0),
    [selectedTablesWithMeta],
  );

  const totalSelectedCapacity = useMemo(
    () =>
      selectedTables.reduce(
        (sum, table) => sum + Number(table.capacity ?? 0),
        0,
      ),
    [selectedTables],
  );

  const bookingQuotaMessage = useMemo(() => {
    if (userStatusLoading) {
      return "กำลัง--รวจสอบสิทธิ์การจองของคุณ...";
    }

    if (maxBookings > 0) {
      if (remainingBookings != null && remainingBookings > 0) {
        return `คุณยังสามารถจองได้อีก ${remainingBookings} โต๊ะสำหรับวันที่ ${selectedDateLabel}`;
      }

      return `คุณทำการจองครบจำนวนสูงสุดสำหรับวันที่ ${selectedDateLabel} แล้ว`;
    }

    return "สามารถจองได้ไม่จำกัดจำนวน--่อวัน";
  }, [maxBookings, remainingBookings, selectedDateLabel, userStatusLoading]);

  const steps: StepMeta[] = [
    {
      label: "เลือกโต๊ะ",
      description: "เช็กโซนโต๊ะทีละจุด โต๊ะไหนว่างกดดูโลด อย่ารอช้า",
    },
    {
      label: "ยืนยันการจอง",
      description: "โต๊ะไหนโดน ใครนั่งบ้างดูให้ครบ แล้ว confirm ไปเลย",
    },
  ];

  const activeStep = selectedTables.length > 0 ? 2 : 1;

  const renderPrimaryContent = () => {
    if (bookingStatusLoading) {
      return <LoadingState message="กำลังโหลดข้อมูลสถานะการจอง..." />;
    }

    if (!isBookingEnabled) {
      return <BookingClosedState />;
    }

    if (tablesLoading) {
      return <LoadingState message="กำลังโหลดผังโต๊ะอย่างละเอียด..." />;
    }

    return (
      <div className="space-y-6">
        {!userStatusLoading && hasReachedBookingLimit ? (
          <div className="rounded-2xl border border-amber-400/40 bg-amber-500/10 px-5 py-4 text-sm text-amber-100">
            คุณทำการจองครบจำนวนสูงสุดสำหรับวันที่ {selectedDateLabel} แล้ว
          </div>
        ) : null}
        <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.04] px-5 py-4 text-xs uppercase text-white/60">
          <span className="inline-flex items-center gap-2 rounded-full border border-emerald-400/40 bg-emerald-500/10 px-4 py-2 text-emerald-100">
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
            โต๊ะว่าง
          </span>
          <span className="inline-flex items-center gap-2 rounded-full border border-amber-400/40 bg-amber-500/10 px-4 py-2 text-amber-100">
            <span className="h-2.5 w-2.5 rounded-full bg-amber-300" />
            รอตรวจสอบ
          </span>
          <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-2 text-white/70">
            <span className="h-2.5 w-2.5 rounded-full bg-white/40" />
            ถูกจองแล้ว
          </span>
        </div>

        <RestaurantLayout
          isLoading={false}
          selectedTableIds={selectedTableIds}
          zones={zones}
          onTableSelect={handleTableSelect}
        />
      </div>
    );
  };

  const handleDateChange = (date: CalendarDate | null) => {
    if (date) {
      setSelectedDate(date);
      setSelectedTables([]);
      setIsModalOpen(false);
    }
  };

  return (
    <DefaultLayout>
      <section className="relative mx-auto max-w-7xl px-4 pb-20 pt-10 text-white sm:px-6 lg:px-8">
        <div className="relative overflow-hidden rounded-[32px] border border-white/10 bg-white/[0.04] px-6 py-10 sm:px-10">
          <span className="pointer-events-none absolute inset-0">
            <span className="absolute -top-24 left-10 h-48 w-48 rounded-full bg-cyan-500/25 blur-[140px]" />
            <span className="absolute -bottom-36 right-12 h-56 w-56 rounded-full bg-indigo-500/30 blur-[160px]" />
          </span>

          <div className="relative z-10 grid gap-8 lg:grid-cols-[minmax(0,2fr)_minmax(0,1.1fr)]">
            <div className="space-y-6">
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="rounded-2xl border border-white/10 bg-white/[0.06] px-5 py-4">
                  <p className="text-[11px] uppercase text-white/50">
                    เลือกวันที่
                  </p>
                  <DatePicker
                    value={selectedDate}
                    onChange={handleDateChange}
                  />
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/[0.06] px-5 py-4">
                  <p className="text-[11px] uppercase text-white/50">จองแล้ว</p>
                  <p className="mt-2 text-lg font-semibold text-white">
                    {reservedTables.toLocaleString("th-TH")} /{" "}
                    {totalTables.toLocaleString("th-TH")} โต๊ะ
                  </p>
                </div>
                <div className="rounded-2xl border border-emerald-400/40 bg-emerald-500/10 px-5 py-4 text-emerald-100">
                  <p className="text-[11px] uppercase text-emerald-200">
                    โต๊ะว่างตอนนี้
                  </p>
                  <p className="mt-2 text-lg font-semibold text-white">
                    {availableTables.toLocaleString("th-TH")} โต๊ะ
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-12 grid gap-8 lg:grid-cols-[minmax(0,3fr)_minmax(0,1.1fr)]">
          <section className="space-y-6">
            <div className="space-y-4 rounded-3xl border border-white/10 bg-white/[0.03] p-6">
              <div className="grid gap-4 lg:grid-cols-2">
                {steps.map((step, index) => (
                  <StepCard
                    key={step.label}
                    index={index + 1}
                    isActive={activeStep === index + 1}
                    isCompleted={activeStep > index + 1}
                    step={step}
                  />
                ))}
              </div>
            </div>

            <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-6">
              {renderPrimaryContent()}
            </div>
          </section>

          <aside className="space-y-6">
            <div className="space-y-5 rounded-3xl border border-white/10 bg-white/[0.05] p-6">
              <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-5 py-4 text-sm text-white/70">
                <div className="flex items-center justify-between text-white">
                  <span className="text-[11px] uppercase text-white/50">
                    สิทธิ์การจองต่อวัน
                  </span>
                  {maxBookings > 0 ? (
                    <span
                      className={`text-sm font-semibold ${hasReachedBookingLimit ? "text-amber-200" : "text-emerald-200"}`}
                    >
                      {userBookingsCount}/{maxBookings} โต๊ะ
                    </span>
                  ) : (
                    <span className="text-sm font-semibold text-emerald-200">
                      ไม่จำกัด
                    </span>
                  )}
                </div>
                <p className="mt-3 text-xs leading-5 text-white/60">
                  {bookingQuotaMessage}
                </p>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[11px] uppercase text-white/50">
                    สรุปรายการ
                  </p>
                  <h2 className="text-xl font-semibold text-white">
                    โต๊ะที่เลือกไว้
                  </h2>
                </div>
              </div>

              {selectedTables.length > 0 && (
                <>
                  <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
                    <div className="flex flex-col gap-5">
                      <div>
                        <p className="text-sm text-white/60">โต๊ะที่เลือก</p>
                        <p className="text-2xl font-semibold text-white">
                          {selectedTables.length.toLocaleString("th-TH")} โต๊ะ
                        </p>
                      </div>
                      <div className="space-y-3 text-xs text-white/70">
                        {selectedTablesWithMeta.map(({ table, zone, fee }) => (
                          <div
                            key={table.id}
                            className="flex flex-col gap-3 rounded-xl border border-white/10 bg-white/[0.05] px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
                          >
                            <div>
                              <p className="text-sm font-semibold text-white">
                                โต๊ะ {table.table_number}
                              </p>
                              <p className="mt-1 text-white/60">
                                โซน {zone?.name ?? "-"} - ขนาด {table.capacity.toLocaleString("th-TH")} ที่นั่ง
                              </p>
                            </div>
                            <p className="text-sm font-semibold text-white">
                              {fee > 0
                                ? `THB ${fee.toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                                : "No additional fee"}
                            </p>
                          </div>
                        ))}
                      </div>
                      <div className="grid grid-cols-1 gap-3 text-xs text-white/65 sm:grid-cols-2">
                        <div className="rounded-xl border border-white/10 bg-white/[0.05] px-4 py-3">
                          <p className="uppercase text-white/45">จำนวนที่นั่ง</p>
                          <p className="mt-2 text-sm font-semibold text-white">
                            {totalSelectedCapacity.toLocaleString("th-TH")} ที่นั่ง
                          </p>
                        </div>
                        <div className="rounded-xl border border-white/10 bg-white/[0.05] px-4 py-3">
                          <p className="uppercase text-white/45">ค่าจอง</p>
                          <p className="mt-2 text-sm font-semibold text-white">
                            {totalSelectedFee > 0
                              ? `THB ${totalSelectedFee.toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                              : "No additional fee"}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                  <button
                    className="w-full rounded-2xl bg-gradient-to-r from-emerald-400 via-cyan-400 to-sky-500
  px-5 py-3 text-sm font-semibold uppercase text-[#041026]
  transition transform hover:scale-[1.03] hover:brightness-110
  disabled:cursor-not-allowed disabled:opacity-40"
                    disabled={
                      !isBookingEnabled || isBooking || hasReachedBookingLimit
                    }
                    type="button"
                    onClick={handleOpenBookingModal}
                  >
                    {isBooking
                      ? "กำลังดำเนินการ..."
                      : totalSelectedFee > 0
                        ? `จองโต๊ะ ราคา ${totalSelectedFee.toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} บาท`
                        : "ยืนยันการจอง"}
                  </button>
                </>
              )}

              <button
                className="w-full rounded-2xl border border-white/12 bg-white/[0.03] px-6 py-3 text-xs font-semibold uppercase text-white/70 transition hover:border-white/30 hover:text-white"
                type="button"
                onClick={fetchBookingStatusAndTables}
              >
                รีเฟรชสถานะล่าสุด
              </button>
            </div>
          </aside>
        </div>
      </section>

      {isModalOpen && selectedTables.length > 0 ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/10 px-4 py-6 backdrop-blur-md">
          <div
            className="absolute inset-0"
            onClick={() => !isBooking && setIsModalOpen(false)}
          />
          <div className="relative w-full max-w-lg overflow-hidden rounded-3xl border border-white/10 bg-[#000] p-8">
            <div className="absolute -top-12 right-6 h-32 w-32 rounded-full bg-sky-500/20 blur-[120px]" />
            <div className="absolute -bottom-10 left-3 h-28 w-28 rounded-full bg-indigo-600/20 blur-[110px]" />

            <div className="relative flex flex-col gap-6 text-white">
              <div>
                <h3 className="text-2xl font-semibold">ยืนยันการจองโต๊ะ</h3>
                <p className="mt-2 text-sm text-white/70">
                  เช็กโต๊ะที่เลือกไว้ แล้วกดยืนยันการจองได้เลย 😎
                </p>
              </div>

              <div className="space-y-3 rounded-2xl border border-white/10 bg-white/[0.05] p-5 text-sm text-white/70">
                {selectedTablesWithMeta.map(({ table, zone, fee }) => (
                  <div
                    key={table.id}
                    className="flex flex-col gap-2 rounded-xl border border-white/10 bg-white/[0.07] px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div>
                      <p className="font-semibold text-white">โต๊ะ {table.table_number}</p>
                      <p className="text-xs text-white/60">
                        โซน {zone?.name ?? "-"} - {table.capacity.toLocaleString("th-TH")} ที่นั่ง
                      </p>
                    </div>
                    <p className="text-sm font-semibold text-white">
                      {fee > 0
                        ? `THB ${fee.toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                        : "No additional fee"}
                    </p>
                  </div>
                ))}
              </div>

              <div className="grid gap-3 rounded-2xl border border-white/10 bg-white/[0.05] p-5 text-sm text-white/70 sm:grid-cols-2">
                <div>
                  <p className="uppercase text-white/45">วันที่จอง</p>
                  <p className="mt-1 text-sm font-semibold text-white">
                    {selectedDate
                      .toDate(getLocalTimeZone())
                      .toLocaleDateString("th-TH", {
                        weekday: "long",
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                      })}
                  </p>
                </div>
                <div>
                  <p className="uppercase text-white/45">ราคา</p>
                  <p className="mt-1 text-sm font-semibold text-white">
                    {totalSelectedFee > 0
                      ? `THB ${totalSelectedFee.toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                      : "No additional fee"}
                  </p>
                </div>
              </div>

              <div className="flex flex-col gap-3 text-xs text-white/60">
                <p>กดยืนยันปั๊บ เด้งไปหน้าออเดอร์ทันที.</p>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row">
                <button
                  className="w-full rounded-2xl border border-white/15 bg-white/[0.04] px-5 py-3 text-sm font-semibold uppercase text-white/75 transition hover:border-white/30 hover:text-white"
                  disabled={isBooking}
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                >
                  ยกเลิก
                </button>
                <button
                  className="w-full rounded-2xl bg-gradient-to-r from-emerald-400 via-cyan-400 to-sky-500 px-5 py-3 text-sm font-semibold uppercase text-[#041026] transition transform hover:scale-[1.03] hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
                  disabled={isBooking}
                  type="button"
                  onClick={handleConfirmBooking}
                >
                  {isBooking
                    ? "Processing..."
                    : totalSelectedFee > 0
                      ? `ยืนยันการชำระเงิน ${totalSelectedFee.toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} บาท`
                      : "ยืนยันการชำระเงิน"}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </DefaultLayout>
  );
}

export const getServerSideProps: GetServerSideProps = async (context) => {
  const session = await getServerSession(context.req, context.res, authOptions);

  if (!session) {
    return {
      redirect: {
        destination: "/",
        permanent: false,
      },
    };
  }

  return { props: {} };
};
