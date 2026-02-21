import React, { useEffect, useState } from "react";
import QrScanner from "qr-scanner";

interface SlipSubmissionPayload {
  refNbr: string;
  file: File;
}

interface BookingSlipModalProps {
  isOpen: boolean;
  onClose: () => void;
  qrCodeUrl: string;
  totalFee: number;
  onSubmit: (payload: SlipSubmissionPayload) => void;
  isSubmitting: boolean;
  headerText?: string;
}

const Spinner: React.FC<{ label?: string }> = ({ label }) => (
  <div className="flex flex-col items-center gap-2 text-white/70">
    <span className="inline-flex h-10 w-10 animate-spin rounded-full border-2 border-white/30 border-t-transparent" />
    {label ? <p className="text-xs text-white/60">{label}</p> : null}
  </div>
);

export const BookingSlipModal: React.FC<BookingSlipModalProps> = ({
  isOpen,
  onClose,
  qrCodeUrl,
  totalFee,
  onSubmit,
  isSubmitting,
  headerText,
}) => {
  const [scanResult, setScanResult] = useState<string | null>(null);
  const [slipFile, setSlipFile] = useState<File | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setScanResult(null);
      setSlipFile(null);
      setError(null);
      setIsScanning(false);
    }
  }, [isOpen]);

  if (!isOpen) {
    return null;
  }

  const handleFileChange = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    setSlipFile(file);
    setScanResult(null);
    setError(null);
    setIsScanning(true);
    try {
      const result = await QrScanner.scanImage(file, {
        returnDetailedScanResult: true,
      });

      setScanResult(result.data);
    } catch (err) {
      console.error(err);
      setError(
        "ไม่พบ QR Code ในสลิปที่อัปโหลด กรุณาลองใหม่อีกครั้งด้วยไฟล์ที่ชัดเจน",
      );
    } finally {
      setIsScanning(false);
    }
  };

  const handleSubmit = () => {
    if (!scanResult || !slipFile) {
      alert(
        "กรุณาอัปโหลดสลิปการชำระเงินที่มี QR Code เพื่อให้ระบบตรวจสอบอัตโนมัติ",
      );

      return;
    }

    onSubmit({
      refNbr: scanResult,
      file: slipFile,
    });
  };

  return (
    <div
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/10 px-4 py-6 backdrop-blur-md"
      role="dialog"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-md overflow-hidden rounded-3xl border border-white/10 bg-[#000] p-8"
        onClick={(event) => event.stopPropagation()}
      >
        <button
          aria-label="ปิดหน้าต่าง"
          className="absolute right-4 top-4 inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/15 text-white/70 transition hover:border-white/40 hover:text-white"
          type="button"
          onClick={onClose}
        >
          <svg
            fill="none"
            height="16"
            stroke="currentColor"
            strokeWidth="1.8"
            viewBox="0 0 24 24"
            width="16"
          >
            <path
              d="M5 5l14 14M19 5L5 19"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>

        <div className="space-y-6 pt-4">
          <header className="space-y-2 text-left">
            <p className="text-xs font-semibold uppercase text-white/40">
              {headerText ? "สลิปชำระเงิน" : "ยืนยันการชำระเงิน"}
            </p>
            <h2 className="text-2xl font-semibold">
              {headerText || "ยืนยันการชำระเงิน"}
            </h2>
          </header>

          <div className="rounded-3xl border border-white/10 bg-black/40 p-5 text-center text-sm text-white/70">
            <p className="text-xs uppercase text-white/40">ยอดที่ต้องชำระ</p>
            <p className="mt-2 text-3xl font-semibold text-white">
              {totalFee.toFixed(2)} THB
            </p>
            <p className="mt-2 text-xs text-white/50">
              แสกน QR Code ด้านล่างและอัปโหลดสลิปเพื่อให้ระบบตรวจสอบอัตโนมัติ
            </p>
          </div>

          <div className="flex flex-col items-center gap-4 rounded-3xl border border-white/10 bg-black/30 p-6 text-center">
            {qrCodeUrl ? (
              <img
                alt="PromptPay QR Code"
                className="h-60 w-60 rounded-2xl border border-white/10 bg-white/4 p-4 shadow-inner"
                src={qrCodeUrl}
              />
            ) : (
              <Spinner label="กำลังสร้าง QR Code..." />
            )}
            <p className="text-xs text-white/60">
              ใช้แอปธนาคารหรือ PromptPay เพื่อชำระค่ามัดจำ
            </p>
          </div>

          <div className="space-y-3 text-sm text-white/80">
            <p className="font-semibold text-white">
              อัปโหลดสลิปสำหรับการยืนยัน
            </p>
            <label className="flex w-full cursor-pointer flex-col items-center justify-center gap-3 rounded-3xl border border-dashed border-white/20 bg-white/5 px-4 py-6 text-center text-xs text-white/60 transition hover:border-white/40 hover:bg-white/10">
              <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[11px] uppercase text-white/60">
                แนบไฟล์
              </span>
              <span>เลือกสลิปเป็นไฟล์ JPG หรือ PNG</span>
              <input
                accept="image/*"
                className="hidden"
                type="file"
                onChange={handleFileChange}
              />
            </label>
            {slipFile ? (
              <p className="text-xs text-emerald-200">
                แนบไฟล์: <span className="font-medium">{slipFile.name}</span>
              </p>
            ) : null}
            {isScanning && (
              <Spinner label="กำลังสแกน QR Code จากสลิป..." />
            )}
            {error ? <p className="text-xs text-rose-300">{error}</p> : null}
            {scanResult ? (
              <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-xs text-emerald-200">
                สแกน QR Code จากสลิปเรียบร้อย ระบบพร้อมตรวจสอบยอดแล้ว
              </div>
            ) : null}
          </div>

          <div className="flex flex-col gap-2 border-t border-white/10 pt-4 text-sm sm:flex-row sm:justify-end">
            <button
              className="w-full rounded-full border border-white/20 px-5 py-3 font-semibold text-white/70 transition hover:border-white/50 hover:text-white sm:w-auto"
              type="button"
              onClick={onClose}
            >
              ปิดหน้าต่าง
            </button>
            <button
              className={`w-full rounded-full px-5 py-3 font-semibold uppercase transition sm:w-auto ${
                scanResult && slipFile && !isSubmitting
                  ? "border border-emerald-400/40 bg-emerald-500/20 text-emerald-100 hover:bg-emerald-500/30"
                  : "border border-white/15 bg-white/5 text-white/40"
              }`}
              disabled={!scanResult || !slipFile || isSubmitting}
              type="button"
              onClick={handleSubmit}
            >
              {isSubmitting ? "กำลังตรวจสอบ..." : "ส่งสลิปยืนยัน"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
