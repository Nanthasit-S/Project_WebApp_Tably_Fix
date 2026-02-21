import React, { useState, useEffect, useCallback, useMemo } from "react";
import QrScanner from "qr-scanner";
import { format } from "date-fns";
import { th as thLocale } from "date-fns/locale";
import { Avatar } from "@heroui/avatar";
import { Button } from "@heroui/button";
import { Card, CardBody } from "@heroui/card";
import { Chip } from "@heroui/chip";
import { Divider } from "@heroui/divider";
import { Input } from "@heroui/input";
import {
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
} from "@heroui/modal";
import { ScrollShadow } from "@heroui/scroll-shadow";
import { Spinner as HeroSpinner } from "@heroui/spinner";

import { BookingHistory } from "./BookingHistoryCard";

interface UserSearchResult {
  id: number;
  display_name: string;
  picture_url: string;
}

interface TransferBookingModalProps {
  booking: BookingHistory | null;
  isOpen: boolean;
  onClose: () => void;
  onTransferSuccess: (bookingId: number) => void;
}

type View = "search" | "payment";

const getAvatarSrc = (pictureUrl: string) =>
  pictureUrl
    ? `/api/image-proxy?url=${encodeURIComponent(pictureUrl)}`
    : undefined;

export const TransferBookingModal: React.FC<TransferBookingModalProps> = ({
  booking,
  isOpen,
  onClose,
  onTransferSuccess,
}) => {
  const [view, setView] = useState<View>("search");
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<UserSearchResult[]>([]);
  const [selectedRecipient, setSelectedRecipient] =
    useState<UserSearchResult | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [transferFee, setTransferFee] = useState<number>(0);

  const [paymentQR, setPaymentQR] = useState<string>("");
  const [scanResult, setScanResult] = useState<string | null>(null);
  const [scanError, setScanError] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);

  const resetState = useCallback(() => {
    setView("search");
    setSearchQuery("");
    setSearchResults([]);
    setSelectedRecipient(null);
    setIsProcessing(false);
    setTransferFee(0);
    setPaymentQR("");
    setScanResult(null);
    setScanError(null);
    setIsScanning(false);
  }, []);

  const handleModalClose = useCallback(() => {
    resetState();
    onClose();
  }, [onClose, resetState]);

  const fetchTransferFee = useCallback(async () => {
    try {
      const res = await fetch("/api/settings");

      if (res.ok) {
        const data = await res.json();

        setTransferFee(data.transferFee || 0);
      }
    } catch (error) {
      console.error("ไม่สามารถดึงค่าธรรมเนียมการโอนได้");
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      resetState();
      fetchTransferFee();
    }
  }, [isOpen, resetState, fetchTransferFee]);

  const performSearch = useCallback(
    async (query: string) => {
      setSearchQuery(query);

      if (!query.trim()) {
        setSearchResults([]);
        return;
      }

      setIsSearching(true);
      try {
        const res = await fetch(
          `/api/users/search?query=${encodeURIComponent(query)}`,
        );
        const data = await res.json();

        setSearchResults(Array.isArray(data) ? data : []);
      } catch (error: any) {
        console.error(error.message);
      } finally {
        setIsSearching(false);
      }
    },
    [],
  );

  const handleRecipientSelect = useCallback(
    async (user: UserSearchResult) => {
      setSelectedRecipient(user);

      if (transferFee > 0) {
        setIsProcessing(true);
        try {
          const res = await fetch("/api/bookings/generate-payment-qr", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ amount: transferFee }),
          });
          const data = await res.json();

          if (!res.ok) {
            throw new Error(data.message);
          }

          setPaymentQR(data.qrCodeUrl ?? "");
          setView("payment");
        } catch (error: any) {
          alert(`ไม่สามารถเริ่มการชำระเงินได้: ${error.message}`);
          setSelectedRecipient(null);
        } finally {
          setIsProcessing(false);
        }
      }
    },
    [transferFee],
  );

  const handleSlipFileChange = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];

      if (!file) {
        return;
      }

      setScanResult(null);
      setScanError(null);
      setIsScanning(true);
      try {
        const result = await QrScanner.scanImage(file, {
          returnDetailedScanResult: true,
        });
        setScanResult(result.data);
      } catch {
        setScanError("ไม่พบคิวอาร์โค้ดในสลิปที่อัปโหลด");
      } finally {
        setIsScanning(false);
      }
    },
    [],
  );

  const completeTransfer = useCallback(async () => {
    if (!booking || !selectedRecipient) {
      return;
    }

    if (transferFee > 0 && !scanResult) {
      return;
    }

    setIsProcessing(true);
    try {
      const payload: Record<string, unknown> = {
        bookingId: booking.id,
        recipientId: selectedRecipient.id,
      };

      if (transferFee > 0) {
        payload.refNbr = scanResult;
        payload.amount = Number(transferFee.toFixed(2));
      }

      const res = await fetch("/api/bookings/transfer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = await res.json();

      if (!res.ok) {
        throw new Error(result.message);
      }

      alert(result.message);
      onTransferSuccess(booking.id);
      handleModalClose();
    } catch (error: any) {
      alert(`การโอนล้มเหลว: ${error.message}`);
    } finally {
      setIsProcessing(false);
    }
  }, [
    booking,
    handleModalClose,
    onTransferSuccess,
    scanResult,
    selectedRecipient,
    transferFee,
  ]);

  const bookingDateText = useMemo(() => {
    if (!booking?.booking_date) {
      return "-";
    }

    return format(new Date(booking.booking_date), "EEEEที่ d MMMM yyyy", {
      locale: thLocale,
    });
  }, [booking]);

  if (!isOpen || !booking) {
    return null;
  }

  const renderSearchBody = (
    <div className="space-y-6">
      <Card className="border border-white/10 bg-white/5 text-white backdrop-blur-2xl">
        <CardBody className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <Chip
              color="success"
              radius="lg"
              size="sm"
              variant="flat"
              className="border border-emerald-400/40 bg-emerald-500/10 text-emerald-100"
            >
              โต๊ะ {booking.table_number}
            </Chip>
            <Chip
              radius="lg"
              size="sm"
              variant="flat"
              className="border border-white/10 bg-white/10 text-white/80"
            >
              โซน {booking.zone_name}
            </Chip>
          </div>
          <div className="space-y-1 text-sm text-white/70">
            <p>
              โอนการจองสำหรับวันที่{" "}
              <span className="font-medium text-white">{bookingDateText}</span>
            </p>
            <p>
              เลือกผู้รับจากฐานข้อมูลผู้ใช้งาน ระบบจะอัปเดตสถานะการจองทันทีหลังโอนสำเร็จ
            </p>
          </div>
          {transferFee > 0 ? (
            <>
              <Divider className="border-white/10" />
              <div className="rounded-2xl border border-amber-400/30 bg-amber-400/10 px-4 py-3 text-sm text-amber-100">
                มีค่าธรรมเนียมการโอน{" "}
                <span className="font-semibold">
                  {transferFee.toFixed(2)} บาท
                </span>{" "}
                ระบบจะสร้างคิวอาร์โค้ดเพื่อชำระค่าธรรมเนียมหลังคุณเลือกผู้รับ
              </div>
            </>
          ) : null}
        </CardBody>
      </Card>

      <div className="space-y-3">
        <Input
          aria-label="Search recipient"
          autoFocus
          isClearable
          labelPlacement="outside"
          placeholder="กรอกชื่อผู้ใช้หรือชื่อ LINE"
          radius="lg"
          size="lg"
          value={searchQuery}
          variant="bordered"
          onClear={() => performSearch("")}
          onValueChange={(value) => void performSearch(value)}
        />

        {isSearching ? (
          <Card className="border border-white/10 bg-white/5 text-white">
            <CardBody className="flex flex-col items-center gap-3 py-10">
              <HeroSpinner color="success" />
              <p className="text-sm text-white/70">กำลังค้นหาผู้รับ...</p>
            </CardBody>
          </Card>
        ) : (
          <ScrollShadow className="max-h-64 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pr-1">
            {searchResults.map((user) => {
              const isActive = selectedRecipient?.id === user.id;

              return (
                <Card
                  key={user.id}
                  isPressable
                  radius="lg"
                  shadow="none"
                  className={`border backdrop-blur-xl transition-all duration-200 ${
                    isActive
                      ? "border-emerald-400/60 bg-emerald-500/15 text-white"
                      : "border-white/10 bg-white/5 text-white/70 hover:border-white/30 hover:bg-white/10 hover:text-white"
                  }`}
                  onPress={() => handleRecipientSelect(user)}
                >
                  <CardBody className="flex items-center gap-4">
                    <Avatar
                      isBordered
                      radius="lg"
                      size="md"
                      className="h-12 w-12 border-emerald-500/40"
                      name={user.display_name}
                      src={getAvatarSrc(user.picture_url)}
                    />
                    <div className="flex flex-col">
                      <span className="text-sm font-semibold">
                        {user.display_name}
                      </span>
                      <span className="text-xs text-white/50">
                        ID ผู้ใช้ #{user.id}
                      </span>
                    </div>
                    <div className="ml-auto">
                      {isActive ? (
                        <Chip
                          color="success"
                          size="sm"
                          variant="flat"
                          className="border border-emerald-400/40 bg-emerald-500/20 text-emerald-100"
                        >
                          เลือกแล้ว
                        </Chip>
                      ) : null}
                    </div>
                  </CardBody>
                </Card>
              );
            })}
            {!isSearching && searchQuery && searchResults.length === 0 ? (
              <Card className="border border-white/10 bg-white/5 text-center text-white/70">
                <CardBody>ไม่พบผู้ใช้ที่ตรงกับคำค้นหา</CardBody>
              </Card>
            ) : null}
          </ScrollShadow>
        )}

        {isProcessing && transferFee > 0 ? (
          <Card className="border border-sky-400/40 bg-sky-500/15 text-white">
            <CardBody className="flex items-center gap-3">
              <HeroSpinner color="primary" size="sm" />
              <span className="text-sm">
                กำลังเตรียมคิวอาร์โค้ดสำหรับชำระค่าธรรมเนียม...
              </span>
            </CardBody>
          </Card>
        ) : null}
      </div>
    </div>
  );

  const renderPaymentBody = (
    <div className="space-y-6">
      <Card className="border border-white/10 bg-white/5 text-white backdrop-blur-2xl">
        <CardBody className="space-y-4 text-center">
          <Chip
            color="success"
            radius="lg"
            size="sm"
            variant="flat"
            className="mx-auto border border-emerald-400/40 bg-emerald-500/20 text-emerald-100"
          >
            ชำระค่าธรรมเนียมการโอน
          </Chip>
          <div className="space-y-2">
            <h2 className="text-2xl font-semibold">
              โอนให้ {selectedRecipient?.display_name}
            </h2>
            <p className="text-sm text-white/70">
              สแกนคิวอาร์โค้ดด้านล่างด้วย Mobile Banking แล้วอัปโหลดสลิปเพื่อยืนยัน
            </p>
          </div>
          <div className="flex items-center justify-center gap-3">
            <Chip
              radius="lg"
              size="lg"
              variant="flat"
              className="border border-emerald-400/50 bg-emerald-500/15 text-emerald-100"
            >
              {transferFee.toFixed(2)} บาท
            </Chip>
          </div>
        </CardBody>
      </Card>

      <Card className="border border-white/10 bg-white/5 text-white">
        <CardBody className="flex flex-col items-center gap-4 py-8">
          {paymentQR ? (
            <>
              <img
                alt="QR Code สำหรับชำระค่าธรรมเนียม"
                className="h-64 w-64 rounded-3xl bg-white p-4 shadow-2xl"
                src={paymentQR}
              />
              <p className="text-sm text-white/60">
                กรณีไม่สามารถสแกนได้ ให้ลองอัปโหลดสลิปอีกครั้ง
              </p>
            </>
          ) : (
            <>
              <HeroSpinner color="success" size="lg" />
              <p className="text-sm text-white/70">
                กำลังสร้างคิวอาร์โค้ดสำหรับการชำระเงิน...
              </p>
            </>
          )}
        </CardBody>
      </Card>

      <Card className="border border-white/10 bg-white/5 text-white">
        <CardBody className="space-y-4">
          <Input
            accept="image/*"
            label="อัปโหลดสลิปการชำระเงิน"
            labelPlacement="outside"
            radius="lg"
            size="lg"
            type="file"
            variant="bordered"
            onChange={handleSlipFileChange}
          />

          {isScanning ? (
            <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-sm text-white/80">
              <HeroSpinner color="primary" size="sm" />
              <span>กำลังอ่านข้อมูลจากสลิป...</span>
            </div>
          ) : null}

          {scanError ? (
            <div className="rounded-2xl border border-rose-400/40 bg-rose-500/15 px-4 py-3 text-sm text-rose-100">
              {scanError}
            </div>
          ) : null}

          {scanResult ? (
            <div className="rounded-2xl border border-emerald-400/40 bg-emerald-500/15 px-4 py-3 text-sm text-emerald-100">
              สแกนสำเร็จ พร้อมส่งหลักฐานเพื่อดำเนินการโอน
            </div>
          ) : null}
        </CardBody>
      </Card>
    </div>
  );

  const searchFooter = (
    <div className="flex w-full flex-col gap-3 sm:flex-row sm:justify-end">
      <Button
        className="w-full"
        color="default"
        radius="full"
        variant="bordered"
        onPress={handleModalClose}
      >
        ยกเลิก
      </Button>
      {transferFee <= 0 ? (
        <Button
          className="w-full"
          color="success"
          isDisabled={!selectedRecipient}
          isLoading={isProcessing}
          radius="full"
          onPress={completeTransfer}
        >
          ยืนยันการโอน
        </Button>
      ) : null}
    </div>
  );

  const paymentFooter = (
    <div className="flex w-full flex-col gap-3 sm:flex-row sm:justify-between">
      <Button
        className="w-full"
        color="default"
        radius="full"
        variant="bordered"
        onPress={() => {
          setView("search");
          setPaymentQR("");
          setScanResult(null);
          setScanError(null);
        }}
      >
        ย้อนกลับ
      </Button>
      <Button
        className="w-full"
        color="success"
        isDisabled={!scanResult}
        isLoading={isProcessing}
        radius="full"
        onPress={completeTransfer}
      >
        ส่งหลักฐานและเสร็จสิ้นการโอน
      </Button>
    </div>
  );

  return (
    <Modal
      isDismissable
      backdrop="blur"
      classNames={{
        wrapper: "fixed inset-0 flex items-center justify-center !m-0",
        base:
          "w-full max-w-3xl overflow-hidden rounded-3xl border border-white/10 bg-white/[0.06] text-white backdrop-blur-2xl",
        closeButton:
          "right-5 top-5 rounded-full text-white/70 hover:text-white hover:bg-white/10 backdrop-blur-sm",
      }}
      isOpen={isOpen}
      placement="center"
      scrollBehavior="outside"
      size="lg"
      onClose={handleModalClose}
    >
      <ModalContent>
        <ModalHeader className="flex flex-col gap-3 px-6 pt-6">
          <Chip
            color="success"
            radius="lg"
            size="sm"
            variant="flat"
            className="w-fit border border-emerald-400/40 bg-emerald-500/15 text-emerald-100"
          >
            โอนการจอง
          </Chip>
          <div className="space-y-1">
            <h2 className="text-2xl font-semibold text-white">
              โต๊ะ {booking.table_number} · โซน {booking.zone_name}
            </h2>
            <p className="text-sm text-white/70">
              วันที่เข้าใช้บริการ {bookingDateText}
            </p>
          </div>
        </ModalHeader>

        <ModalBody className="space-y-6 px-6 pb-4">
          {view === "search" ? renderSearchBody : renderPaymentBody}
        </ModalBody>

        <ModalFooter className="px-6 pb-6 pt-0">
          {view === "search" ? searchFooter : paymentFooter}
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};
