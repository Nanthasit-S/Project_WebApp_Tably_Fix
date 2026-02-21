// components/shared/ImageUploadModal.tsx
import { type ChangeEvent, useEffect, useMemo, useRef, useState } from "react";
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
import { parseDate } from "@internationalized/date";

import { useNotification } from "@/lib/NotificationContext";

interface ImageUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpload: (formData: FormData) => Promise<void>;
}

export const ImageUploadModal = ({
  isOpen,
  onClose,
  onUpload,
}: ImageUploadModalProps) => {
  const { showNotification } = useNotification();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [newImageFile, setNewImageFile] = useState<File | null>(null);
  const [imageUrl, setImageUrl] = useState("");
  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");
  const [description, setDescription] = useState("");
  const [altText, setAltText] = useState("");
  const [price, setPrice] = useState("0");
  const [totalTickets, setTotalTickets] = useState("100");
  const [isUploading, setIsUploading] = useState(false);

  const dateValue = useMemo(() => (date ? parseDate(date) : null), [date]);

  useEffect(() => {
    if (!isOpen) {
      setNewImageFile(null);
      setImageUrl("");
      setTitle("");
      setDate("");
      setDescription("");
      setAltText("");
      setPrice("0");
      setTotalTickets("100");
    }
  }, [isOpen]);

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;

    setNewImageFile(file);
    if (file) {
      setImageUrl("");
    }
  };

  const handleSubmit = async () => {
    if (!newImageFile && !imageUrl.trim()) {
      showNotification(
        "กรุณาเลือกไฟล์หรือกรอก URL",
        "อย่างน้อยต้องมีรูปภาพหนึ่งช่องก่อนอัปโหลด",
        "error",
      );

      return;
    }

    if (!title.trim() || !date) {
      showNotification(
        "ข้อมูลไม่ครบ",
        "กรุณากรอกชื่ออีเวนต์และวันที่จัดกิจกรรม",
        "error",
      );

      return;
    }

    setIsUploading(true);

    const formData = new FormData();

    if (newImageFile) {
      formData.append("image", newImageFile);
    } else {
      formData.append("imageUrl", imageUrl.trim());
    }

    formData.append("title", title.trim());
    formData.append("date", date);
    formData.append("description", description.trim());
    formData.append("altText", altText.trim());
    formData.append("price", price || "0");
    formData.append("totalTickets", totalTickets || "0");

    try {
      await onUpload(formData);
      onClose();
    } catch {
      // Notification handled by parent
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <Modal
      backdrop="blur"
      classNames={{
        wrapper: "fixed inset-0 flex items-center justify-center !m-0",
        base:
          "w-full max-w-[720px] max-h-[85vh] overflow-hidden " +
          "rounded-2xl border border-white/10 bg-white/5 backdrop-blur-2xl " +
          "shadow-[0_12px_60px_-20px_rgba(0,0,0,0.6)]",
        header: "px-6 pt-6 pb-2",
        body: "px-6 py-5 overflow-y-auto scrollbar-hide",
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
              เพิ่มอีเวนต์ใหม่
              <p className="text-sm font-normal text-white/60">
                ใส่รายละเอียดและสื่อโปรโมตสำหรับสไลด์หน้าแรก
              </p>
            </ModalHeader>

            <ModalBody className="space-y-6">
              {/* ข้อมูลอีเวนต์ */}
              <section className="space-y-4 rounded-2xl border border-white/10 bg-white/5 p-4">
                <h3 className="text-sm font-semibold uppercase text-white/70">
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
                  placeholder="เช่น Only Monday Live"
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
                    placeholder="คำอธิบายสั้น ๆ บนสไลด์"
                    size="lg"
                    value={description}
                    variant="bordered"
                    onValueChange={setDescription}
                  />
                </div>
              </section>

              {/* ข้อมูลตั๋ว */}
              <section className="space-y-4 rounded-2xl border border-white/10 bg-white/5 p-4">
                <h3 className="text-sm font-semibold uppercase text-white/70">
                  ข้อมูลตั๋ว
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
                    placeholder="0.00"
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
                    placeholder="100"
                    size="lg"
                    type="number"
                    value={totalTickets}
                    variant="bordered"
                    onValueChange={setTotalTickets}
                  />
                </div>
              </section>

              {/* รูปภาพโปรโมต */}
              <section className="space-y-5 rounded-2xl border border-white/10 bg-white/5 p-4">
                <div>
                  <h3 className="text-sm font-semibold uppercase text-white/70">
                    รูปภาพโปรโมต
                  </h3>
                  <p className="text-xs text-white/50 mt-1">
                    เลือกอัปโหลดไฟล์หรือใส่ URL ก็ได้ เลือกอย่างใดอย่างหนึ่ง
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
                  placeholder="ข้อความอธิบายรูปภาพ"
                  size="lg"
                  value={altText}
                  variant="bordered"
                  onValueChange={setAltText}
                />

                <div className="space-y-3 rounded-xl border border-dashed border-white/20 bg-white/5 p-4">
                  <p className="text-xs uppercase text-white/60">
                    อัปโหลดไฟล์
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
                      เลือกไฟล์ภาพ
                    </Button>
                    <span className="text-xs text-white/60">
                      {newImageFile
                        ? `เลือกแล้ว: ${newImageFile.name}`
                        : "รองรับ .jpg .png .webp"}
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
                  value={imageUrl}
                  variant="bordered"
                  onValueChange={setImageUrl}
                />
              </section>
            </ModalBody>

            <ModalFooter>
              <Button
                className="rounded-full text-white data-[hover=true]:bg-white/10"
                variant="light"
                onPress={() => {
                  if (isUploading) return;
                  close();
                }}
              >
                ยกเลิก
              </Button>
              <Button
                className="rounded-full bg-emerald-500 text-black font-semibold shadow-[0_10px_30px_-10px_rgba(16,185,129,0.6)] data-[hover=true]:bg-emerald-400"
                color="primary"
                isLoading={isUploading}
                onPress={handleSubmit}
              >
                {isUploading ? "กำลังอัปโหลด..." : "อัปโหลดอีเวนต์"}
              </Button>
            </ModalFooter>
          </>
        )}
      </ModalContent>
    </Modal>
  );
};
