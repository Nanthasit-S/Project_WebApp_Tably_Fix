import React from "react";
import { useRouter } from "next/router";
import { useSession } from "@/lib/next-auth-react";
import { Button } from "@heroui/button";
import { Spinner } from "@heroui/spinner";

import DefaultLayout from "@/layouts/default";
import { SettingsManagement } from "@/components/admin/SettingsManagement";

const BackIcon = () => (
  <svg height="20" viewBox="0 0 24 24" width="20">
    <path
      d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"
      fill="currentColor"
    />
  </svg>
);

export default function ManageSettingsPage() {
  const router = useRouter();
  const { data: session, status } = useSession({
    required: true,
    onUnauthenticated() {
      router.replace("/");
    },
  });

  if (status === "loading") {
    return (
      <DefaultLayout>
        <div className="flex h-[calc(100vh-150px)] items-center justify-center">
          <Spinner label="Checking admin access..." size="lg" />
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
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 py-6 text-white">
        <SettingsManagement />
      </div>
    </DefaultLayout>
  );
}

