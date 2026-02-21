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
import { Card, CardBody, CardHeader } from "@heroui/card";
import { Input, Textarea } from "@heroui/input";
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
import { Spinner } from "@heroui/spinner";

import { DeleteIcon, EditIcon, PlusIcon, SearchIcon } from "./TableIcons";

import { useNotification } from "@/lib/NotificationContext";

interface DbZone {
  id: number;
  name: string;
  description?: string;
  booking_fee: number;
}

type ModalState =
  | { type: "add" }
  | { type: "edit"; zone: DbZone }
  | { type: "delete"; zone: DbZone }
  | null;

const ROWS_PER_PAGE = 8;
const TABLE_COLUMNS: Array<{ key: Key; label: string; sortable?: boolean }> = [
  { key: "name", label: "ชื่อโซน", sortable: true },
  { key: "description", label: "รายละเอียด" },
  { key: "booking_fee", label: "ค่าจอง", sortable: true },
  { key: "actions", label: "จัดการ" },
];

export const ZoneManagement: React.FC = () => {
  const { showNotification } = useNotification();
  const [zones, setZones] = useState<DbZone[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filterValue, setFilterValue] = useState("");
  const [sortDescriptor, setSortDescriptor] = useState<SortDescriptor>({
    column: "name",
    direction: "ascending",
  });
  const [page, setPage] = useState(1);
  const [modalState, setModalState] = useState<ModalState>(null);
  const [zoneName, setZoneName] = useState("");
  const [zoneDescription, setZoneDescription] = useState("");
  const [zoneFee, setZoneFee] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchZones = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/admin/tables-manage?entity=zones");
      const payload = await response.json().catch(() => null);

      if (!response.ok || !payload) {
        const message =
          payload && typeof payload === "object" && "message" in payload
            ? String(payload.message ?? "")
            : "";

        throw new Error(message || "ไม่สามารถโหลดข้อมูลโซนได้");
      }

      setZones(Array.isArray(payload.zones) ? payload.zones : []);
    } catch (error) {
      showNotification(
        "โหลดข้อมูลโซนไม่สำเร็จ",
        error instanceof Error ? error.message : "กรุณาลองใหม่อีกครั้ง",
        "error",
      );
    } finally {
      setIsLoading(false);
    }
  }, [showNotification]);

  useEffect(() => {
    fetchZones();
  }, [fetchZones]);

  const filteredZones = useMemo(() => {
    const keyword = filterValue.trim().toLowerCase();

    return zones.filter((zone) => zone.name.toLowerCase().includes(keyword));
  }, [zones, filterValue]);

  const sortedZones = useMemo(() => {
    const direction = sortDescriptor.direction === "ascending" ? 1 : -1;

    return [...filteredZones].sort((a, b) => {
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
  }, [filteredZones, sortDescriptor]);

  const pages = Math.max(1, Math.ceil(sortedZones.length / ROWS_PER_PAGE));

  const pageItems = useMemo(() => {
    const start = (page - 1) * ROWS_PER_PAGE;

    return sortedZones.slice(start, start + ROWS_PER_PAGE);
  }, [page, sortedZones]);

  useEffect(() => {
    const maxPage = Math.max(1, Math.ceil(sortedZones.length / ROWS_PER_PAGE));

    if (page > maxPage) {
      setPage(maxPage);
    }
  }, [page, sortedZones.length]);

  const totalFee = useMemo(
    () => zones.reduce((sum, zone) => sum + (zone.booking_fee || 0), 0),
    [zones],
  );

  const averageFee = zones.length
    ? Math.round((totalFee / zones.length) * 100) / 100
    : 0;

  const openAddModal = useCallback(() => {
    setZoneName("");
    setZoneDescription("");
    setZoneFee("");
    setModalState({ type: "add" });
  }, []);

  const openEditModal = useCallback((zone: DbZone) => {
    setZoneName(zone.name);
    setZoneDescription(zone.description ?? "");
    setZoneFee(zone.booking_fee ? String(zone.booking_fee) : "");
    setModalState({ type: "edit", zone });
  }, []);

  const openDeleteModal = useCallback((zone: DbZone) => {
    setModalState({ type: "delete", zone });
  }, []);

  const closeModal = useCallback(() => {
    setModalState(null);
    setIsSubmitting(false);
  }, []);

  const handleSave = useCallback(
    async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      if (!zoneName.trim()) {
        showNotification("ข้อมูลไม่ครบ", "กรุณากรอกชื่อโซน", "error");

        return;
      }

      setIsSubmitting(true);
      const isEdit = modalState?.type === "edit";
      const payload: Partial<DbZone> & { id?: number } = {
        name: zoneName.trim(),
        description: zoneDescription.trim() || undefined,
        booking_fee: Number(zoneFee) || 0,
      };

      if (modalState?.type === "edit") {
        payload.id = modalState.zone.id;
      }

      const endpoint = isEdit
        ? `/api/admin/tables-manage?entity=zones&id=${modalState.zone.id}`
        : "/api/admin/tables-manage?entity=zones";
      const method = isEdit ? "PUT" : "POST";

      try {
        const response = await fetch(endpoint, {
          method,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        const result = await response.json().catch(() => null);

        if (!response.ok) {
          const message =
            result && typeof result === "object" && "message" in result
              ? String(result.message ?? "")
              : "";

          throw new Error(
            message || (isEdit ? "แก้ไขโซนไม่สำเร็จ" : "เพิ่มโซนไม่สำเร็จ"),
          );
        }

        showNotification(
          isEdit ? "บันทึกการแก้ไข" : "เพิ่มโซนสำเร็จ",
          isEdit
            ? `อัปเดตข้อมูลโซน ${modalState.zone.name} แล้ว`
            : `สร้างโซน ${zoneName.trim()} เรียบร้อย`,
          "success",
        );
        closeModal();
        await fetchZones();
      } catch (error) {
        showNotification(
          isEdit ? "แก้ไขไม่สำเร็จ" : "เพิ่มโซนไม่สำเร็จ",
          error instanceof Error ? error.message : "กรุณาลองใหม่",
          "error",
        );
      } finally {
        setIsSubmitting(false);
      }
    },
    [
      closeModal,
      fetchZones,
      modalState,
      showNotification,
      zoneDescription,
      zoneFee,
      zoneName,
    ],
  );

  const handleDelete = useCallback(async () => {
    if (modalState?.type !== "delete") {
      return;
    }
    setIsSubmitting(true);
    try {
      const response = await fetch("/api/admin/tables-manage?entity=zones", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: modalState.zone.id }),
      });
      const result = await response.json().catch(() => null);

      if (!response.ok) {
        const message =
          result && typeof result === "object" && "message" in result
            ? String(result.message ?? "")
            : "";

        throw new Error(message || "ลบโซนไม่สำเร็จ");
      }

      showNotification(
        "ลบโซนแล้ว",
        `นำโซน ${modalState.zone.name} ออกจากระบบเรียบร้อย`,
        "success",
      );
      closeModal();
      await fetchZones();
    } catch (error) {
      showNotification(
        "ไม่สามารถลบได้",
        error instanceof Error ? error.message : "กรุณาลองใหม่",
        "error",
      );
    } finally {
      setIsSubmitting(false);
    }
  }, [closeModal, fetchZones, modalState, showNotification]);

  const renderCell = useCallback(
    (zone: DbZone, columnKey: Key) => {
      switch (columnKey) {
        case "name":
          return (
            <span className="font-semibold text-foreground">{zone.name}</span>
          );
        case "description":
          return (
            <span className="text-sm text-default-500">
              {zone.description || "-"}
            </span>
          );
        case "booking_fee":
          return (
            <span className="text-sm text-default-500">
              {(zone.booking_fee || 0).toLocaleString("th-TH", {
                minimumFractionDigits: 2,
              })}
            </span>
          );
        case "actions":
          return (
            <div className="flex items-center gap-2">
              <Button
                color="primary"
                size="sm"
                startContent={<EditIcon />}
                variant="flat"
                onPress={() => openEditModal(zone)}
              >
                แก้ไข
              </Button>
              <Button
                color="danger"
                size="sm"
                startContent={<DeleteIcon />}
                variant="flat"
                onPress={() => openDeleteModal(zone)}
              >
                ลบ
              </Button>
            </div>
          );
        default:
          return (
            <span className="text-sm text-default-500">
              {(zone as any)[columnKey as string] ?? "-"}
            </span>
          );
      }
    },
    [openDeleteModal, openEditModal],
  );

  return (
    <section className="flex flex-col gap-8">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border border-default-200/20 bg-content1/60">
          <CardHeader className="text-xs uppercase text-default-500">
            โซนทั้งหมด
          </CardHeader>
          <CardBody className="flex flex-col gap-1">
            <span className="text-3xl font-semibold text-foreground">
              {zones.length.toLocaleString("th-TH")}
            </span>
            <span className="text-xs text-default-500">
              จำนวนโซนที่เปิดให้งานจอง
            </span>
          </CardBody>
        </Card>
        <Card className="border border-default-200/20 bg-content1/60">
          <CardHeader className="text-xs uppercase text-default-500">
            ค่าใช้จ่ายรวม
          </CardHeader>
          <CardBody className="flex flex-col gap-1">
            <span className="text-3xl font-semibold text-foreground">
              {totalFee.toLocaleString("th-TH")}
            </span>
            <span className="text-xs text-default-500">
              รวม booking fee ทุกโซน
            </span>
          </CardBody>
        </Card>
        <Card className="border border-default-200/20 bg-content1/60">
          <CardHeader className="text-xs uppercase text-default-500">
            ค่าเฉลี่ยต่อโซน
          </CardHeader>
          <CardBody className="flex flex-col gap-1">
            <span className="text-3xl font-semibold text-foreground">
              {averageFee.toLocaleString("th-TH", { minimumFractionDigits: 2 })}
            </span>
            <span className="text-xs text-default-500">
              เฉลี่ย booking fee ต่อโซน
            </span>
          </CardBody>
        </Card>
        <Card className="border border-default-200/20 bg-content1/60">
          <CardHeader className="text-xs uppercase text-default-500">
            ฟิลเตอร์
          </CardHeader>
          <CardBody className="flex flex-wrap gap-2">
            <Chip className="text-xs" color="primary" variant="flat">
              คำค้นหา: {filterValue ? `"${filterValue}"` : "ทั้งหมด"}
            </Chip>
            <Chip className="text-xs" color="default" variant="flat">
              เรียงตาม:{" "}
              {sortDescriptor.column === "name" ? "ชื่อโซน" : "ค่า fee"}
            </Chip>
            <Chip className="text-xs" color="default" variant="flat">
              หน้า: {page.toLocaleString("th-TH")} /{" "}
              {pages.toLocaleString("th-TH")}
            </Chip>
          </CardBody>
        </Card>
      </div>

      <Card className="border border-default-200/20 bg-content1/70 backdrop-blur">
        <CardHeader className="flex flex-col gap-4 pb-0 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3 rounded-full border border-default-200/30 bg-content2/60 px-4 py-2">
            <span className="text-default-400">
              <SearchIcon />
            </span>
            <Input
              isClearable
              classNames={{
                inputWrapper: "border-none bg-transparent shadow-none",
              }}
              placeholder="ค้นหาโซน"
              value={filterValue}
              variant="bordered"
              onClear={() => setFilterValue("")}
              onValueChange={(value) => {
                setFilterValue(value);
                setPage(1);
              }}
            />
          </div>
          <div className="flex gap-2">
            <Button
              color="primary"
              radius="full"
              startContent={<PlusIcon />}
              onPress={openAddModal}
            >
              เพิ่มโซน
            </Button>
            <Button variant="flat" onPress={fetchZones}>
              รีเฟรช
            </Button>
          </div>
        </CardHeader>
        <CardBody className="pt-6">
          <Table
            isStriped
            removeWrapper
            aria-label="Zone management table"
            bottomContent={
              pages > 1 ? (
                <div className="flex flex-col items-center justify-between gap-3 py-4 text-default-500 sm:flex-row">
                  <span className="text-xs">
                    หน้า {page.toLocaleString("th-TH")} จาก{" "}
                    {pages.toLocaleString("th-TH")}
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
              emptyContent="ไม่พบข้อมูลโซน"
              items={pageItems}
              loadingContent={<Spinner label="กำลังโหลดข้อมูลโซน..." />}
              loadingState={isLoading ? "loading" : "idle"}
            >
              {(zone) => (
                <TableRow key={zone.id}>
                  {(columnKey) => (
                    <TableCell>{renderCell(zone, columnKey)}</TableCell>
                  )}
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardBody>
      </Card>

      <Modal
        backdrop="blur"
        isOpen={modalState?.type === "add" || modalState?.type === "edit"}
        onClose={closeModal}
      >
        <ModalContent>
          {(close) =>
            modalState?.type === "add" || modalState?.type === "edit" ? (
              <>
                <ModalHeader className="flex flex-col gap-1">
                  {modalState.type === "add" ? "เพิ่มโซน" : "แก้ไขโซน"}
                </ModalHeader>
                <form onSubmit={handleSave}>
                  <ModalBody className="space-y-4">
                    <Input
                      required
                      label="ชื่อโซน"
                      value={zoneName}
                      variant="bordered"
                      onValueChange={setZoneName}
                    />
                    <Textarea
                      label="รายละเอียด (ไม่บังคับ)"
                      minRows={3}
                      value={zoneDescription}
                      variant="bordered"
                      onValueChange={setZoneDescription}
                    />
                    <Input
                      label="ค่าจอง"
                      min={0}
                      step={10}
                      type="number"
                      value={zoneFee}
                      variant="bordered"
                      onValueChange={setZoneFee}
                    />
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
                      บันทึกข้อมูล
                    </Button>
                  </ModalFooter>
                </form>
              </>
            ) : null
          }
        </ModalContent>
      </Modal>

      <Modal
        backdrop="blur"
        isOpen={modalState?.type === "delete"}
        onClose={closeModal}
      >
        <ModalContent>
          {(close) =>
            modalState?.type === "delete" ? (
              <>
                <ModalHeader>ลบโซน</ModalHeader>
                <ModalBody className="space-y-3 text-sm text-default-500">
                  <p>
                    ต้องการลบโซน{" "}
                    <strong className="text-foreground">
                      {modalState.zone.name}
                    </strong>{" "}
                    ออกจากระบบหรือไม่?
                  </p>
                  <p className="text-xs text-default-400">
                    การลบนี้จะไม่สามารถย้อนกลับได้ และโซนจะหายไปจากระบบการจอง
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
                    onPress={handleDelete}
                  >
                    ยืนยันการลบ
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
