import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { Alert } from "@heroui/alert";
import { Avatar } from "@heroui/avatar";
import { Button } from "@heroui/button";
import { Card, CardBody } from "@heroui/card";
import { Chip } from "@heroui/chip";
import { Divider } from "@heroui/divider";
import { Input } from "@heroui/input";
import { Skeleton } from "@heroui/skeleton";
import { Spinner } from "@heroui/spinner";
import { Switch } from "@heroui/switch";

import { useNotification } from "@/lib/NotificationContext";

// --- 1. Interface (มี layoutImageUrl อยู่แล้ว) ---
interface Settings {
  isBookingEnabled: boolean;
  maxBookingsPerUser: number;
  transferFee: number;
  promptpayAccount: string;
  layoutImageUrl: string;
}

// --- 2. แก้ไขค่า Default ---
const defaultSettings: Settings = {
  isBookingEnabled: false,
  maxBookingsPerUser: 0,
  transferFee: 0,
  promptpayAccount: "",
  layoutImageUrl: "", // <-- เพิ่ม
};

// --- 3. แก้ไข Sanitize Function ---
const sanitizeSettings = (
  payload: Partial<Settings> | Settings | null,
): Settings => {
  if (!payload) return { ...defaultSettings };

  const maxBookings = Number((payload as Partial<Settings>).maxBookingsPerUser);
  const transferFee = Number((payload as Partial<Settings>).transferFee);

  return {
    isBookingEnabled: Boolean(payload.isBookingEnabled),
    maxBookingsPerUser: Number.isFinite(maxBookings)
      ? Math.max(0, Math.floor(maxBookings))
      : defaultSettings.maxBookingsPerUser,
    transferFee: Number.isFinite(transferFee)
      ? Math.max(0, Math.round(transferFee * 100) / 100)
      : defaultSettings.transferFee,
    promptpayAccount: String(
      (payload as Partial<Settings>).promptpayAccount ??
        defaultSettings.promptpayAccount,
    ),
    // <-- เพิ่ม
    layoutImageUrl: String(
      (payload as Partial<Settings>).layoutImageUrl ??
        defaultSettings.layoutImageUrl,
    ),
  };
};

const currencyFormatter = new Intl.NumberFormat("th-TH", {
  style: "currency",
  currency: "THB",
  minimumFractionDigits: 2,
});

type SummaryChip = {
  label: string;
  value: string;
  color: "success" | "danger" | "primary" | "warning" | "default";
};

