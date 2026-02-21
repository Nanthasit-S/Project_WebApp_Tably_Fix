import type { SortDescriptor } from "@react-types/shared";

import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type Key,
} from "react";
import {
  Table,
  TableHeader,
  TableColumn,
  TableBody,
  TableRow,
  TableCell,
} from "@heroui/table";
import { DatePicker } from "@heroui/date-picker";
import { parseDate } from "@internationalized/date";
import { Card, CardBody, CardHeader } from "@heroui/card";
import { Tabs, Tab } from "@heroui/tabs";
import { Input } from "@heroui/input";
import { Select, SelectItem } from "@heroui/select";
import { Button } from "@heroui/button";
import { Chip } from "@heroui/chip";
import { Pagination } from "@heroui/pagination";
import {
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
} from "@heroui/modal";
import { Image } from "@heroui/image";
import { Divider } from "@heroui/divider";
import { Spinner } from "@heroui/spinner";

import {
  CancelIcon,
  CheckIcon,
  EditIcon,
  EyeIcon,
  PlusIcon,
  SearchIcon,
} from "./TableIcons";

import { useNotification } from "@/lib/NotificationContext";

interface DbTable {
  id: number;
  table_number: string;
  capacity: number;
  zone_id: number;
  zone_name: string;
  booking_id: number | null;
  booking_status: string | null;
  booked_by_user_id: number | null;
  booked_by_user_name: string | null;
  slip_image_url: string | null;
}

interface DbZone {
  id: number;
  name: string;
}

type TableStatus =
  | "available"
  | "awaiting_confirmation"
  | "pending_payment"
  | "confirmed"
  | "cancelled";

type TableStatusFilter = "all" | TableStatus;

const STATUS_LABELS: Record<TableStatus, string> = {
  available: "ว่างพร้อมจอง",
  awaiting_confirmation: "รอเช็กสลิป",
  pending_payment: "รอการชำระเงิน",
  confirmed: "ยืนยันแล้ว",
  cancelled: "ยกเลิกแล้ว",
};

const STATUS_CHIP_COLOR: Record<
  TableStatus,
  "default" | "primary" | "danger" | "success" | "warning"
> = {
  available: "success",
  awaiting_confirmation: "warning",
  pending_payment: "primary",
  confirmed: "primary",
  cancelled: "danger",
};

const TABLE_COLUMNS: Array<{ key: Key; label: string; sortable?: boolean }> = [
  { key: "table_number", label: "หมายเลขโต๊ะ", sortable: true },
  { key: "zone_name", label: "โซน", sortable: true },
  { key: "capacity", label: "จำนวนที่นั่ง", sortable: true },
  { key: "booking_status", label: "สถานะการจอง", sortable: true },
  { key: "booked_by_user_name", label: "ผู้จอง", sortable: true },
  { key: "actions", label: "การจัดการ" },
];

const STATUS_TABS: Array<{ key: TableStatusFilter; label: string }> = [
  { key: "all", label: "ทั้งหมด" },
  { key: "available", label: "ว่าง" },
  { key: "awaiting_confirmation", label: "รอเช็กสลิป" },
  { key: "pending_payment", label: "รอชำระเงิน" },
  { key: "confirmed", label: "ยืนยันแล้ว" },
  { key: "cancelled", label: "ยกเลิก" },
];

const ROWS_PER_PAGE = 8;

type ModalState =
  | { type: "add" }
  | { type: "edit"; table: DbTable }
  | { type: "slip"; table: DbTable }
  | { type: "confirm"; table: DbTable }
  | { type: "cancel"; table: DbTable }
  | null;

const getInitials = (name?: string | null) =>
  name
    ?.split(" ")
    .filter(Boolean)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("")
    .slice(0, 2) || "-";

const buildSlipImageSrc = (url?: string | null) => {
  if (!url) {
    return null;
  }

  if (url.startsWith("https://profile.line-scdn.net")) {
    return `/api/image-proxy?url=${encodeURIComponent(url)}`;
  }

  return url;
};

