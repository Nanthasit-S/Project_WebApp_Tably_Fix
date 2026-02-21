import type { SortDescriptor } from "@react-types/shared";

import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type Key,
} from "react";
import { format } from "date-fns";
import {
  Table,
  TableHeader,
  TableColumn,
  TableBody,
  TableRow,
  TableCell,
} from "@heroui/table";
import { Card, CardBody, CardHeader } from "@heroui/card";
import { Tabs, Tab } from "@heroui/tabs";
import { Input } from "@heroui/input";
import { Chip } from "@heroui/chip";
import { Avatar } from "@heroui/avatar";
import { Pagination } from "@heroui/pagination";
import { Spinner } from "@heroui/spinner";
import { Divider } from "@heroui/divider";

import { SearchIcon } from "./TableIcons";

import { useNotification } from "@/lib/NotificationContext";

interface Booking {
  id: number;
  display_name: string;
  user_image: string | null;
  table_number: string;
  zone_name: string;
  booking_date: string;
  status: string;
  created_at: string;
}

type StatusFilter = "all" | "confirmed" | "cancelled";

const COLUMNS: Array<{ key: Key; label: string; allowsSorting?: boolean }> = [
  { key: "display_name", label: "ผู้จอง", allowsSorting: true },
  { key: "details", label: "รายละเอียด" },
  { key: "booking_date", label: "วันที่จอง", allowsSorting: true },
  { key: "status", label: "สถานะ", allowsSorting: true },
  { key: "created_at", label: "สร้างเมื่อ", allowsSorting: true },
];

const STATUS_LABELS: Record<string, string> = {
  confirmed: "ยืนยันแล้ว",
  cancelled: "ยกเลิก",
};

const STATUS_CHIP_COLOR: Record<
  StatusFilter,
  "default" | "success" | "danger"
> = {
  all: "default",
  confirmed: "success",
  cancelled: "danger",
};

const STATUS_TABS: Array<{ key: StatusFilter; label: string }> = [
  { key: "all", label: "ทั้งหมด" },
  { key: "confirmed", label: "ยืนยันแล้ว" },
  { key: "cancelled", label: "ยกเลิก" },
];

const STATUS_DESCRIPTION: Record<StatusFilter, string> = {
  all: "จำนวนการจองทั้งหมดในระบบ",
  confirmed: "ยืนยันแล้วและพร้อมให้บริการ",
  cancelled: "การจองที่ถูกยกเลิก",
};

const STATUS_ACCENT: Record<StatusFilter, string> = {
  all: "border-primary-500/30 bg-primary-500/10",
  confirmed: "border-emerald-500/30 bg-emerald-500/10",
  cancelled: "border-rose-500/30 bg-rose-500/10",
};

const ROWS_PER_PAGE = 10;

const formatDate = (value: string, pattern: string) => {
  try {
    return format(new Date(value), pattern);
  } catch {
    return "-";
  }
};

const getInitials = (value: string) =>
  value
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("")
    .slice(0, 2) || "U";