export const SettingsManagement = () => {
  const [settings, setSettings] = useState<Settings>({ ...defaultSettings });
  const [isLoading, setIsLoading] = useState(true);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [hasError, setHasError] = useState(false);
  const { showNotification } = useNotification();

  const fetchSettings = useCallback(async () => {
    setIsLoading(true);
    setHasError(false);
    try {
      // --- 4. API GET (ต้องไปแก้ API ให้ส่ง layoutImageUrl ด้วย) ---
      const response = await fetch("/api/admin/settings");
      let payload: Partial<Settings> | { message?: string } | null = null;

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
        throw new Error(message || "Failed to fetch settings.");
      }

      setSettings((prev) =>
        sanitizeSettings((payload as Partial<Settings>) ?? prev),
      );
    } catch (error) {
      setHasError(true);
      showNotification(
        "Unable to load settings",
        error instanceof Error ? error.message : "Please try again later.",
        "error",
      );
    } finally {
      setHasLoaded(true);
      setIsLoading(false);
    }
  }, [showNotification]);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  // --- 5. API POST (POST ส่ง object 'settings' ทั้งหมดไปอยู่แล้ว) ---
  const handleSave = useCallback(async () => {
    setIsSaving(true);
    try {
      const response = await fetch("/api/admin/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings), // ส่ง object ทั้งหมดไป
      });

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
        throw new Error(message || "Failed to save settings.");
      }

      setHasError(false);
      showNotification(
        "Settings saved",
        "Configuration updated successfully.",
        "success",
      );
    } catch (error) {
      showNotification(
        "Save failed",
        error instanceof Error ? error.message : "Please try again later.",
        "error",
      );
    } finally {
      setIsSaving(false);
    }
  }, [settings, showNotification]);

  // --- 6. Handler สำหรับ PromptPay Input ---
  const handlePromptpayAccountChange = useCallback((value: string) => {
    setSettings((prev) => ({
      ...prev,
      promptpayAccount: value.trim(),
    }));
  }, []);

  // --- 6.1 [เพิ่ม] Handler สำหรับ Layout Image URL ---
  const handleLayoutImageUrlChange = useCallback((value: string) => {
    setSettings((prev) => ({
      ...prev,
      layoutImageUrl: value.trim(),
    }));
  }, []);

  // (Handler เดิม)
  const handleMaxBookingsChange = useCallback((value: string) => {
    setSettings((prev) => {
      const parsed = Number(value);
      const normalized = Number.isFinite(parsed)
        ? Math.max(0, Math.floor(parsed))
        : 0;
      return { ...prev, maxBookingsPerUser: normalized };
    });
  }, []);

  // (Handler เดิม)
  const handleTransferFeeChange = useCallback((value: string) => {
    setSettings((prev) => {
      const parsed = Number(value);
      const normalized = Number.isFinite(parsed)
        ? Math.max(0, Math.round(parsed * 100) / 100)
        : 0;
      return { ...prev, transferFee: normalized };
    });
  }, []);

  // (Summary เดิม)
  const bookingStatusSummary = useMemo<SummaryChip>(
    () => ({
      label: "สถานะระบบจอง",
      value: settings.isBookingEnabled ? "เปิดใช้งาน" : "ปิดชั่วคราว",
      color: settings.isBookingEnabled ? "success" : "danger",
    }),
    [settings.isBookingEnabled],
  );

  // (Summary เดิม)
  const bookingLimitSummary = useMemo<SummaryChip>(
    () => ({
      label: "จำนวนการจองต่อผู้ใช้",
      value:
        settings.maxBookingsPerUser > 0
          ? `${settings.maxBookingsPerUser} รายการ / วัน`
          : "ไม่จำกัด",
      color: settings.maxBookingsPerUser > 0 ? "primary" : "default",
    }),
    [settings.maxBookingsPerUser],
  );

  // --- 7. Summary Chip สำหรับ PromptPay ---
  const promptpaySummary = useMemo<SummaryChip>(
    () => ({
      label: "บัญชีรับเงิน",
      value: settings.promptpayAccount || "ยังไม่ได้ตั้งค่า",
      color: settings.promptpayAccount ? "primary" : "warning",
    }),
    [settings.promptpayAccount],
  );

  // (Summary เดิม - แก้ไขเล็กน้อย)
  const transferFeeSummary = useMemo<SummaryChip>(
    () => ({
      label: "ค่าธรรมเนียมการโอน",
      value:
        settings.transferFee > 0
          ? `${currencyFormatter.format(settings.transferFee)} / ครั้ง`
          : "ไม่มีค่าธรรมเนียม",
      color: settings.transferFee > 0 ? "warning" : "success",
    }),
    [settings.transferFee],
  );

  // --- 7.1 [เพิ่ม] Summary Chip สำหรับ Layout Image ---
  const layoutImageSummary = useMemo<SummaryChip>(
    () => ({
      label: "ภาพแผนผัง",
      value: settings.layoutImageUrl ? "ตั้งค่าแล้ว" : "ยังไม่ได้ตั้งค่า",
      color: settings.layoutImageUrl ? "primary" : "warning",
    }),
    [settings.layoutImageUrl],
  );

  const isInitialLoading = isLoading && !hasLoaded;

  const SummarySkeleton = () => (
    <div className="flex flex-wrap gap-3">
      {/* --- 8. เพิ่ม Skeleton (เป็น 5) --- */}
      {Array.from({ length: 5 }).map((_, index) => (
        <Skeleton
          key={index}
          className="h-10 w-40 rounded-full bg-white/10"
        />
      ))}
    </div>
  );

  const SummaryChips = () => (
    <div className="flex flex-wrap gap-3">
      {/* --- 9. เพิ่ม Chip ใน List --- */}
      {[
        bookingStatusSummary,
        bookingLimitSummary,
        promptpaySummary,
        transferFeeSummary,
        layoutImageSummary, // <-- เพิ่ม
      ].map((item) => (
        <Chip
          key={item.label}
          color={item.color}
          size="lg"
          variant="flat"
          className="border border-white/10 bg-white/10 text-white/90 backdrop-blur"
        >
          <span className="font-medium">{item.label} :</span>{" "}
          <span className="font-semibold">{item.value}</span>
        </Chip>
      ))}
    </div>
  );

  // (Loading state เดิม)
  if (isInitialLoading) {
    return (
      <section className="mx-auto w-full max-w-5xl space-y-6">
        <Card className="relative overflow-hidden border border-white/10 bg-gradient-to-br from-emerald-500/10 via-slate-900/60 to-slate-950/90 text-white shadow-[0_35px_80px_-35px_rgba(16,185,129,0.45)]">
          <CardBody className="space-y-6 px-8 py-10">
            <div className="space-y-3">
              <Skeleton className="h-4 w-40 rounded-full bg-white/10" />
              <Skeleton className="h-8 w-72 rounded-full bg-white/10" />
              <Skeleton className="h-6 w-96 rounded-full bg-white/10" />
            </div>
            <SummarySkeleton />
            <div className="flex items-center gap-3 pt-2 text-sm text-white/70">
              <Spinner color="success" size="sm" />
              กำลังโหลดข้อมูลการตั้งค่าล่าสุดจากเซิร์ฟเวอร์...
            </div>
          </CardBody>
        </Card>
      </section>
    );
  }

  // (Return JSX เดิม)
  return (
    <section className="mx-auto flex w-full max-w-5xl flex-col gap-8 text-white">
      <Card className="relative overflow-hidden border border-white/10 bg-gradient-to-br from-emerald-500/10 via-slate-900/60 to-slate-950/90 text-white">
        {/* (CardBody เดิม) */}
        <CardBody className="space-y-6 px-8 py-10">
          {isLoading ? <SummarySkeleton /> : <SummaryChips />}
          <Divider className="border-white/10" />
          <div className="flex flex-wrap items-center gap-4 text-sm text-white/70">
            <div className="flex items-center gap-3">
              <Avatar
                className="h-10 w-10 border border-emerald-400/40"
                name="System"
                size="sm"
              />
              <div>
                <p className="font-medium text-white/90">
                  ค่าที่แก้ไขจะมีผลทันที
                </p>
                <p className="text-xs text-white/60">
                  ระบบส่งการแจ้งเตือนให้ผู้ใช้ที่ได้รับผลกระทบอัตโนมัติ
                </p>
              </div>
            </div>
            {isLoading ? (
              <div className="flex items-center gap-2 text-xs text-white/70">
                <Spinner color="success" size="sm" />
                ซิงก์ค่าล่าสุดจากเซิร์ฟเวอร์...
              </div>
            ) : null}
          </div>
        </CardBody>
      </Card>

      {hasError ? (
        <Alert
          color="warning"
          variant="flat"
          className="border border-amber-500/40 bg-amber-500/15 text-amber-100"
        >
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1">
              <p className="text-sm font-semibold">
                โหลดข้อมูลได้ไม่ครบถ้วน
              </p>
              <p className="text-xs text-amber-200/90">
                ปรับค่าที่จำเป็นด้วยตนเองหรือรีเฟรชจากเซิร์ฟเวอร์อีกครั้ง
              </p>
            </div>
            <Button
              color="warning"
              radius="full"
              variant="bordered"
              isDisabled={isLoading || isSaving}
              onPress={fetchSettings}
            >
              ลองโหลดใหม่
            </Button>
          </div>
        </Alert>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-12">
        <Card className="lg:col-span-7 border border-white/10 bg-white/5 text-white backdrop-blur-xl">
          <CardBody className="space-y-6">
            <div className="space-y-2">
              <h2 className="text-2xl font-semibold text-white">
                การตั้งค่าระบบ
              </h2>
              <p className="text-sm text-white/65">
                ควบคุมการจอง, จำนวนสูงสุด, และการแสดงผลหน้าแผนผัง
              </p>
            </div>

            <Switch
              color="success"
              size="lg"
              isDisabled={isLoading || isSaving}
              isSelected={settings.isBookingEnabled}
              onValueChange={(value) =>
                setSettings((prev) => ({ ...prev, isBookingEnabled: value }))
              }
              classNames={{
                base: "rounded-2xl border border-white/10 bg-white/10 px-4 py-3 backdrop-blur-xl",
                wrapper:
                  "group-data-[selected=true]:bg-success-200/30 group-data-[selected=true]:border-success-500/40",
                label: "font-semibold text-white",
              }}
            >
              {settings.isBookingEnabled
                ? "เปิดให้ลูกค้าจองออนไลน์"
                : "ปิดการจองชั่วคราว"}
            </Switch>

            <Divider className="border-white/10" />

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <Input
                type="number"
                min={0}
                size="lg"
                label="จำนวนการจองสูงสุดต่อผู้ใช้"
                labelPlacement="outside"
                placeholder="0"
                description="ใส่ 0 หากต้องการให้จองได้ไม่จำกัด"
                value={String(settings.maxBookingsPerUser)}
                onValueChange={handleMaxBookingsChange}
                isDisabled={isLoading || isSaving}
                step={1}
                variant="bordered"
                classNames={{
                  label: "text-white/80 font-medium",
                  inputWrapper:
                    "rounded-2xl border border-white/15 bg-white/5 backdrop-blur-xl",
                  description: "text-white/60 text-xs",
                }}
                endContent={
                  <span className="pointer-events-none select-none text-xs text-white/60">
                    ต่อวัน
                  </span>
                }
              />
              <Card className="border border-white/10 bg-white/5 text-white shadow-none">
                <CardBody className="space-y-2 text-sm text-white/70">
                  <p className="font-semibold text-white/90">
                    แนวทางแนะนำ
                  </p>
                  <ul className="space-y-1 text-xs leading-5">
                    <li>• 2-3 รายการต่อวันสำหรับร้านที่มีที่นั่งจำกัด</li>
                    <li>• 0 (ไม่จำกัด) เมื่อเน้นการจองแบบต่อเนื่อง</li>
                    <li>• ปรับเปลี่ยนตามช่วงโปรโมชั่นหรือเทศกาล</li>
                  </ul>
                </CardBody>
              </Card>
            </div>
            <Divider className="border-white/10" /><br></br>

            <Input
              type="text"
              size="lg"
              label="URL รูปภาพแผนผังร้าน"
              labelPlacement="outside"
              placeholder="https://.../image.png"
              description="รูปภาพที่จะแสดงในหน้า 'แผนผังร้าน'"
              value={settings.layoutImageUrl}
              onValueChange={handleLayoutImageUrlChange}
              isDisabled={isLoading || isSaving}
              variant="bordered"
              classNames={{
                label: "text-white/80 font-medium",
                inputWrapper:
                  "rounded-2xl border border-white/15 bg-white/5 backdrop-blur-xl",
                description: "text-white/60 text-xs",
              }}
            />
          </CardBody>
        </Card>

        <Card className="lg:col-span-5 border border-white/10 bg-white/5 text-white backdrop-blur-xl">
          <CardBody className="space-y-6">
            <div className="space-y-2">
              <h2 className="text-2xl font-semibold text-white">
                ข้อมูลบัญชีและการเงิน
              </h2>
              <p className="text-sm text-white/65">
                กำหนดบัญชีรับเงินและค่าธรรมเนียม
              </p>
            </div>

            <Input
              type="text"
              size="lg"
              label="เลขบัญชี / PromptPay (สำหรับตรวจสอบสลิป)"
              labelPlacement="outside"
              placeholder="เช่น 08X-XXX-XXXX"
              description="บัญชีที่ใช้รับเงินค่าจอง (ต้องตรงกับสลิป)"
              value={settings.promptpayAccount}
              onValueChange={handlePromptpayAccountChange}
              isDisabled={isLoading || isSaving}
              variant="bordered"
              classNames={{
                label: "text-white/80 font-medium",
                inputWrapper:
                  "rounded-2xl border border-white/15 bg-white/5 backdrop-blur-xl",
                description: "text-white/60 text-xs",
              }}
            />

            <Input
              type="number"
              min={0}
              step="0.01"
              size="lg"
              label="ค่าธรรมเนียมการโอน (ถ้ามี)"
              labelPlacement="outside"
              placeholder="0.00"
              description="ค่าธรรมเนียมสำหรับการโอนโต๊ะ (ไม่ใช่ค่าจอง)"
              value={String(settings.transferFee)}
              onValueChange={handleTransferFeeChange}
              isDisabled={isLoading || isSaving}
              variant="bordered"
              classNames={{
                label: "text-white/80 font-medium",
                inputWrapper:
                  "rounded-2xl border border-white/15 bg-white/5 backdrop-blur-xl",
                description: "text-white/60 text-xs",
              }}
              endContent={
                <span className="pointer-events-none select-none text-xs text-white/60">
                  THB
                </span>
              }
            />

            <Card className="border border-emerald-300/30 bg-emerald-500/10 text-emerald-100 shadow-none">
              <CardBody className="space-y-1 text-xs leading-relaxed">
                <p className="font-semibold text-emerald-200">
                  ระบบตรวจสอบการชำระเงิน
                </p>
                <p>
                  เมื่อมีการโอน ระบบจะตรวจสอบสลิปผ่าน OpenSlipVerify
                  และป้องกันการใช้สลิปซ้ำโดยอัตโนมัติ
                </p>
              </CardBody>
            </Card>
          </CardBody>
        </Card>
      </div>

      <Card className="border border-white/10 bg-white/5 text-white backdrop-blur-xl">
        <CardBody className="flex flex-col gap-4 text-sm text-white/75 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <Button
              variant="bordered"
              radius="full"
              color="default"
              isDisabled={isLoading || isSaving}
              onPress={fetchSettings}
            >
              โหลดค่าจากเซิร์ฟเวอร์
            </Button>
            <Button
              color="success"
              radius="full"
              className="font-semibold"
              isDisabled={isLoading || isSaving}
              isLoading={isSaving}
              onPress={handleSave}
            >
              บันทึกการตั้งค่า
            </Button>
          </div>
        </CardBody>
      </Card>
    </section>
  );
};