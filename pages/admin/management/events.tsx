// fixcy/pages/admin/management/events.tsx
import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/router";
import { useSession } from "@/lib/next-auth-react";
import NextLink from "next/link";
import { Button } from "@heroui/button";
import { Spinner } from "@heroui/spinner";
import { Card, CardBody, CardHeader } from "@heroui/card";

import DefaultLayout from "@/layouts/default";
import {
  EventManagement,
  EventImage,
} from "@/components/admin/EventManagement";
import { ImageUploadModal } from "@/components/shared/ImageUploadModal";
import { ImageEditModal } from "@/components/shared/ImageEditModal";
import { useNotification } from "@/lib/NotificationContext";

const BackIcon = () => (
  <svg fill="currentColor" height="20" viewBox="0 0 24 24" width="20">
    <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z" />
  </svg>
);

const PlusIcon = () => (
  <svg
    fill="currentColor"
    height="20"
    viewBox="0 0 24 24"
    width="20"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" />
  </svg>
);

export default function ManageEventsPage() {
  const router = useRouter();
  const { data: session, status } = useSession({
    required: true,
    onUnauthenticated() {
      router.replace("/");
    },
  });

  const [images, setImages] = useState<EventImage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingImage, setEditingImage] = useState<EventImage | null>(null);
  const { showNotification } = useNotification();

  const fetchImages = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/slider-images");

      let payload: EventImage[] | { message?: string } | null = null;

      try {
        payload = await res.json();
      } catch {
        payload = null;
      }

      if (!res.ok || !Array.isArray(payload)) {
        const message =
          payload && typeof payload === "object" && "message" in payload
            ? String(payload.message ?? "")
            : "";

        throw new Error(message || "ไม่สามารถโหลดรายการอีเวนต์ได้");
      }

      setImages(payload);
    } catch (error) {
      showNotification(
        "โหลดข้อมูลไม่สำเร็จ",
        error instanceof Error ? error.message : "กรุณาลองใหม่อีกครั้ง",
        "error",
      );
    } finally {
      setIsLoading(false);
    }
  }, [showNotification]);

  useEffect(() => {
    fetchImages();
  }, [fetchImages]);

  const handleUpload = async (formData: FormData) => {
    try {
      const response = await fetch("/api/admin/slider", {
        method: "POST",
        body: formData,
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

        throw new Error(message || "อัปโหลดอีเวนต์ไม่สำเร็จ");
      }

      await fetchImages();
      showNotification(
        "อัปโหลดสำเร็จ",
        "เพิ่มอีเวนต์ใหม่บนสไลด์เรียบร้อยแล้ว",
        "success",
      );
    } catch (error: any) {
      showNotification(
        "อัปโหลดไม่สำเร็จ",
        error instanceof Error ? error.message : "กรุณาลองใหม่อีกครั้ง",
        "error",
      );
      throw error;
    }
  };

  const handleEdit = async (formData: FormData) => {
    try {
      const response = await fetch(`/api/admin/slider-update`, {
        method: "POST",
        body: formData,
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

        throw new Error(message || "บันทึกการแก้ไขไม่สำเร็จ");
      }

      await fetchImages();
      showNotification(
        "บันทึกสำเร็จ",
        "อัปเดตข้อมูลอีเวนต์เรียบร้อยแล้ว",
        "success",
      );
    } catch (error) {
      showNotification(
        "บันทึกไม่สำเร็จ",
        error instanceof Error ? error.message : "กรุณาลองใหม่ในภายหลัง",
        "error",
      );
      throw error;
    }
  };

  const openEditModal = (image: EventImage) => {
    setEditingImage(image);
    setIsEditModalOpen(true);
  };

  const openUploadModal = () => {
    setIsUploadModalOpen(true);
  };

  if (status === "loading") {
    return (
      <DefaultLayout>
        <div className="flex h-[calc(100vh-150px)] items-center justify-center">
          <Spinner color="primary" label="กำลังตรวจสอบสิทธิ์..." size="lg" />
        </div>
      </DefaultLayout>
    );
  }

  if (session?.user?.role !== "admin") {
    router.replace("/profile");

    return null;
  }

  return (
    <DefaultLayout>
      <Card className="mx-auto mt-12 w-full max-w-6xl border border-default-200/20 bg-content1/70 backdrop-blur">
        <CardHeader className="flex flex-col gap-4 px-6 pb-6 pt-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-2xl font-semibold text-foreground">
              Event & Promotion Hub
            </h2>
            <p className="mt-1 text-sm text-default-500">
              ควบคุมสื่อโปรโมตในสไลด์หน้าแรก อัปเดตรายละเอียดอีเวนต์
              และติดตามยอดขายบัตรได้จากจุดเดียว
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <Button
              as={NextLink}
              href="/admin/management"
              radius="full"
              startContent={<BackIcon />}
              variant="light"
            >
              กลับไปหน้าแดชบอร์ด
            </Button>
            <Button
              color="primary"
              radius="full"
              startContent={<PlusIcon />}
              onPress={openUploadModal}
            >
              เพิ่มอีเวนต์ใหม่
            </Button>
          </div>
        </CardHeader>
        <CardBody className="px-6 pb-6">
          <EventManagement
            fetchImages={fetchImages}
            images={images}
            isLoading={isLoading}
            onOpenEditModal={openEditModal}
            onOpenUploadModal={openUploadModal}
          />
        </CardBody>
      </Card>
      <ImageUploadModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        onUpload={handleUpload}
      />
      <ImageEditModal
        image={editingImage}
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        onSave={handleEdit}
      />
    </DefaultLayout>
  );
}

