// fixcy/components/admin/EventManagement.tsx
import React, { useCallback, useMemo, useState } from "react";
import { format } from "date-fns";
import { Card, CardBody, CardFooter, CardHeader } from "@heroui/card";
import { Button } from "@heroui/button";
import { Spinner } from "@heroui/spinner";
import { Chip } from "@heroui/chip";
import {
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
} from "@heroui/modal";

import { useNotification } from "@/lib/NotificationContext";

const DeleteIcon = () => (
  <svg
    fill="none"
    height="20"
    stroke="currentColor"
    strokeWidth="2"
    viewBox="0 0 24 24"
    width="20"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path d="M3 6h18" />
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    <line x1="10" x2="10" y1="11" y2="17" />
    <line x1="14" x2="14" y1="11" y2="17" />
  </svg>
);

const EditIcon = () => (
  <svg
    fill="none"
    height="20"
    stroke="currentColor"
    strokeWidth="2"
    viewBox="0 0 24 24"
    width="20"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
  </svg>
);

const CalendarIcon = () => (
  <svg
    fill="currentColor"
    height="16"
    viewBox="0 0 24 24"
    width="16"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path d="M19 19H5V8h14m-3-7v2H8V1H6v2H5c-1.11 0-2 .89-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2h-1V1m-1 11h-5v5h5v-5z" />
  </svg>
);

const TicketIcon = () => (
  <svg
    fill="currentColor"
    height="16"
    viewBox="0 0 24 24"
    width="16"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path d="M22 10V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v4a2 2 0 0 1 0 4v4a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-4a2 2 0 0 1 0-4ZM9.5 15.5a1.5 1.5 0 1 1 0-3a1.5 1.5 0 0 1 0 3Zm5 0a1.5 1.5 0 1 1 0-3a1.5 1.5 0 0 1 0 3Z" />
  </svg>
);

export interface EventImage {
  id: number;
  image_url: string;
  alt_text?: string;
  title?: string;
  date?: string;
  description?: string;
  price: number | string;
  total_tickets: number;
  tickets_sold: number;
  pending_tickets?: number;
  available_tickets?: number;
  is_active: boolean;
}

interface EventManagementProps {
  onOpenEditModal: (image: EventImage) => void;
  onOpenUploadModal: () => void;
  fetchImages: () => Promise<void> | void;
  images: EventImage[];
  isLoading: boolean;
}

const formatCurrency = (value: number) =>
  Number.isFinite(value)
    ? new Intl.NumberFormat("th-TH", {
        style: "currency",
        currency: "THB",
        maximumFractionDigits: 0,
      }).format(value)
    : "THB 0";

