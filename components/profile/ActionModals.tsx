import React, { useState, useEffect, useCallback } from "react";
import { format } from "date-fns";
import { th as thLocale } from "date-fns/locale";
import { Button } from "@heroui/button";
import {
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
} from "@heroui/modal";
import { Divider } from "@heroui/divider";
import { Spinner as HeroSpinner } from "@heroui/spinner";

import { BookingHistory } from "./BookingHistoryCard";

export const TrashIcon = ({
  className = "h-6 w-6",
}: {
  className?: string;
}) => (
  <svg
    className={className}
    fill="none"
    stroke="currentColor"
    strokeLinecap="round"
    strokeLinejoin="round"
    strokeWidth="1.8"
    viewBox="0 0 24 24"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path d="M3 6h18" />
    <path d="M8 6v14a2 2 0 0 0 2 2h4a2 2 0 0 0 2-2V6" />
    <path d="M10 10v8" />
    <path d="M14 10v8" />
    <path d="M5 6l1-3h12l1 3" />
  </svg>
);

const statusLabelMap: Record<BookingHistory["status"], string> = {
  confirmed: "ยืนยันแล้ว",
  awaiting_confirmation: "รอยืนยัน",
  cancelled: "ยกเลิกแล้ว",
  completed: "เสร็จสิ้น",
};

interface CancelModalProps {
  booking: BookingHistory | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (bookingId: number) => void;
}

export const CancelModal: React.FC<CancelModalProps> = ({
  booking,
  isOpen,
  onClose,
  onConfirm,
}) => {
  if (!isOpen || !booking) {
    return null;
  }

  return (
    <Modal
      isDismissable
      backdrop="blur"
      classNames={{
        wrapper: "fixed inset-0 flex items-center justify-center !m-0",
        base:
          "w-full max-w-xl overflow-hidden rounded-3xl border border-white/10 bg-white/[0.05] backdrop-blur-2xl text-white shadow-[0_35px_80px_-35px_rgba(244,63,94,0.45)]",
        closeButton:
          "right-5 top-5 rounded-full text-white/70 hover:text-white hover:bg-white/10 backdrop-blur-sm",
      }}
      isOpen={isOpen}
      placement="center"
      scrollBehavior="outside"
      size="lg"
      onClose={onClose}
    >
      <ModalContent>
        <ModalHeader className="flex flex-col items-center gap-4 px-6 pt-6 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-rose-400/40 bg-rose-500/15 text-rose-200">
            <TrashIcon className="h-6 w-6" />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-semibold text-white">
              ยืนยันการยกเลิกการจอง
            </h2>
            <p className="text-sm text-white/70">
              ตรวจสอบรายละเอียดก่อนยกเลิก ระบบจะปล่อยโต๊ะให้ผู้ใช้รายอื่นทันทีหลังยืนยัน
            </p>
          </div>
        </ModalHeader>

        <ModalBody className="space-y-6 px-6 pb-0 text-sm text-white/75">
          <div className="rounded-2xl border border-rose-400/30 bg-rose-500/10 px-4 py-3 text-rose-100">
            การยกเลิกไม่สามารถย้อนกลับได้ โปรดยืนยันว่าคุณเข้าใจผลกระทบต่อการจองครั้งนี้
          </div>

          <div className="grid gap-4 text-left text-sm text-white/70 sm:grid-cols-3">
            <div>
              <p className="text-[11px] font-semibold uppercase text-white/45">
                โต๊ะที่จอง
              </p>
              <p className="mt-1 text-white">
                โต๊ะ {booking.table_number} • โซน {booking.zone_name}
              </p>
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase text-white/45">
                วันที่จอง
              </p>
              <p className="mt-1">
                {format(new Date(booking.booking_date), "EEEEที่ d MMMM yyyy", {
                  locale: thLocale,
                })}
              </p>
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase text-white/45">
                สถานะปัจจุบัน
              </p>
              <p className="mt-1 capitalize">
                {statusLabelMap[booking.status]}
              </p>
            </div>
          </div>
        </ModalBody>

        <ModalFooter className="px-6 pb-6 pt-0">
          <div className="flex w-full flex-col gap-3 sm:flex-row">
            <Button
              className="w-full rounded-full border border-white/15 bg-white/10 text-sm font-semibold text-white transition hover:border-white/30 hover:bg-white/15"
              radius="full"
              variant="flat"
              onPress={onClose}
            >
              ยกเลิก
            </Button>
            <Button
              className="w-full rounded-full border border-rose-400/60 bg-rose-500/20 text-sm font-semibold text-rose-100 transition hover:border-rose-300 hover:bg-rose-500/30 hover:text-white"
              radius="full"
              onPress={() => onConfirm(booking.id)}
            >
              ยืนยันการยกเลิก
            </Button>
          </div>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};

interface QrCodeModalProps {
  booking: BookingHistory | null;
  isOpen: boolean;
  onClose: () => void;
}

const QrCodeIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    fill="currentColor"
    height="32"
    viewBox="0 0 24 24"
    width="32"
    {...props}
  >
    <path d="M4 4h6v6H4zm2 2v2h2V6zM4 14h6v6H4zm2 2v2h2v-2zM14 4h6v6h-6zm2 2v2h2V6zM14 14h2v2h-2zm2 2h2v2h-2zm2 2h2v2h-2zm-2 2v2h-2v-2h-2v-2h-2v-2h-2v-2h2v-2h2v2h2v-2h2v2h2v2h-2v2zm-4-2v-2h-2v2zm-4-2H8v-2h2z" />
  </svg>
);