export const BookingManagement: React.FC = () => {
  const { showNotification } = useNotification();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filterValue, setFilterValue] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [page, setPage] = useState(1);
  const [sortDescriptor, setSortDescriptor] = useState<SortDescriptor>({
    column: "created_at",
    direction: "descending",
  });

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/admin/all-bookings");

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        const message =
          payload && typeof payload === "object" && "message" in payload
            ? String(payload.message ?? "")
            : "";

        throw new Error(message || "ไม่สามารถโหลดข้อมูลการจองได้");
      }
      const data = (await response.json()) as Booking[];

      setBookings(Array.isArray(data) ? data : []);
    } catch (error) {
      showNotification(
        "โหลดข้อมูลไม่สำเร็จ",
        error instanceof Error ? error.message : "กรุณาลองใหม่อีกครั้ง",
        "error",
      );
    } finally {
      setIsLoading(false);
    }
  }, [showNotification]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const statusTotals = useMemo(() => {
    return bookings.reduce<Record<StatusFilter, number>>(
      (acc, booking) => {
        const status = (booking.status as StatusFilter) ?? "all";

        acc.all += 1;
        if (status === "confirmed") {
          acc.confirmed += 1;
        } else if (status === "cancelled") {
          acc.cancelled += 1;
        }

        return acc;
      },
      { all: 0, confirmed: 0, cancelled: 0 },
    );
  }, [bookings]);

  const statusMetrics = useMemo(
    () =>
      STATUS_TABS.map((tab) => ({
        key: tab.key,
        label: tab.label,
        value: statusTotals[tab.key],
        description: STATUS_DESCRIPTION[tab.key],
      })),
    [statusTotals],
  );

  const lastUpdated = useMemo(() => {
    if (!bookings.length) return null;

    const latest = bookings.reduce((current, booking) => {
      if (!current) return booking;

      return new Date(booking.created_at) > new Date(current.created_at)
        ? booking
        : current;
    }, bookings[0] ?? null);

    return latest ? formatDate(latest.created_at, "dd MMM yyyy HH:mm") : null;
  }, [bookings]);

  const filteredBookings = useMemo(() => {
    const keyword = filterValue.trim().toLowerCase();

    return bookings.filter((booking) => {
      const matchesStatus =
        statusFilter === "all" || booking.status === statusFilter;

      if (!keyword) {
        return matchesStatus;
      }

      const normalized = [
        booking.display_name,
        booking.table_number,
        booking.zone_name,
      ]
        .filter(Boolean)
        .map((value) => value.toLowerCase());

      const matchesKeyword = normalized.some((value) =>
        value.includes(keyword),
      );

      return matchesStatus && matchesKeyword;
    });
  }, [bookings, filterValue, statusFilter]);

  const sortedBookings = useMemo(() => {
    const descriptor = sortDescriptor;
    const direction = descriptor.direction === "ascending" ? 1 : -1;

    return [...filteredBookings].sort((a, b) => {
      const first: any = (a as any)[descriptor.column];
      const second: any = (b as any)[descriptor.column];

      if (typeof first === "string" && typeof second === "string") {
        return first.localeCompare(second, "th") * direction;
      }

      if (first instanceof Date && second instanceof Date) {
        return (first.getTime() - second.getTime()) * direction;
      }

      if (first < second) return -1 * direction;
      if (first > second) return 1 * direction;

      return 0;
    });
  }, [filteredBookings, sortDescriptor]);

  const pages = Math.max(1, Math.ceil(sortedBookings.length / ROWS_PER_PAGE));

  const items = useMemo(() => {
    const start = (page - 1) * ROWS_PER_PAGE;

    return sortedBookings.slice(start, start + ROWS_PER_PAGE);
  }, [page, sortedBookings]);

  const pageStart = sortedBookings.length ? (page - 1) * ROWS_PER_PAGE + 1 : 0;
  const pageEnd = sortedBookings.length
    ? Math.min(page * ROWS_PER_PAGE, sortedBookings.length)
    : 0;

  useEffect(() => {
    if (page > pages) {
      setPage(pages);
    }
  }, [page, pages]);

  useEffect(() => {
    setPage(1);
  }, [filterValue, statusFilter]);

  const renderCell = useCallback((item: Booking, columnKey: Key) => {
    switch (columnKey) {
      case "display_name":
        return (
          <div className="flex items-center gap-3">
            <Avatar
              className="bg-default-100 text-default-600"
              fallback={getInitials(item.display_name)}
              name={item.display_name}
              src={
                item.user_image
                  ? `/api/image-proxy?url=${encodeURIComponent(item.user_image)}`
                  : undefined
              }
            />
            <div className="flex flex-col">
              <span className="font-medium text-foreground">
                {item.display_name}
              </span>
              <span className="text-xs text-default-500">
                สร้างเมื่อ {formatDate(item.created_at, "dd MMM yyyy")}
              </span>
            </div>
          </div>
        );
      case "details":
        return (
          <div className="flex flex-col text-sm">
            <span className="font-semibold text-foreground">
              โต๊ะ {item.table_number}
            </span>
            <span className="text-xs text-default-500">
              {item.zone_name} Zone
            </span>
          </div>
        );
      case "booking_date":
        return (
          <span className="text-sm text-default-500">
            {formatDate(item.booking_date, "dd MMM yyyy")}
          </span>
        );
      case "status": {
        const label = STATUS_LABELS[item.status] ?? item.status;
        const color =
          item.status === "confirmed"
            ? "success"
            : item.status === "cancelled"
              ? "danger"
              : "default";

        return (
          <Chip
            className="font-medium uppercase"
            color={color}
            size="sm"
            variant="flat"
          >
            {label}
          </Chip>
        );
      }
      case "created_at":
        return (
          <span className="text-sm text-default-500">
            {formatDate(item.created_at, "dd MMM yyyy HH:mm")}
          </span>
        );
      default:
        return (
          <span className="text-sm text-default-500">
            {(item as any)[columnKey as string] ?? "-"}
          </span>
        );
    }
  }, []);

  return (
    <section className="flex flex-col gap-8">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {statusMetrics.map((metric) => (
          <Card
            key={metric.key}
            className={`border shadow-none ${STATUS_ACCENT[metric.key]}`}
          >
            <CardHeader className="flex flex-col gap-1 pb-2">
              <span className="text-xs uppercase text-default-500">
                {metric.label}
              </span>
            </CardHeader>
            <CardBody className="flex flex-col gap-1">
              <span className="text-3xl font-semibold text-foreground">
                {metric.value.toLocaleString("th-TH")}
              </span>
              <span className="text-xs text-default-500">
                {metric.description}
              </span>
            </CardBody>
          </Card>
        ))}
      </div>

      <Card className="border border-default-200/20 bg-content1/60 backdrop-blur">
        <CardHeader className="flex flex-col gap-2 pb-0 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h3 className="text-2xl font-semibold text-foreground">
              คิวการจอง
            </h3>
            <p className="text-sm text-default-500">
              จัดการการจองและตรวจสอบสถานะได้จากที่เดียว
            </p>
          </div>
          {lastUpdated ? (
            <span className="text-xs text-default-400">
              อัปเดตล่าสุด {lastUpdated}
            </span>
          ) : null}
        </CardHeader>
        <CardBody className="space-y-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <Input
              isClearable
              classNames={{
                inputWrapper: "bg-content2/80 border-default-200/40",
              }}
              placeholder="ค้นหาชื่อผู้จอง โต๊ะ หรือโซน"
              size="lg"
              startContent={
                <span className="text-default-400">
                  <SearchIcon />
                </span>
              }
              value={filterValue}
              variant="bordered"
              onClear={() => setFilterValue("")}
              onValueChange={setFilterValue}
            />
            <Tabs
              className="max-w-full"
              classNames={{
                tabList:
                  "bg-content2/60 border border-default-200/40 px-1 py-1",
              }}
              color="primary"
              radius="full"
              selectedKey={statusFilter}
              variant="bordered"
              onSelectionChange={(key) => setStatusFilter(key as StatusFilter)}
            >
              {STATUS_TABS.map((tab) => (
                <Tab
                  key={tab.key}
                  title={
                    <div className="flex items-center gap-2">
                      <span>{tab.label}</span>
                      <Chip
                        className="text-xs"
                        color={STATUS_CHIP_COLOR[tab.key]}
                        size="sm"
                        variant="flat"
                      >
                        {statusTotals[tab.key].toLocaleString("th-TH")}
                      </Chip>
                    </div>
                  }
                />
              ))}
            </Tabs>
          </div>

          <Divider className="bg-default-200/40" />

          <Table
            isStriped
            removeWrapper
            aria-label="Booking history table"
            bottomContent={
              sortedBookings.length ? (
                <div className="flex flex-col items-center justify-between gap-3 py-4 text-default-500 sm:flex-row">
                  <div className="flex flex-col items-center gap-1 text-center sm:items-start sm:text-left">
                    <span className="text-xs">
                      หน้า {page.toLocaleString("th-TH")} จาก{" "}
                      {pages.toLocaleString("th-TH")}
                    </span>
                    <span className="text-xs text-default-400">
                      แสดง {pageStart.toLocaleString("th-TH")} -{" "}
                      {pageEnd.toLocaleString("th-TH")} จาก{" "}
                      {sortedBookings.length.toLocaleString("th-TH")} รายการ{" "}
                      (จำกัด {ROWS_PER_PAGE.toLocaleString("th-TH")}{" "}
                      รายการต่อหน้า)
                    </span>
                  </div>
                  <Pagination
                    showControls
                    classNames={{
                      base: "bg-content2/70 border border-default-200/40 rounded-full px-2 py-1",
                    }}
                    isDisabled={pages <= 1}
                    page={page}
                    total={pages}
                    onChange={setPage}
                  />
                </div>
              ) : null
            }
            className="min-w-full"
            classNames={{
              th: "text-xs uppercase text-default-500",
              tr: "border-b border-default-200/10",
            }}
            sortDescriptor={sortDescriptor}
            topContentPlacement="outside"
            onSortChange={(descriptor) => {
              setSortDescriptor(descriptor as SortDescriptor);
            }}
          >
            <TableHeader columns={COLUMNS}>
              {(column) => (
                <TableColumn
                  key={column.key}
                  allowsSorting={column.allowsSorting}
                >
                  {column.label}
                </TableColumn>
              )}
            </TableHeader>
            <TableBody
              emptyContent="ไม่พบรายการการจอง"
              items={items}
              loadingContent={<Spinner label="กำลังโหลดข้อมูล..." />}
              loadingState={isLoading ? "loading" : "idle"}
            >
              {(item) => (
                <TableRow key={item.id}>
                  {(columnKey) => (
                    <TableCell>{renderCell(item, columnKey)}</TableCell>
                  )}
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardBody>
      </Card>
    </section>
  );
};
