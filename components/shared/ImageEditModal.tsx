// components/shared/ImageEditModal.tsx
import type { ChangeEvent } from "react";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
} from "@heroui/modal";
import { DatePicker } from "@heroui/date-picker";
import { Input } from "@heroui/input";
import { Button } from "@heroui/button";
import { Switch } from "@heroui/switch";
import { parseDate } from "@internationalized/date";

import { useNotification } from "@/lib/NotificationContext";

interface SlideImage {
  id: number;
  image_url: string;
  alt_text?: string;
  title?: string;
  date?: string;
  description?: string;
  price: number | string;
  total_tickets: number;
  is_active: boolean;
}

interface ImageEditModalProps {
  image: SlideImage | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: FormData) => Promise<unknown>;
}

export const ImageEditModal = ({
  image,
  isOpen,
  onClose,
  onSave,
}: ImageEditModalProps) => {
  const { showNotification } = useNotification();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");
  const [description, setDescription] = useState("");
  const [altText, setAltText] = useState("");
  const [price, setPrice] = useState("0");
  const [totalTickets, setTotalTickets] = useState("0");
  const [isActive, setIsActive] = useState(true);
  const [newImageFile, setNewImageFile] = useState<File | null>(null);
  const [newImageUrl, setNewImageUrl] = useState("");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const dateValue = useMemo(() => (date ? parseDate(date) : null), [date]);

  const resolveDateInput = useCallback((value?: string) => {
    if (!value) return "";

    const parsed = new Date(value);

    return Number.isNaN(parsed.getTime())
      ? ""
      : parsed.toISOString().split("T")[0];
  }, []);

  useEffect(() => {
    if (image && isOpen) {
      setTitle(image.title ?? "");
      setDate(resolveDateInput(image.date));
      setDescription(image.description ?? "");
      setAltText(image.alt_text ?? "");
      setPrice(String(image.price ?? "0"));
      setTotalTickets(String(image.total_tickets ?? "0"));
      setIsActive(Boolean(image.is_active));
      setPreviewUrl(image.image_url ?? null);
    }

    if (!isOpen) {
      setNewImageFile(null);
      setNewImageUrl("");
      setPreviewUrl(null);
    }
  }, [image, isOpen, resolveDateInput]);

  useEffect(() => {
    if (!newImageFile) {
      return;
    }

    const objectUrl = URL.createObjectURL(newImageFile);

    setPreviewUrl(objectUrl);

    return () => {
      URL.revokeObjectURL(objectUrl);
    };
  }, [newImageFile]);

  useEffect(() => {
    if (newImageUrl.trim()) {
      setPreviewUrl(newImageUrl.trim());
    } else if (!newImageFile && image?.image_url) {
      setPreviewUrl(image.image_url);
    }
  }, [newImageUrl, newImageFile, image?.image_url]);

  const hasChanges = useMemo(() => {
    if (!image) return false;

    return (
      title.trim() !== (image.title ?? "").trim() ||
      description.trim() !== (image.description ?? "").trim() ||
      altText.trim() !== (image.alt_text ?? "").trim() ||
      price !== String(image.price ?? "0") ||
      totalTickets !== String(image.total_tickets ?? "0") ||
      isActive !== Boolean(image.is_active) ||
      date !== resolveDateInput(image.date) ||
      newImageFile !== null ||
      newImageUrl.trim().length > 0
    );
  }, [
    altText,
    date,
    description,
    image,
    isActive,
    newImageFile,
    newImageUrl,
    price,
    resolveDateInput,
    title,
    totalTickets,
  ]);

  const handleFileChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0] ?? null;

      setNewImageFile(file);

      if (file) {
        setNewImageUrl("");
      }
    },
    [],
  );

  const handleSave = useCallback(async () => {
    if (!image) return;

    if (!title.trim() || !date) {
      showNotification(
        "ข้อมูลไม่ครบ",
        "กรุณากรอกชื่ออีเวนต์และวันที่ให้เรียบร้อย",
        "error",
      );

      return;
    }

    setIsSaving(true);

    const formData = new FormData();

    formData.append("id", image.id.toString());
    formData.append("title", title.trim());
    formData.append("date", date);
    formData.append("description", description.trim());
    formData.append("altText", altText.trim());
    formData.append("price", price || "0");
    formData.append("totalTickets", totalTickets || "0");
    formData.append("isActive", String(isActive));

    if (newImageFile) {
      formData.append("image", newImageFile);
    } else if (newImageUrl.trim()) {
      formData.append("imageUrl", newImageUrl.trim());
    }

    try {
      await onSave(formData);
      onClose();
    } catch {
      // Failure handled by parent via notifications.
    } finally {
      setIsSaving(false);
    }
  }, [
    altText,
    date,
    description,
    image,
    isActive,
    newImageFile,
    newImageUrl,
    onClose,
    onSave,
    price,
    showNotification,
    title,
    totalTickets,
  ]);

  if (!image) {
    return null;
  }

  return (
    <Modal
      backdrop="blur"
      classNames={{
        wrapper: "fixed inset-0 flex items-center justify-center !m-0",
        base:
          "w-full max-w-[720px] max-h-[85vh] overflow-hidden " + // <= ปลอดภัย ไม่ล้น
          "rounded-2xl border border-white/10 bg-white/5 backdrop-blur-2xl " +
          "shadow-[0_12px_60px_-20px_rgba(0,0,0,0.6)]",
        header: "px-6 pt-6 pb-2",
        body: "px-6 py-5 overflow-y-auto scrollbar-hide", // <= ซ่อนสกรอลบาร์
        footer: "px-6 pb-6 pt-2",
        closeButton:
          "right-4 top-4 text-white/70 hover:text-white/90 hover:bg-transparent",
      }}
      isOpen={isOpen}
      placement="center"
      scrollBehavior="inside"
      size="lg"
      onClose={onClose}
    >
      <ModalContent>
        {(close) => (
          <>
            <ModalHeader className="flex flex-col gap-1">
              แก้ไขข้อมูลอีเวนต์
              <p className="text-sm font-normal text-white/60">
                ปรับรายละเอียดสำหรับสไลด์โปรโมตและสถานะการขาย
              </p>
            </ModalHeader>

            <ModalBody className="space-y-6">
              {previewUrl ? (
                <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/5">
                  <div className="relative w-full aspect-[16/9]">
                    <img
                      alt={title || image.title || "Event preview"}
                      className="absolute inset-0 h-full w-full object-cover select-none"
                      src={previewUrl}
                    />
                  </div>
                </div>
              ) : null}

              {/* ข้อมูลอีเวนต์ */}
              <section className="space-y-4 rounded-2xl border border-white/10 bg-white/5 p-4">
                <h3 className="text-sm font-semibold uppercase text-white/60">
                  ข้อมูลอีเวนต์
                </h3>
                <Input
                  classNames={{
                    label: "text-white",
                    inputWrapper:
                      "rounded-xl bg-white/5 border-white/10 backdrop-blur " +
                      "data-[hover=true]:bg-white/10 data-[focus-visible=true]:ring-0 data-[focus-visible=true]:outline-none " +
                      "data-[focus-visible=true]:border-emerald-300/60",
                    input: "text-white placeholder:text-white/40",
                  }}
                  labelPlacement="outside"
                  placeholder="ชื่อที่จะแสดงบนสไลด์"
                  size="lg"
                  value={title}
                  variant="bordered"
                  onValueChange={setTitle}
                />
                <div className="grid gap-4 sm:grid-cols-2">
                  <DatePicker
                    classNames={{
                      label: "text-white",
                      inputWrapper:
                        "rounded-xl bg-white/5 border-white/10 backdrop-blur " +
                        "data-[hover=true]:bg-white/10 data-[focus-visible=true]:ring-0 data-[focus-visible=true]:outline-none " +
                        "data-[focus-visible=true]:border-emerald-300/60",
                      input: "text-white placeholder:text-white/40",
                    }}
                    label="วันที่จัด"
                    labelPlacement="outside"
                    size="lg"
                    value={dateValue ?? undefined}
                    variant="bordered"
                    onChange={(value) => {
                      setDate(value ? value.toString() : "");
                    }}
                  />
                  <Input
                    classNames={{
                      label: "text-white",
                      inputWrapper:
                        "rounded-xl bg-white/5 border-white/10 backdrop-blur " +
                        "data-[hover=true]:bg-white/10 data-[focus-visible=true]:ring-0 data-[focus-visible=true]:outline-none " +
                        "data-[focus-visible=true]:border-emerald-300/60",
                      input: "text-white placeholder:text-white/40",
                    }}
                    label="คำอธิบาย"
                    labelPlacement="outside"
                    placeholder="บอกเล่าเกี่ยวกับอีเวนต์ให้ลูกค้าทราบ"
                    size="lg"
                    value={description}
                    variant="bordered"
                    onValueChange={setDescription}
                  />
                </div>
              </section>

              {/* ตั๋วและสถานะการขาย */}
              <section className="space-y-4 rounded-2xl border border-white/10 bg-white/5 p-4">
                <h3 className="text-sm font-semibold uppercase text-white/60">
                  ตั๋วและสถานะการขาย
                </h3>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Input
                    classNames={{
                      label: "text-white",
                      inputWrapper:
                        "rounded-xl bg-white/5 border-white/10 backdrop-blur " +
                        "data-[hover=true]:bg-white/10 data-[focus-visible=true]:ring-0 data-[focus-visible=true]:outline-none " +
                        "data-[focus-visible=true]:border-emerald-300/60",
                      input: "text-white placeholder:text-white/40",
                    }}
                    label="ราคาตั๋ว (THB)"
                    labelPlacement="outside"
                    min={0}
                    size="lg"
                    type="number"
                    value={price}
                    variant="bordered"
                    onValueChange={setPrice}
                  />
                  <Input
                    classNames={{
                      label: "text-white",
                      inputWrapper:
                        "rounded-xl bg-white/5 border-white/10 backdrop-blur " +
                        "data-[hover=true]:bg-white/10 data-[focus-visible=true]:ring-0 data-[focus-visible=true]:outline-none " +
                        "data-[focus-visible=true]:border-emerald-300/60",
                      input: "text-white placeholder:text-white/40",
                    }}
                    label="จำนวนตั๋วทั้งหมด"
                    labelPlacement="outside"
                    min={0}
                    size="lg"
                    type="number"
                    value={totalTickets}
                    variant="bordered"
                    onValueChange={setTotalTickets}
                  />
                </div>
                <Switch
                  classNames={{
                    base: "mt-1 px-3 py-2 rounded-2xl bg-white/5 border border-white/10 backdrop-blur",
                    wrapper:
                      "data-[selected=true]:bg-emerald-400/30 data-[selected=false]:bg-white/5",
                    thumb: "bg-white shadow-lg data-[selected=true]:!bg-white",
                    label: "text-white",
                  }}
                  color="success"
                  isSelected={isActive}
                  size="lg"
                  onValueChange={setIsActive}
                >
                  เปิดขายตั๋ว
                </Switch>
              </section>

              {/* รูปภาพโปรโมต */}
              <section className="space-y-5 rounded-2xl border border-white/10 bg-white/5 p-4">
                <div>
                  <h3 className="text-sm font-semibold uppercase text-white/70">
                    รูปภาพโปรโมต
                  </h3>
                  <p className="text-xs text-white/50 mt-1">
                    รูปภาพจะถูกแสดงบนสไลด์โปรโมตของหน้าอีเวนต์
                  </p>
                </div>

                <Input
                  classNames={{
                    label: "text-white",
                    inputWrapper:
                      "rounded-xl bg-white/5 border-white/10 backdrop-blur " +
                      "data-[hover=true]:bg-white/10 data-[focus-visible=true]:ring-0 data-[focus-visible=true]:outline-none " +
                      "data-[focus-visible=true]:border-emerald-300/60",
                    input: "text-white placeholder:text-white/40",
                  }}
                  labelPlacement="outside"
                  placeholder="คำบรรยายรูปภาพ"
                  size="lg"
                  value={altText}
                  variant="bordered"
                  onValueChange={setAltText}
                />

                <div className="space-y-3 rounded-xl border border-dashed border-white/20 bg-white/5 p-4">
                  <p className="text-xs uppercase text-white/60">
                    เปลี่ยนไฟล์ใหม่ (ไม่บังคับ)
                  </p>

                  <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center">
                    <input
                      ref={fileInputRef}
                      accept="image/*"
                      className="hidden"
                      type="file"
                      onChange={handleFileChange}
                    />
                    <Button
                      className="rounded-full bg-white/10 text-white data-[hover=true]:bg-white/15"
                      color="primary"
                      radius="full"
                      variant="flat"
                      onPress={() => fileInputRef.current?.click()}
                    >
                      เลือกไฟล์ภาพใหม่
                    </Button>

                    <span className="text-xs text-white/60">
                      {newImageFile
                        ? `เลือกแล้ว: ${newImageFile.name}`
                        : "หากไม่เลือก ระบบจะใช้รูปเดิม"}
                    </span>
                  </div>
                </div>

                <Input
                  classNames={{
                    label: "text-white",
                    inputWrapper:
                      "rounded-xl bg-white/5 border-white/10 backdrop-blur " +
                      "data-[hover=true]:bg-white/10 data-[focus-visible=true]:ring-0 data-[focus-visible=true]:outline-none " +
                      "data-[focus-visible=true]:border-emerald-300/60",
                    input: "text-white placeholder:text-white/40",
                  }}
                  labelPlacement="outside"
                  placeholder="ลิ้งรูปภาพ"
                  size="lg"
                  type="url"
                  value={newImageUrl}
                  variant="bordered"
                  onValueChange={setNewImageUrl}
                />
              </section>
            </ModalBody>

            <ModalFooter>
              <Button
                className="rounded-full text-white data-[hover=true]:bg-white/10"
                variant="light"
                onPress={() => {
                  if (isSaving) return;
                  close();
                }}
              >
                ยกเลิก
              </Button>
              <Button
                className="rounded-full bg-emerald-500 text-black font-semibold shadow-[0_10px_30px_-10px_rgba(16,185,129,0.6)] data-[hover=true]:bg-emerald-400"
                color="primary"
                isDisabled={!hasChanges && !isSaving}
                isLoading={isSaving}
                onPress={handleSave}
              >
                {isSaving ? "กำลังบันทึก..." : "บันทึกการเปลี่ยนแปลง"}
              </Button>
            </ModalFooter>
          </>
        )}
      </ModalContent>
    </Modal>
  );
};
