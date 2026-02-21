// fixcy/pages/admin/management/bookings.tsx
import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/router";
import { useSession } from "@/lib/next-auth-react";
import { Tabs, Tab } from "@heroui/tabs";
import { Card, CardBody, CardHeader } from "@heroui/card";
import { Button } from "@heroui/button";
import { Chip } from "@heroui/chip";
import { Spinner } from "@heroui/spinner";

import DefaultLayout from "@/layouts/default";
import { BookingManagement } from "@/components/admin/BookingManagement";
import { TableManagement } from "@/components/admin/TableManagement";
import { ZoneManagement } from "@/components/admin/ZoneManagement";

const BackIcon = () => (
  <svg height="20" viewBox="0 0 24 24" width="20">
    <path
      d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"
      fill="currentColor"
    />
  </svg>
);

const BookingIcon = () => (
  <svg height="22" viewBox="0 0 24 24" width="22">
    <path
      d="M19 3h-1V1h-2v2H8V1H6v2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2Zm0 16H5V9h14Zm0-12H5V5h14Z"
      fill="currentColor"
    />
  </svg>
);

const TableIcon = () => (
  <svg height="22" viewBox="0 0 24 24" width="22">
    <path d="M4 6v12h2v-6h12v6h2V6zm14 4H6V8h12z" fill="currentColor" />
  </svg>
);

const ZoneIcon = () => (
  <svg height="22" viewBox="0 0 24 24" width="22">
    <path
      d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2m-1 17.93A8 8 0 0 1 5 12a8 8 0 0 1 6-7.93Zm2 0V4.07A8 8 0 0 1 19 12a8 8 0 0 1-6 7.93"
      fill="currentColor"
    />
  </svg>
);

type AdminTab = "bookings" | "tables" | "zones";

const moduleMeta: Record<
  AdminTab,
  {
    title: string;
    description: string;
    badge?: string;
    insights: string[];
    icon: JSX.Element;
    accent: string;
  }
> = {
  bookings: {
    title: "คิวการจอง",
    description: "ตรวจสลิปยืนยันหรือยกเลิกคำจอง",
    insights: [
      "ใช้ตัวกรองสถานะเพื่อเจาะจงรายการที่ต้องตรวจสอบ",
      "ทุกการยืนยันจะอัปเดตแดชบอร์ดทันที",
    ],
    icon: <BookingIcon />,
    accent: "from-primary-500/10 via-primary-500/5 to-primary-500/25",
  },
  tables: {
    title: "ผังโต๊ะและสถานะ",
    description:
      "ปรับจำนวนที่นั่ง",
    badge: "Layout Matrix",
    insights: [
      "เช็กอัตราการใช้งานผ่านสถิติด้านบนก่อนตัดสินใจปรับผัง",
    ],
    icon: <TableIcon />,
    accent: "from-emerald-500/10 via-emerald-500/5 to-emerald-500/25",
  },
  zones: {
    title: "โซนและค่าธรรมเนียม",
    description:
      "กำหนดพื้นที่บริการ",
    badge: "Configuration",
    insights: [
      "ตั้งค่าค่าธรรมเนียมให้สอดคล้องกับความนิยมของโซน"
    ],
    icon: <ZoneIcon />,
    accent: "from-rose-500/10 via-rose-500/5 to-rose-500/25",
  },
};

export default function ManageBookingsPage() {
  const router = useRouter();
  const { data: session, status } = useSession({
    required: true,
    onUnauthenticated() {
      router.replace("/");
    },
  });

  const tabFromQuery = useMemo(() => {
    const queryTab = router.query.tab;
    const value = Array.isArray(queryTab) ? queryTab[0] : queryTab;

    if (value === "tables" || value === "zones" || value === "bookings") {
      return value as AdminTab;
    }

    return "bookings";
  }, [router.query.tab]);

  const [activeTab, setActiveTab] = useState<AdminTab>("bookings");

  useEffect(() => {
    setActiveTab(tabFromQuery);
  }, [tabFromQuery]);

  const handleTabChange = (tab: AdminTab) => {
    setActiveTab(tab);
    const query = tab === "bookings" ? {} : { tab };

    router.replace(
      { pathname: "/admin/management/bookings", query },
      undefined,
      { shallow: true },
    );
  };

  const tabs = useMemo(
    () =>
      (["bookings", "tables", "zones"] as AdminTab[]).map((tab) => ({
        key: tab,
        meta: moduleMeta[tab],
      })),
    [],
  );

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

  const activeMeta = moduleMeta[activeTab];

  return (
    <DefaultLayout>
<div className="mx-auto mt-10 flex max-w-6xl flex-col gap-8 px-4">
  {/* Tabs */}
  <Tabs
    aria-label="Booking management modules"
    classNames={{
      tabList:
        "bg-white/5 border border-white/10 p-3 gap-4 flex-wrap rounded-2xl backdrop-blur-2xl justify-center",
      tab: [
        // ✅ ให้ทุกแท็บมีขนาดเท่ากัน สมส่วน
        "flex items-center justify-start w-[260px] h-24 rounded-2xl px-4 transition-all",
        "data-[selected=true]:bg-white/10 data-[selected=true]:border data-[selected=true]:border-white/20",
        "hover:bg-white/5 active:scale-[0.98]",
      ].join(" "),
      cursor: "rounded-2xl",
    }}
    radius="lg"
    selectedKey={activeTab}
    variant="bordered"
    onSelectionChange={(key) => handleTabChange(key as AdminTab)}
  >
    {tabs.map(({ key, meta }) => (
      <Tab
        key={key}
        title={
          <div className="flex items-center gap-4 text-left w-full">
            <span className="grid place-items-center h-12 w-12 rounded-xl bg-white/10 text-white/80 shrink-0">
              {meta.icon}
            </span>
            <div className="flex min-w-0 flex-col">
              <span className="truncate text-sm font-semibold text-white">
                {meta.title}
              </span>
              <span className="truncate text-xs text-white/60">
                {meta.description}
              </span>
            </div>
          </div>
        }
      >
        {/* ✅ เนื้อหาแต่ละแท็บมี padding เท่ากัน และ card เดิมก็เท่ากัน */}
        <Card className="mt-6 border border-white/10 bg-white/5 backdrop-blur-2xl rounded-2xl overflow-hidden">
          <CardHeader className="flex flex-col gap-3 border-b border-white/10 pb-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-xl font-semibold text-white">
                {activeMeta.title}
              </h2>
              <p className="text-sm text-white/60">{activeMeta.description}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {activeMeta.insights.map((insight, index) => (
                <Chip
                  key={`${activeTab}-${index}`}
                  className="text-xs"
                  color="primary"
                  variant="flat"
                >
                  {insight}
                </Chip>
              ))}
            </div>
          </CardHeader>

          <CardBody className="p-6">
            {key === "bookings" ? (
              <BookingManagement />
            ) : key === "tables" ? (
              <TableManagement />
            ) : (
              <ZoneManagement />
            )}
          </CardBody>
        </Card>
      </Tab>
    ))}
  </Tabs>
</div>

    </DefaultLayout>
  );
}