export const QrCodeModal: React.FC<QrCodeModalProps> = ({
  booking,
  isOpen,
  onClose,
}) => {
  const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generateQrCode = useCallback(async () => {
    if (!booking) return;
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/bookings/generate-booking-qr", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingId: booking.id }),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || "เกิดข้อผิดพลาดในการสร้าง QR โค้ด");
      }
      setQrCodeUrl(data.qrCodeUrl ?? null);
    } catch (err: any) {
      setError(err.message || "ไม่สามารถสร้าง QR โค้ดได้");
      setQrCodeUrl(null);
    } finally {
      setIsLoading(false);
    }
  }, [booking]);

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;

    if (isOpen && booking) {
      generateQrCode();
      // รีเฟรชประมาณทุก 55 วินาที
      interval = setInterval(generateQrCode, 55000);
    } else {
      setQrCodeUrl(null);
      setError(null);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isOpen, booking, generateQrCode]);

  if (!isOpen || !booking) return null;

  return (
    <Modal
      isDismissable
      backdrop="blur"
      classNames={{
        wrapper: "fixed inset-0 flex items-center justify-center !m-0",
        base:
          "w-full max-w-lg overflow-hidden rounded-3xl border border-white/10 " +
          "bg-white/[0.06] backdrop-blur-2xl shadow-[0_35px_80px_-35px_rgba(14,116,144,0.65)]",
        header: "px-6 pt-6 pb-2 flex flex-col gap-1 text-left",
        body: "px-6 pb-6 pt-2",
        footer: "px-6 pb-6 pt-0",
        closeButton:
          "right-5 top-5 rounded-full text-white/70 hover:text-white hover:bg-white/10 backdrop-blur-sm",
      }}
      isOpen={isOpen}
      placement="center"
      scrollBehavior="outside"
      size="xl"
      onClose={onClose}
    >
      <ModalContent>
        <ModalHeader className="px-6 pt-6 text-left">
          <p className="text-[11px] uppercase text-white/45">
            คิวอาร์โค้ดการจอง
          </p>
          <h2 className="mt-2 text-2xl font-semibold text-white">
            แสดงคิวอาร์เพื่อเช็กอินโต๊ะ
          </h2>
          <p className="mt-2 text-sm text-white/70">
            แสกนคิวอาร์นี้กับเจ้าหน้าที่เพื่อยืนยันสิทธิ์ ระบบจะสร้างคิวอาร์ใหม่อัตโนมัติทุก
            60 วินาทีเพื่อความปลอดภัย
          </p>
        </ModalHeader>

        <ModalBody className="space-y-6 px-6 pb-0 text-sm text-white/75 overflow-hidden">
          <div className="relative overflow-hidden rounded-3xl border border-cyan-400/30 bg-gradient-to-br from-cyan-500/15 via-sky-500/10 to-transparent p-6 text-center">
            <div className="pointer-events-none absolute inset-0 opacity-70">
              <div className="absolute -top-24 left-8 h-48 w-48 rounded-full bg-cyan-400/20 blur-3xl" />
              <div className="absolute -bottom-24 right-6 h-44 w-44 rounded-full bg-sky-500/25 blur-3xl" />
            </div>

            <div className="relative flex min-h-[260px] flex-col items-center justify-center gap-5">
              {isLoading ? (
                <div className="flex flex-col items-center gap-3 text-white/70">
                  <HeroSpinner color="primary" size="lg" />
                  <p className="text-xs font-medium">กำลังสร้างคิวอาร์โค้ด...</p>
                </div>
              ) : error ? (
                <div className="rounded-2xl border border-rose-400/40 bg-rose-500/15 px-5 py-6 text-sm text-rose-100">
                  {error}
                </div>
              ) : qrCodeUrl ? (
                <div className="relative">
                  <div className="absolute inset-0 rounded-[32px] bg-cyan-400/25 blur-3xl" />
                  <div className="relative overflow-hidden rounded-[28px] border border-white/10 bg-white p-4 shadow-[0_25px_55px_-25px_rgba(6,182,212,0.65)]">
                    <img
                      alt="QR โค้ดการจอง"
                      className="h-52 w-52 rounded-[20px] object-contain"
                      src={qrCodeUrl}
                    />
                  </div>
                </div>
              ) : (
                <div className="rounded-2xl border border-white/10 bg-black/30 px-5 py-6 text-sm text-white/70">
                  ไม่พบคิวอาร์โค้ดสำหรับการจองนี้ กรุณาลองใหม่อีกครั้ง
                </div>
              )}
            </div>
          </div>

          <Divider className="bg-white/10" />

          <div className="grid gap-4 text-left text-sm text-white/70 sm:grid-cols-3">
            <div>
              <p className="text-[11px] font-semibold uppercase text-white/45">
                ข้อมูลโต๊ะ
              </p>
              <p className="mt-1 text-white">
                โต๊ะ {booking.table_number} • โซน {booking.zone_name}
              </p>
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase text-white/45">
                วันจอง
              </p>
              <p className="mt-1">
                {format(new Date(booking.booking_date), "EEEEที่ d MMMM yyyy", {
                  locale: thLocale,
                })}
              </p>
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase text-white/45">
                สถานะ
              </p>
              <p className="mt-1 capitalize">
                {statusLabelMap[booking.status]}
              </p>
            </div>
          </div>
        </ModalBody>

        <ModalFooter className="px-6 pb-6 pt-0">
          <Button
            className="w-full rounded-full border border-white/15 bg-white/10 text-sm font-semibold text-white transition hover:border-cyan-300/60 hover:bg-cyan-500/20"
            radius="full"
            onPress={onClose}
          >
            ปิดหน้าต่าง
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};