export const EventManagement: React.FC<EventManagementProps> = ({
  onOpenEditModal,
  onOpenUploadModal,
  fetchImages,
  images,
  isLoading,
}) => {
  const { showNotification } = useNotification();
  const [pendingDelete, setPendingDelete] = useState<EventImage | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDeleteClick = useCallback((image: EventImage) => {
    setPendingDelete(image);
  }, []);

  const handleCloseDeleteModal = useCallback(() => {
    if (!isDeleting) {
      setPendingDelete(null);
    }
  }, [isDeleting]);

  const handleConfirmDelete = useCallback(async () => {
    if (!pendingDelete) {
      return;
    }

    setIsDeleting(true);

    try {
      const response = await fetch(
        `/api/admin/slider?id=${pendingDelete.id}&imageUrl=${encodeURIComponent(pendingDelete.image_url)}`,
        { method: "DELETE" },
      );

      let payload: { message?: string } | null = null;

      try {
        payload = await response.json();
      } catch {
        payload = null;
      }

      if (!response.ok) {
        const message =
          payload && typeof payload === "object" && "message" in payload
            ? String(payload.message ?? "")
            : "";

        throw new Error(message || "Unable to delete event.");
      }

      await fetchImages();

      showNotification(
        "Event deleted",
        `${pendingDelete.title ?? "Event"} removed successfully.`,
        "success",
      );

      setPendingDelete(null);
    } catch (error) {
      showNotification(
        "Delete failed",
        error instanceof Error
          ? error.message
          : "Unable to delete this event right now.",
        "error",
      );
    } finally {
      setIsDeleting(false);
    }
  }, [fetchImages, pendingDelete, showNotification]);

  const renderBody = useMemo(() => {
    if (isLoading) {
      return (
        <Card className="border border-default-200/30 bg-content1/40 backdrop-blur">
          <CardBody className="flex flex-col items-center gap-3 py-16">
            <Spinner color="primary" label="Loading events..." size="lg" />
            <p className="text-sm text-default-500">
              Fetching the latest promotions.
            </p>
          </CardBody>
        </Card>
      );
    }

    if (images.length === 0) {
      return (
        <Card className="border border-default-200/30 bg-content1/60 backdrop-blur">
          <CardBody className="flex flex-col items-center gap-4 py-16 text-center">
            <p className="text-lg font-medium text-default-500">
              ยังไม่มีอีเวนต์บนสไลด์
            </p>
            <p className="text-sm text-default-400">
              เพิ่มรูปโปรโมตแรกเพื่อดึงความสนใจของลูกค้าบนหน้าแรก
            </p>
            <Button color="primary" radius="full" onPress={onOpenUploadModal}>
              เพิ่มอีเวนต์แรกของคุณ
            </Button>
          </CardBody>
        </Card>
      );
    }

    return (
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {images.map((image) => {
          const pendingTickets = Number(image.pending_tickets ?? 0);
          const ticketsRemaining =
            typeof image.available_tickets === "number"
              ? Math.max(image.available_tickets, 0)
              : Math.max(
                  image.total_tickets - image.tickets_sold - pendingTickets,
                  0,
                );
          const priceAsNumber = Number(image.price);

          const priceLabel = Number.isFinite(priceAsNumber)
            ? formatCurrency(priceAsNumber)
            : "THB 0";

          return (
            <Card
              key={image.id}
              className="h-full border border-default-200/20 bg-content1/70 backdrop-blur"
            >
              <CardHeader className="relative flex h-48 items-start justify-end overflow-hidden rounded-b-none p-0">
                <img
                  alt={image.alt_text || image.title || "Event image"}
                  className="h-full w-full object-cover"
                  src={image.image_url}
                />
                <Chip
                  className="absolute right-4 top-4"
                  color={image.is_active ? "success" : "danger"}
                  size="sm"
                  variant="shadow"
                >
                  {image.is_active ? "กำลังขาย" : "ปิดการขาย"}
                </Chip>
              </CardHeader>
              <CardBody className="space-y-4">
                <div className="space-y-2">
                  <h3 className="text-lg font-semibold text-foreground">
                    {image.title || "Untitled Event"}
                  </h3>
                  {image.date ? (
                    <div className="flex items-center gap-2 text-sm text-default-500">
                      <CalendarIcon />
                      <time dateTime={image.date}>
                        {format(new Date(image.date), "PPP")}
                      </time>
                    </div>
                  ) : null}
                </div>
                <p className="text-sm text-default-500">
                  {image.description || "เจ้าของยังไม่ได้ใส่รายละเอียด"}
                </p>
                <div className="flex flex-wrap items-center gap-3 text-sm text-default-500">
                  <span className="inline-flex items-center gap-2">
                    <TicketIcon />
                    <strong className="text-foreground">
                      {ticketsRemaining.toLocaleString("th-TH")}
                    </strong>
                    <span className="text-default-400">
                      / {image.total_tickets.toLocaleString("th-TH")} ใบ
                    </span>
                  </span>
                  <span className="text-default-400">•</span>
                  <span className="font-semibold text-primary-300">
                    {priceLabel}
                  </span>
                </div>
              </CardBody>
              <CardFooter className="flex justify-end gap-2">
                <Button
                  color="primary"
                  radius="full"
                  startContent={<EditIcon />}
                  variant="flat"
                  onPress={() => onOpenEditModal(image)}
                >
                  แก้ไข
                </Button>
                <Button
                  color="danger"
                  radius="full"
                  startContent={<DeleteIcon />}
                  variant="flat"
                  onPress={() => handleDeleteClick(image)}
                >
                  ลบ
                </Button>
              </CardFooter>
            </Card>
          );
        })}
      </div>
    );
  }, [
    images,
    isLoading,
    onOpenEditModal,
    onOpenUploadModal,
    handleDeleteClick,
  ]);

  return (
    <>
      {renderBody}

      <Modal
        backdrop="blur"
        isOpen={Boolean(pendingDelete)}
        onClose={handleCloseDeleteModal}
      >
        <ModalContent>
          {(close) => (
            <>
              <ModalHeader className="flex flex-col gap-1">
                ยืนยันการลบอีเวนต์
              </ModalHeader>
              <ModalBody>
                <p className="text-sm text-default-500">
                  คุณกำลังจะลบ
                  <span className="font-semibold text-foreground">
                    {" "}
                    {pendingDelete?.title || "Event"}{" "}
                  </span>
                  ออกจากสไลด์โปรโมต ระบบจะปิดการขายและนำรูปออกจากหน้าแรก ทันที
                  ดำเนินการต่อหรือไม่?
                </p>
              </ModalBody>
              <ModalFooter>
                <Button
                  variant="light"
                  onPress={() => {
                    close();
                    handleCloseDeleteModal();
                  }}
                >
                  ยกเลิก
                </Button>
                <Button
                  color="danger"
                  isLoading={isDeleting}
                  onPress={handleConfirmDelete}
                >
                  ยืนยันการลบ
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
    </>
  );
};
