import type { Ticket } from "@/types/tickets";

import React, { useEffect, useMemo, useState } from "react";
import * as QRCode from "qrcode";
import {
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
} from "@heroui/modal";
import { Button } from "@heroui/button";
import { Spinner } from "@heroui/spinner";

interface TicketQRModalProps {
  isOpen: boolean;
  onClose: () => void;
  ticket: Ticket | null;
}

export const TicketQRModal: React.FC<TicketQRModalProps> = ({
  isOpen,
  onClose,
  ticket,
}) => {
  const [qrCodeUrl, setQrCodeUrl] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const isModalOpen = isOpen && Boolean(ticket);

  // ✅ ใช้ "รหัสบัตร" เป็น payload ของ QR (ใช้ ticket.code ก่อน ถ้าไม่มีค่อยใช้ ticket.id)
  const qrPayload = useMemo(() => {
    if (!ticket) return "";
    // ปรับ key ให้ตรงกับโครงสร้างจริงของโปรเจ็กต์ได้
    // เช่น ticket.ticket_code หรือ ticket.code
    const code =
      // @ts-expect-error – เผื่อ type ยังไม่ประกาศ field นี้
      (ticket.code as string | undefined) ??
      (ticket as unknown as { ticket_code?: string }).ticket_code ??
      ticket.id;

    return String(code ?? "");
  }, [ticket]);

  useEffect(() => {
    let isMounted = true;

    const generateQr = async () => {
      if (!isModalOpen || !qrPayload) {
        setQrCodeUrl("");
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      try {
        // สร้างภาพคมชัดขึ้นด้วย margin น้อยและ ECL กลาง
        const url = await QRCode.toDataURL(qrPayload, {
          width: 320,
          margin: 1,
          errorCorrectionLevel: "M",
          // rendererOpts: { quality: 1 } // เปิดถ้าต้องการ (บางเวอร์ชันรองรับ)
        });

        if (isMounted) {
          setQrCodeUrl(url);
          setIsLoading(false);
        }
      } catch (error) {
        console.error("Failed to generate QR code", error);
        if (isMounted) {
          setQrCodeUrl("");
          setIsLoading(false);
        }
      }
    };

    void generateQr();
    return () => {
      isMounted = false;
    };
  }, [isModalOpen, qrPayload]);

  const modalTitle = useMemo(() => {
    if (!ticket) return "";
    return ticket.event?.title ?? "ตั๋วเข้างาน";
  }, [ticket]);

  if (!isModalOpen || !ticket) return null;

  return (
    <Modal
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
      isDismissable
      isOpen={isModalOpen}
      placement="center"
      onClose={onClose}
    >
      <ModalContent>
        {(close) => (
          <>
            <ModalHeader>
              <p className="text-[11px] uppercase text-white/45">
                บัตรสำหรับ
              </p>
              <h2 className="text-xl font-semibold text-white">{modalTitle}</h2>
            </ModalHeader>

            <ModalBody>
              <div className="space-y-6">
                <div className="relative overflow-hidden rounded-3xl border border-cyan-400/30 bg-gradient-to-br from-cyan-500/15 via-sky-500/10 to-transparent p-6 text-center">
                  <div className="pointer-events-none absolute inset-0 opacity-70">
                    <div className="absolute -top-24 left-10 h-48 w-48 rounded-full bg-cyan-400/20 blur-3xl" />
                    <div className="absolute -bottom-24 right-4 h-40 w-40 rounded-full bg-sky-500/20 blur-3xl" />
                  </div>

                  <div className="relative flex min-h-[300px] flex-col items-center justify-center gap-4">
                    {isLoading ? (
                      <Spinner
                        color="default"
                        label="กำลังสร้างคิวอาร์โค้ด..."
                        labelColor="primary"
                        size="lg"
                      />
                    ) : qrCodeUrl ? (
                      <>
                        <div className="relative">
                          <div className="absolute inset-0 rounded-[32px] bg-cyan-400/20 blur-3xl" />
                          <div className="relative overflow-hidden rounded-[28px] border border-white/10 bg-white/90 p-4 shadow-[0_25px_55px_-25px_rgba(6,182,212,0.65)]">
                            <img
                              alt="คิวอาร์โค้ดบัตรเข้างาน"
                              className="h-56 w-56 rounded-[20px] object-contain"
                              src={qrCodeUrl}
                            />
                          </div>
                        </div>
                        {/* แสดงรหัสบัตรใต้รูปเพื่อความชัดเจน */}
                        <div className="mt-2 rounded-full border border-white/10 bg-black/30 px-3 py-1">
                          <p className="text-xs font-mono text-white/80">
                            รหัสบัตร: {qrPayload}
                          </p>
                        </div>
                      </>
                    ) : (
                      <div className="rounded-2xl border border-white/10 bg-black/30 px-5 py-10 text-sm text-white/60">
                        ไม่พบรหัสบัตรสำหรับการสร้างคิวอาร์โค้ด
                      </div>
                    )}

                    <p className="text-xs leading-relaxed text-white/65 sm:text-sm">
                      แสดงคิวอาร์โค้ดนี้ให้เจ้าหน้าที่ที่หน้างานเพื่อยืนยันสิทธิ์การเข้างาน
                      หากสแกนไม่ได้ สามารถพิมพ์{" "}
                      <span className="font-mono">รหัสบัตร</span> ให้เจ้าหน้าที่ตรวจสอบแทน
                    </p>
                  </div>
                </div>
              </div>
            </ModalBody>

            <ModalFooter className="flex w-full flex-col gap-3 sm:flex-row sm:justify-end">
              <Button
                className="w-full rounded-full border border-white/15 bg-white/10 text-sm font-semibold text-white transition hover:border-cyan-300/60 hover:bg-cyan-500/20 sm:w-auto"
                radius="full"
                size="sm"
                variant="flat"
                onPress={() => close()}
              >
                ปิดหน้าต่าง
              </Button>
            </ModalFooter>
          </>
        )}
      </ModalContent>
    </Modal>
  );
};
