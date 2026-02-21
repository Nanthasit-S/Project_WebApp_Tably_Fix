// fixcy/pages/admin/management/zones.tsx
import React, { useEffect } from "react";
import { useRouter } from "next/router";
import { useSession } from "next-auth/react";
import { Spinner } from "@heroui/spinner";

import DefaultLayout from "@/layouts/default";

export default function ManageZonesPage() {
  const router = useRouter();
  const { data: session, status } = useSession({
    required: true,
    onUnauthenticated() {
      router.replace("/");
    },
  });

  useEffect(() => {
    if (status === "loading") return;
    if (!session || session.user?.role !== "admin") {
      router.replace("/profile");

      return;
    }
    router.replace("/admin/management/bookings?tab=zones");
  }, [router, session, status]);

  return (
    <DefaultLayout>
      <div className="flex justify-center items-center h-[calc(100vh-150px)]">
        <Spinner label="Redirecting to unified control..." size="lg" />
      </div>
    </DefaultLayout>
  );
}
