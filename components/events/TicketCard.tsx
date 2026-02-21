import type { Ticket } from "@/types/tickets";

import React, { useMemo, useState } from "react";
import Image from "next/image";
import { format } from "date-fns";
import { th as thLocale } from "date-fns/locale";
import { Card, CardBody, CardFooter } from "@heroui/card";
import { Chip } from "@heroui/chip";
import { Button } from "@heroui/button";

import { TicketQRModal } from "./TicketQRModal";

import { resolveEventMedia } from "@/components/events/EventCard";

const statusLabelMap: Record<Ticket["status"], string> = {
  valid: "ใช้งานได้",
  used: "ใช้แล้ว",
  cancelled: "ยกเลิกแล้ว",
};

const statusChipStyles: Record<Ticket["status"], string> = {
  valid: [
    "bg-emerald-500/15 text-emerald-200",
    "border border-emerald-400/40",
    "shadow-[0_0_30px_-18px_rgba(16,185,129,0.9)]",
  ].join(" "),
  used: "bg-white/10 text-white/70 border border-white/20",
  cancelled: [
    "bg-rose-500/15 text-rose-100",
    "border border-rose-400/40",
    "shadow-[0_0_30px_-18px_rgba(244,63,94,0.9)]",
  ].join(" "),
};

export const TicketCard: React.FC<{ ticket: Ticket }> = ({ ticket }) => {
  const [isQrModalOpen, setIsQrModalOpen] = useState(false);
  const { src: coverImage, isExternal: isExternalCover } = useMemo(
    () => resolveEventMedia(ticket.event.image_url ?? null),
    [ticket.event.image_url],
  );

  const formattedEventDate = useMemo(
    () =>
      format(new Date(ticket.event.date), "PPP", {
        locale: thLocale,
      }),
    [ticket.event.date],
  );

  const buttonClassName = [
    "w-full uppercase text-xs font-semibold",
    "transition duration-300",
    "rounded-full",
    "disabled:cursor-not-allowed disabled:opacity-60",
    ticket.status === "valid"
      ? [
          "bg-gradient-to-r from-emerald-400 via-cyan-400 to-sky-500",
          "text-[#041026]",
          "shadow-[0_18px_45px_-18px_rgba(56,189,248,0.65)]",
          "hover:brightness-110 hover:shadow-[0_22px_60px_-18px_rgba(56,189,248,0.7)]",
          "active:scale-[0.98]",
        ].join(" ")
      : "border border-white/15 bg-white/5 text-white/50",
  ].join(" ");

  return (
    <>
      <Card className="group h-full overflow-hidden rounded-3xl border border-white/10 bg-white/[0.04] backdrop-blur-xl transition hover:border-cyan-400/40">
        <CardBody className="flex flex-col gap-5 sm:flex-row sm:items-stretch">
          <div className="relative h-44 w-full overflow-hidden rounded-2xl sm:h-40 sm:w-40">
            {coverImage ? (
              <Image
                fill
                alt={ticket.event.title}
                className="object-cover transition duration-500 group-hover:scale-105"
                src={coverImage}
                unoptimized={isExternalCover}
              />
            ) : (
              <div className="absolute inset-0 bg-linear-to-br from-indigo-500/35 via-sky-500/20 to-slate-900" />
            )}
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-tr from-black/50 via-transparent to-transparent" />
          </div>

          <div className="flex flex-1 flex-col justify-between gap-5">
            <div className="space-y-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="space-y-1.5">
                  <p className="text-[11px] uppercase text-white/45">
                    บัตรเข้าร่วมงาน
                  </p>
                  <h3 className="text-xl font-semibold text-white">
                    {ticket.event.title}
                  </h3>
                  <p className="text-sm text-white/65">{formattedEventDate}</p>
                </div>
                <Chip
                  radius="full"
                  size="sm"
                  variant="flat"
                  className={`text-[11px] font-semibold uppercase ${statusChipStyles[ticket.status]}`}
                >
                  {statusLabelMap[ticket.status]}
                </Chip>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-xs text-white/65 shadow-[0_18px_40px_-35px_rgba(6,182,212,0.65)] sm:flex sm:items-center sm:justify-between">
                <span className="font-semibold text-white/80">
                  รหัสบัตร: {ticket.id}
                </span>
                <span className="mt-2 inline-flex items-center gap-2 text-[11px] uppercase text-white/55 sm:mt-0">
                  พร้อมแสดงตอนเข้างาน
                </span>
              </div>
            </div>
          </div>
        </CardBody>

        <CardFooter className="border-t border-white/10 bg-white/5 py-5">
          <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-white/60 sm:text-sm">
              สแกนเพื่อยืนยันสิทธิ์ก่อนเข้าสถานที่ หากมีปัญหา
              สามารถติดต่อเจ้าหน้าที่ที่หน้างานได้ทันที
            </p>
            <Button
              className={buttonClassName}
              isDisabled={ticket.status !== "valid"}
              radius="full"
              size="sm"
              onPress={() => setIsQrModalOpen(true)}
            >
              แสดงคิวอาร์โค้ด
            </Button>
          </div>
        </CardFooter>
      </Card>

      <TicketQRModal
        isOpen={isQrModalOpen}
        ticket={ticket}
        onClose={() => setIsQrModalOpen(false)}
      />
    </>
  );
};