export const TableManagement: React.FC = () => {
  const { showNotification } = useNotification();
  const [tables, setTables] = useState<DbTable[]>([]);
  const [zones, setZones] = useState<DbZone[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filterValue, setFilterValue] = useState("");
  const [statusFilter, setStatusFilter] = useState<TableStatusFilter>("all");
  const [zoneFilter, setZoneFilter] = useState<string>("all");
  const [minCapacity, setMinCapacity] = useState("");
  const [selectedDate, setSelectedDate] = useState(() =>
    new Date().toISOString().slice(0, 10),
  );
  const [sortDescriptor, setSortDescriptor] = useState<SortDescriptor>({
    column: "table_number",
    direction: "ascending",
  });
  const [page, setPage] = useState(1);
  const [modalState, setModalState] = useState<ModalState>(null);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [editTable, setEditTable] = useState<DbTable | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const selectedDateValue = useMemo(
    () => (selectedDate ? parseDate(selectedDate) : null),
    [selectedDate],
  );


  const handleCloseModals = () => {
        setIsDeleteConfirmOpen(false);
        setEditTable(null);
  };

  const [newTableNumber, setNewTableNumber] = useState("");
  const [newTableCapacity, setNewTableCapacity] = useState("2");
  const [addSelectedZone, setAddSelectedZone] = useState("");
  const [editCapacity, setEditCapacity] = useState("");
  const [editZone, setEditZone] = useState("");

  const normalizeStatus = useCallback((status: string | null | undefined) => {
    if (
      status === "available" ||
      status === "awaiting_confirmation" ||
      status === "pending_payment" ||
      status === "confirmed" ||
      status === "cancelled"
    ) {
      return status;
    }

    return "available";
  }, []);

  const fetchTables = useCallback(
    async (date: string) => {
      setIsLoading(true);
      try {
        const response = await fetch(
          `/api/admin/tables-manage?date=${encodeURIComponent(date)}`,
        );
        const payload = await response.json().catch(() => null);

        if (!response.ok || !payload) {
          const message =
            payload && typeof payload === "object" && "message" in payload
              ? String(payload.message ?? "")
              : "";

          throw new Error(message || "ไม่สามารถโหลดข้อมูลโต๊ะได้");
        }

        const zoneList: DbZone[] = Array.isArray(payload.zones)
          ? payload.zones
          : [];
        const tableList: DbTable[] = Array.isArray(payload.tables)
          ? payload.tables
          : [];

        const zoneMap = new Map<number, string>(
          zoneList.map((zone) => [zone.id, zone.name]),
        );

        setZones(zoneList);
        setTables(
          tableList.map((table) => ({
            ...table,
            zone_name: zoneMap.get(table.zone_id) ?? "N/A",
          })),
        );
      } catch (error) {
        showNotification(
          "โหลดข้อมูลโต๊ะไม่สำเร็จ",
          error instanceof Error ? error.message : "กรุณาลองใหม่อีกครั้ง",
          "error",
        );
      } finally {
        setIsLoading(false);
      }
    },
    [showNotification],
  );

  const handleDeleteTable = async () => {
    if (!editTable) return;

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/admin/tables-manage", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tableId: editTable.id }), 
      });

      console.log(res.status);

      if (res.ok) {
        handleCloseModals(); 
        fetchTables(selectedDate);
      } else {
        const errorData = await res.json();
        showNotification(
          "ลบโต๊ะไม่สำเร็จ",
          errorData instanceof Error ? errorData.message : "กรุณาลองใหม่อีกครั้ง",
          "error",
        );
      }
    } catch (error) {
      showNotification(
        "ลบโต๊ะไม่สำเร็จ",
        error instanceof Error ? error.message : "กรุณาลองใหม่อีกครั้ง",
        "error",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    fetchTables(selectedDate);
  }, [fetchTables, selectedDate]);

  const statusTotals = useMemo(() => {
    return tables.reduce<Record<TableStatusFilter, number>>(
      (acc, table) => {
        acc.all += 1;
        const status = normalizeStatus(table.booking_status);

        acc[status] += 1;

        return acc;
      },
      {
        all: 0,
        available: 0,
        awaiting_confirmation: 0,
        pending_payment: 0,
        confirmed: 0,
        cancelled: 0,
      },
    );
  }, [normalizeStatus, tables]);

  const occupancyRate = useMemo(() => {
    if (!tables.length) return 0;
    const occupied = tables.reduce((total, table) => {
      return normalizeStatus(table.booking_status) === "available"
        ? total
        : total + 1;
    }, 0);

    return Math.round((occupied / tables.length) * 100);
  }, [normalizeStatus, tables]);

  const filteredTables = useMemo(() => {
    const keyword = filterValue.trim().toLowerCase();

    return tables.filter((table) => {
      const status = normalizeStatus(table.booking_status);
      const matchesStatus = statusFilter === "all" || statusFilter === status;

      const matchesZone =
        zoneFilter === "all" || table.zone_id === Number(zoneFilter);

      const matchesCapacity =
        !minCapacity || table.capacity >= Number(minCapacity);

      const matchesKeyword =
        !keyword ||
        table.table_number.toLowerCase().includes(keyword) ||
        (table.booked_by_user_name
          ? table.booked_by_user_name.toLowerCase().includes(keyword)
          : false);

      return matchesStatus && matchesZone && matchesCapacity && matchesKeyword;
    });
  }, [
    filterValue,
    tables,
    normalizeStatus,
    statusFilter,
    zoneFilter,
    minCapacity,
  ]);

  const sortedTables = useMemo(() => {
    const direction = sortDescriptor.direction === "ascending" ? 1 : -1;

    return [...filteredTables].sort((a, b) => {
      const first = (a as any)[sortDescriptor.column];
      const second = (b as any)[sortDescriptor.column];

      if (typeof first === "number" && typeof second === "number") {
        return (first - second) * direction;
      }

      return (
        String(first ?? "").localeCompare(String(second ?? ""), "th") *
        direction
      );
    });
  }, [filteredTables, sortDescriptor]);

  const pages = Math.max(1, Math.ceil(sortedTables.length / ROWS_PER_PAGE));

  const pageItems = useMemo(() => {
    const start = (page - 1) * ROWS_PER_PAGE;

    return sortedTables.slice(start, start + ROWS_PER_PAGE);
  }, [page, sortedTables]);

  useEffect(() => {
    const maxPage = Math.max(1, Math.ceil(sortedTables.length / ROWS_PER_PAGE));

    if (page > maxPage) {
      setPage(maxPage);
    }
  }, [page, sortedTables.length]);

  useEffect(() => {
    setPage(1);
  }, [filterValue, statusFilter, zoneFilter, minCapacity]);

  const openAddModal = useCallback(() => {
    setNewTableNumber("");
    setNewTableCapacity("2");
    setAddSelectedZone("");
    setModalState({ type: "add" });
  }, []);

  const openEditModal = useCallback((table: DbTable) => {
    setEditCapacity(String(table.capacity));
    setEditZone(String(table.zone_id));
    setModalState({ type: "edit", table });
  }, []);

  const openSlipModal = useCallback((table: DbTable) => {
    setModalState({ type: "slip", table });
  }, []);

  const openConfirmModal = useCallback((table: DbTable) => {
    setModalState({ type: "confirm", table });
  }, []);

  const openCancelModal = useCallback((table: DbTable) => {
    setModalState({ type: "cancel", table });
  }, []);

  const closeModal = useCallback(() => {
    setModalState(null);
    setIsSubmitting(false);
  }, []);

  const handleAddTable = useCallback(
    async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      if (!newTableNumber.trim() || !newTableCapacity || !addSelectedZone) {
        showNotification(
          "ข้อมูลไม่ครบ",
          "กรุณากรอกหมายเลขโต๊ะ, ความจุ, และเลือกโซน",
          "error",
        );

        return;
      }

      setIsSubmitting(true);
      try {
        const response = await fetch("/api/admin/tables-manage", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            table_number: newTableNumber.trim(),
            capacity: Number(newTableCapacity),
            zone_id: Number(addSelectedZone),
          }),
        });

        const payload = await response.json().catch(() => null);

        if (!response.ok) {
          const message =
            payload && typeof payload === "object" && "message" in payload
              ? String(payload.message ?? "")
              : "";

          throw new Error(message || "เพิ่มโต๊ะไม่สำเร็จ");
        }

        showNotification("เพิ่มโต๊ะใหม่", "เพิ่มโต๊ะเรียบร้อยแล้ว", "success");
        closeModal();
        await fetchTables(selectedDate);
      } catch (error) {
        showNotification(
          "ไม่สามารถเพิ่มโต๊ะได้",
          error instanceof Error ? error.message : "กรุณาลองใหม่อีกครั้ง",
          "error",
        );
      } finally {
        setIsSubmitting(false);
      }
    },
    [
      addSelectedZone,
      closeModal,
      fetchTables,
      newTableCapacity,
      newTableNumber,
      selectedDate,
      showNotification,
    ],
  );

  const handleEditTable = useCallback(
    async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      if (modalState?.type !== "edit") return;
      if (!editCapacity || !editZone) {
        showNotification(
          "ข้อมูลไม่ครบ",
          "กรุณากรอกความจุและเลือกโซนสำหรับโต๊ะ",
          "error",
        );

        return;
      }

      setIsSubmitting(true);
      try {
        const response = await fetch("/api/admin/tables-manage", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ids: [modalState.table.id],
            capacity: Number(editCapacity),
            zone_id: Number(editZone),
          }),
        });

        const payload = await response.json().catch(() => null);

        if (!response.ok) {
          const message =
            payload && typeof payload === "object" && "message" in payload
              ? String(payload.message ?? "")
              : "";

          throw new Error(message || "บันทึกการแก้ไขไม่สำเร็จ");
        }

        showNotification(
          "บันทึกข้อมูลสำเร็จ",
          `ปรับปรุงโต๊ะ ${modalState.table.table_number} แล้ว`,
          "success",
        );
        closeModal();
        await fetchTables(selectedDate);
      } catch (error) {
        showNotification(
          "บันทึกข้อมูลไม่สำเร็จ",
          error instanceof Error ? error.message : "กรุณาลองใหม่",
          "error",
        );
      } finally {
        setIsSubmitting(false);
      }
    },
    [
      closeModal,
      editCapacity,
      editZone,
      fetchTables,
      modalState,
      selectedDate,
      showNotification,
    ],
  );

  const handleConfirmBooking = useCallback(async () => {
    if (modalState?.type !== "confirm" || !modalState.table.booking_id) {
      return;
    }
    setIsSubmitting(true);
    try {
      const response = await fetch("/api/admin/confirm-booking", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingId: modalState.table.booking_id }),
      });
      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        const message =
          payload && typeof payload === "object" && "message" in payload
            ? String(payload.message ?? "")
            : "";

        throw new Error(message || "ยืนยันการจองไม่สำเร็จ");
      }

      showNotification(
        "ยืนยันการจอง",
        `อนุมัติการจองโต๊ะ ${modalState.table.table_number} แล้ว`,
        "success",
      );
      closeModal();
      await fetchTables(selectedDate);
    } catch (error) {
      showNotification(
        "ยืนยันการจองไม่สำเร็จ",
        error instanceof Error ? error.message : "กรุณาลองใหม่",
        "error",
      );
    } finally {
      setIsSubmitting(false);
    }
  }, [closeModal, fetchTables, modalState, selectedDate, showNotification]);

  const handleCancelBooking = useCallback(async () => {
    if (modalState?.type !== "cancel" || !modalState.table.booking_id) {
      return;
    }
    setIsSubmitting(true);
    try {
      const response = await fetch("/api/admin/cancel-booking", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bookingId: modalState.table.booking_id,
          userId: modalState.table.booked_by_user_id,
          tableName: modalState.table.table_number,
        }),
      });
      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        const message =
          payload && typeof payload === "object" && "message" in payload
            ? String(payload.message ?? "")
            : "";

        throw new Error(message || "ยกเลิกการจองไม่สำเร็จ");
      }

      showNotification(
        "ยกเลิกการจอง",
        `ยกเลิกโต๊ะ ${modalState.table.table_number} และคืนสถานะว่างแล้ว`,
        "success",
      );
      closeModal();
      await fetchTables(selectedDate);
    } catch (error) {
      showNotification(
        "ยกเลิกการจองไม่สำเร็จ",
        error instanceof Error ? error.message : "กรุณาลองใหม่",
        "error",
      );
    } finally {
      setIsSubmitting(false);
    }
  }, [closeModal, fetchTables, modalState, selectedDate, showNotification]);

  const renderCell = useCallback(
    (table: DbTable, columnKey: Key) => {
      switch (columnKey) {
        case "table_number":
          return (
            <span className="font-semibold text-foreground">
              โต๊ะ {table.table_number}
            </span>
          );
        case "zone_name":
          return (
            <span className="text-sm text-default-500">{table.zone_name}</span>
          );
        case "capacity":
          return (
            <span className="text-sm text-default-500">
              {table.capacity.toLocaleString("th-TH")} ที่นั่ง
            </span>
          );
        case "booking_status": {
          const status = normalizeStatus(table.booking_status);
          const color = STATUS_CHIP_COLOR[status];

          return (
            <Chip
              className="font-medium"
              color={color}
              size="sm"
              variant="flat"
            >
              {STATUS_LABELS[status]}
            </Chip>
          );
        }
        case "booked_by_user_name":
          return table.booked_by_user_name ? (
            <div className="flex flex-col text-sm">
              <span className="font-medium text-foreground">
                {table.booked_by_user_name}
              </span>
              <span className="text-xs text-default-400">
                โต๊ะในโซน {table.zone_name}
              </span>
            </div>
          ) : (
            <span className="text-sm text-default-400">-</span>
          );
        case "actions":
          return (
            <div className="flex flex-wrap items-center gap-2">
              <Button
                color="primary"
                size="sm"
                startContent={<EditIcon />}
                variant="flat"
                onPress={() => openEditModal(table)}
              >
                แก้ไข
              </Button>
              <Button
                color="primary"
                isDisabled={!table.slip_image_url}
                size="sm"
                startContent={<EyeIcon />}
                variant="flat"
                onPress={() => openSlipModal(table)}
              >
                สลิป
              </Button>
              <Button
                color="success"
                isDisabled={!table.booking_id}
                size="sm"
                startContent={<CheckIcon />}
                variant="flat"
                onPress={() => openConfirmModal(table)}
              >
                ยืนยัน
              </Button>
              <Button
                color="danger"
                isDisabled={!table.booking_id}
                size="sm"
                startContent={<CancelIcon />}
                variant="flat"
                onPress={() => openCancelModal(table)}
              >
                ยกเลิก
              </Button>
            </div>
          );
        default:
          return (
            <span className="text-sm text-default-500">
              {(table as any)[columnKey as string] ?? "-"}
            </span>
          );
      }
    },
    [
      normalizeStatus,
      openCancelModal,
      openConfirmModal,
      openEditModal,
      openSlipModal,
    ],
  );

  return (
    <section className="flex flex-col gap-8">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border border-default-200/20 bg-content1/60">
          <CardHeader className="text-xs uppercase text-default-500">
            โต๊ะทั้งหมด
          </CardHeader>
          <CardBody className="flex flex-col gap-1">
            <span className="text-3xl font-semibold text-foreground">
              {tables.length.toLocaleString("th-TH")}
            </span>
            <span className="text-xs text-default-500">
              รวมจำนวนโต๊ะที่เปิดให้จอง
            </span>
          </CardBody>
        </Card>
        <Card className="border border-success-500/30 bg-success-500/10">
          <CardHeader className="text-xs uppercase text-success-100">
            อัตราการใช้งาน
          </CardHeader>
          <CardBody className="flex flex-col gap-1">
            <span className="text-3xl font-semibold text-success-50">
              {occupancyRate.toLocaleString("th-TH")}%
            </span>
            <span className="text-xs text-success-100/80">
              เปรียบเทียบจำนวนโต๊ะที่ถูกจอง
            </span>
          </CardBody>
        </Card>
        <Card className="border border-warning-500/30 bg-warning-500/10">
          <CardHeader className="text-xs uppercase text-warning-100">
            รอเช็กสลิป
          </CardHeader>
          <CardBody className="flex flex-col gap-1">
            <span className="text-3xl font-semibold text-warning-50">
              {statusTotals.awaiting_confirmation.toLocaleString("th-TH")}
            </span>
            <span className="text-xs text-warning-100/80">
              จำนวนรายการที่ต้องตรวจสอบ
            </span>
          </CardBody>
        </Card>
        <Card className="border border-danger-500/30 bg-danger-500/10">
          <CardHeader className="text-xs uppercase text-danger-100">
            ถูกยกเลิก
          </CardHeader>
          <CardBody className="flex flex-col gap-1">
            <span className="text-3xl font-semibold text-danger-50">
              {statusTotals.cancelled.toLocaleString("th-TH")}
            </span>
            <span className="text-xs text-danger-100/80">
              ยอดการจองที่ถูกยกเลิกทั้งหมด
            </span>
          </CardBody>
        </Card>
      </div>

      <Card className="border border-default-200/20 bg-content1/70 backdrop-blur">
        <CardHeader className="flex flex-col gap-4 pb-0">
          <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-col gap-1">
              <h3 className="text-2xl font-semibold text-foreground">
                ผังโต๊ะและสถานะ
              </h3>
              <p className="text-sm text-default-500">
                กรอง, ดูสลิป, และจัดการการจองแบบเรียลไทม์
              </p>
            </div>
            <div className="flex items-center gap-2">
              <DatePicker
                label="วันที่"
                size="sm"
                value={selectedDateValue ?? undefined}
                variant="bordered"
                onChange={(value) => {
                  if (!value) return;

                  setSelectedDate(value.toString());
                  setPage(1);
                }}
              />
              <Button
                color="primary"
                radius="full"
                startContent={<PlusIcon />}
                onPress={openAddModal}
              >
                เพิ่มโต๊ะใหม่
              </Button>
            </div>
          </div>

          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <Input
              isClearable
              classNames={{
                inputWrapper: "bg-content2/80 border-default-200/40",
              }}
              placeholder="ค้นหาหมายเลขโต๊ะหรือชื่อผู้จอง"
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
            <div className="flex flex-wrap items-center gap-3">
              <Select
                label="โซน"
                selectedKeys={new Set([zoneFilter])}
                size="sm"
                variant="bordered"
                onSelectionChange={(keys) => {
                  const value = Array.from(keys)[0] as string;

                  setZoneFilter(value);
                }}
                items={[{ id: "all", name: "ทุกโซน" }, ...zones]}
              >
                {(item) => <SelectItem key={item.id}>{item.name}</SelectItem>}
              </Select>
              <Input
                label="ความจุขั้นต่ำ"
                min={0}
                size="sm"
                type="number"
                value={minCapacity}
                variant="bordered"
                onValueChange={setMinCapacity}
              />
            </div>
          </div>

          <Tabs
            classNames={{
              tabList:
                "border border-default-200/40 bg-content2/70 px-1 py-1 max-w-full overflow-x-auto",
            }}
            radius="full"
            selectedKey={statusFilter}
            variant="bordered"
            onSelectionChange={(key) =>
              setStatusFilter(key as TableStatusFilter)
            }
          >
            {STATUS_TABS.map((tab) => (
              <Tab
                key={tab.key}
                title={
                  <div className="flex items-center gap-2">
                    <span>{tab.label}</span>
                    <Chip
                      className="text-xs"
                      color={
                        tab.key === "all"
                          ? "default"
                          : STATUS_CHIP_COLOR[tab.key as TableStatus]
                      }
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
        </CardHeader>
        <CardBody className="pt-6">
          <Table
            isStriped
            removeWrapper
            aria-label="Table management dataset"
            bottomContent={
              pages > 1 ? (
                <div className="flex flex-col items-center justify-between gap-3 py-4 text-default-500 sm:flex-row">
                  <span className="text-xs">
                    หน้า {page.toLocaleString("th-TH")} จาก {pages.toLocaleString("th-TH")}
                  </span>
                  <Pagination
                    showControls
                    classNames={{
                      base: "bg-content2/70 border border-default-200/40 rounded-full px-2 py-1",
                    }}
                    page={page}
                    total={pages}
                    onChange={setPage}
                  />
                </div>
              ) : null
            }
            classNames={{
              th: "text-xs uppercase text-default-500",
              tr: "border-b border-default-200/10",
            }}
            sortDescriptor={sortDescriptor}
            onSortChange={(descriptor) =>
              setSortDescriptor(descriptor as SortDescriptor)
            }
          >
            <TableHeader columns={TABLE_COLUMNS}>
              {(column) => (
                <TableColumn key={column.key} allowsSorting={column.sortable}>
                  {column.label}
                </TableColumn>
              )}
            </TableHeader>
            <TableBody
              emptyContent="ไม่พบข้อมูลโต๊ะตามเงื่อนไขที่เลือก"
              items={pageItems}
              loadingContent={<Spinner label="กำลังโหลดข้อมูลโต๊ะ..." />}
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

      <Modal
        backdrop="blur"
        isOpen={modalState?.type === "add"}
        onClose={closeModal}
      >
        <ModalContent>
          {(close) => (
            <>
              <ModalHeader className="flex flex-col gap-1">
                เพิ่มโต๊ะใหม่
                <span className="text-sm font-normal text-default-500">
                  กำหนดหมายเลขโต๊ะ, ความจุ, และโซนที่ต้องการ
                </span>
              </ModalHeader>
              <form onSubmit={handleAddTable}>
                <ModalBody className="space-y-4">
                  <Input
                    autoFocus
                    label="หมายเลขโต๊ะ"
                    placeholder="ป้อนหมายเลขโต๊ะ"
                    variant="bordered"
                    value={newTableNumber}
                    onValueChange={setNewTableNumber}
                  />
                  <Input
                    label="ความจุ"
                    min={1}
                    type="number"
                    variant="bordered"
                    value={newTableCapacity}
                    onValueChange={setNewTableCapacity}
                  />
                  <Select
                    label="โซน"
                    placeholder="เลือกโซน"
                    selectedKeys={new Set([addSelectedZone])}
                    variant="bordered"
                    onSelectionChange={(keys) => {
                      const value = Array.from(keys)[0] as string;

                      setAddSelectedZone(value);
                    }}
                    items={zones}
                  >
                    {(zone) => (
                      <SelectItem key={zone.id}>{zone.name}</SelectItem>
                    )}
                  </Select>
                </ModalBody>
                <ModalFooter>
                  <Button
                    variant="light"
                    onPress={() => {
                      close();
                      closeModal();
                    }}
                  >
                    ยกเลิก
                  </Button>
                  <Button
                    color="primary"
                    isLoading={isSubmitting}
                    type="submit"
                  >
                    เพิ่มโต๊ะ
                  </Button>
                </ModalFooter>
              </form>
            </>
          )}
        </ModalContent>
      </Modal>

      <Modal
        backdrop="blur"
        isOpen={modalState?.type === "edit"}
        onClose={closeModal}
      >
        <ModalContent>
          {(close) =>
            modalState?.type === "edit" ? (
              <>
                <ModalHeader className="flex flex-col gap-1">
                  แก้ไขโต๊ะ {modalState.table.table_number}
                </ModalHeader>
                <form onSubmit={handleEditTable}>
                  <ModalBody className="space-y-4">
                    <Input
                      autoFocus
                      label="ความจุ"
                      min={1}
                      type="number"
                      variant="bordered"
                      value={editCapacity}
                      onValueChange={setEditCapacity}
                    />
                    <Select
                      label="โซน"
                      placeholder="เลือกโซน"
                      selectedKeys={new Set([editZone])}
                      variant="bordered"
                      onSelectionChange={(keys) => {
                        const value = Array.from(keys)[0] as string;

                        setEditZone(value);
                      }}
                      items={zones}
                    >
                      {(zone) => (
                        <SelectItem key={zone.id}>{zone.name}</SelectItem>
                      )}
                    </Select>
                  </ModalBody>
                  <ModalFooter>
                    <Button
                      variant="light"
                      onPress={() => {
                        close();
                        closeModal();
                      }}
                    > 
                      ยกเลิก
                    </Button>
                    <Button
                      color="danger"
                      onPress={() => {
                        if (modalState?.type === "edit") {
                          setEditTable(modalState.table);
                        }
                        setIsDeleteConfirmOpen(true);
                        close();
                      }}
                      disabled={isSubmitting}
                    >
                      ลบโต๊ะ
                    </Button>
                    <Button
                      color="primary"
                      isLoading={isSubmitting}
                      type="submit"
                    >
                      บันทึกการเปลี่ยนแปลง
                    </Button>
                  </ModalFooter>
                </form>
              </>
            ) : null
          }
        </ModalContent>
      </Modal>

      <Modal
        isOpen={isDeleteConfirmOpen}
        onClose={handleCloseModals}
        size="md"
      >
        <ModalContent>
          <ModalHeader>
            <h3 className="text-lg font-semibold">ยืนยันการลบโต๊ะ</h3>
          </ModalHeader>
          <ModalBody>
            <p>
              คุณแน่ใจหรือไม่ว่าต้องการลบโต๊ะ{" "}
              <strong>{editTable?.table_number}</strong>?
            </p>
            <p className="text-sm text-danger-500">
              การกระทำนี้ไม่สามารถย้อนกลับได้ และจะลบได้ก็ต่อเมื่อ
              โต๊ะนี้ไม่เคยมีการจองใดๆ มาก่อน
            </p>
          </ModalBody>
          <ModalFooter>
            <Button
              variant="light"
              onPress={handleCloseModals}
              disabled={isSubmitting}
            >
              ยกเลิก
            </Button>
            <Button
              color="danger"
              onPress={handleDeleteTable} 
              isLoading={isSubmitting}
            >
              {isSubmitting ? "กำลังลบ..." : "ยืนยันการลบ"}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      <Modal
        backdrop="blur"
        isOpen={modalState?.type === "slip"}
        scrollBehavior="inside"
        size="lg"
        onClose={closeModal}
      >
        <ModalContent>
          {(close) =>
            modalState?.type === "slip" ? (
              <>
                <ModalHeader className="flex flex-col">
                  สลิปโอนเงิน · โต๊ะ {modalState.table.table_number}
                  <span className="text-sm font-normal text-default-500">
                    {modalState.table.booked_by_user_name ??
                      `ลูกค้า ${getInitials(
                        modalState.table.booked_by_user_name,
                      )}`}
                  </span>
                </ModalHeader>
                <ModalBody className="space-y-4">
                  {(() => {
                    const slipImageSrc = buildSlipImageSrc(
                      modalState.table.slip_image_url,
                    );

                    if (!slipImageSrc) {
                      return (
                        <div className="rounded-2xl border border-default-200/40 bg-content1/60 p-6 text-center text-sm text-default-500">
                          ไม่มีไฟล์สลิปอัปโหลดไว้
                        </div>
                      );
                    }

                    return (
                      <Image
                        alt="หลักฐานการชำระเงิน"
                        className="rounded-2xl"
                        src={slipImageSrc}
                      />
                    );
                  })()}
                </ModalBody>
                <ModalFooter>
                  <Button
                    color="primary"
                    variant="light"
                    onPress={() => {
                      close();
                      closeModal();
                    }}
                  >
                    ปิด
                  </Button>
                </ModalFooter>
              </>
            ) : null
          }
        </ModalContent>
      </Modal>

      <Modal
        backdrop="blur"
        isOpen={modalState?.type === "confirm"}
        onClose={closeModal}
      >
        <ModalContent>
          {(close) =>
            modalState?.type === "confirm" ? (
              <>
                <ModalHeader>ยืนยันการจองโต๊ะ</ModalHeader>
                <ModalBody className="space-y-3 text-sm text-default-500">
                  <p>
                    ยืนยันอนุมัติการจองโต๊ะ{" "}
                    <strong className="text-foreground">
                      {modalState.table.table_number}
                    </strong>{" "}
                    สำหรับลูกค้า{" "}
                    <strong className="text-foreground">
                      {modalState.table.booked_by_user_name ??
                        getInitials(modalState.table.booked_by_user_name)}
                    </strong>
                    ?
                  </p>
                  <Divider />
                  <p className="text-xs text-default-400">
                    ระบบจะส่งการแจ้งเตือนไปยังลูกค้าและปรับสถานะโต๊ะเป็น
                    "ยืนยันแล้ว"
                  </p>
                </ModalBody>
                <ModalFooter>
                  <Button
                    variant="light"
                    onPress={() => {
                      close();
                      closeModal();
                    }}
                  >
                    ยกเลิก
                  </Button>
                  <Button
                    color="success"
                    isLoading={isSubmitting}
                    onPress={handleConfirmBooking}
                  >
                    ยืนยัน
                  </Button>
                </ModalFooter>
              </>
            ) : null
          }
        </ModalContent>
      </Modal>

      <Modal
        backdrop="blur"
        isOpen={modalState?.type === "cancel"}
        onClose={closeModal}
      >
        <ModalContent>
          {(close) =>
            modalState?.type === "cancel" ? (
              <>
                <ModalHeader>ยกเลิกการจองโต๊ะ</ModalHeader>
                <ModalBody className="space-y-3 text-sm text-default-500">
                  <p>
                    ยืนยันยกเลิกการจองโต๊ะ{" "}
                    <strong className="text-foreground">
                      {modalState.table.table_number}
                    </strong>{" "}
                    และคืนสถานะเป็นว่างหรือไม่?
                  </p>
                  <p>
                    ลูกค้า:{" "}
                    <strong className="text-foreground">
                      {modalState.table.booked_by_user_name ??
                        getInitials(modalState.table.booked_by_user_name)}
                    </strong>
                  </p>
                  <Divider />
                  <p className="text-xs text-default-400">
                    ระบบจะส่งการแจ้งเตือนไปยังลูกค้า
                    และบันทึกการยกเลิกไว้ในประวัติ
                  </p>
                </ModalBody>
                <ModalFooter>
                  <Button
                    variant="light"
                    onPress={() => {
                      close();
                      closeModal();
                    }}
                  >
                    ย้อนกลับ
                  </Button>
                  <Button
                    color="danger"
                    isLoading={isSubmitting}
                    onPress={handleCancelBooking}
                  >
                    ยืนยันการยกเลิก
                  </Button>
                </ModalFooter>
              </>
            ) : null
          }
        </ModalContent>
      </Modal>
    </section>
  );
};
