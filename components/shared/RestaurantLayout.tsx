import React from "react";

import { tableVariant } from "../ui/tableVariants";

interface Table {
  id: number;
  table_number: string;
  capacity: number;
  status: "available" | "reserved" | "pending";
}

interface Zone {
  id: number;
  name: string;
  tables: Table[];
  booking_fee?: number | string | null;
}

interface RestaurantLayoutProps {
  zones: Zone[];
  selectedTableIds: number[];
  onTableSelect: (table: Table) => void;
  isLoading?: boolean;
}

const getTableShape = (capacity: number): "circle" | "square" | "rect" => {
  if (capacity <= 2) return "circle";
  if (capacity > 4) return "rect";

  return "square";
};

const LayoutSkeleton: React.FC = () => {
  const zonePlaceholders = Array.from({ length: 3 });

  return (
    <div className="space-y-8">
      <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-white/3 px-6 py-10 sm:px-10">
        {/* emerald glow */}
        <span className="absolute inset-x-16 -top-32 h-48 rounded-full bg-emerald-500/20 blur-[150px]" />
        <div className="relative mx-auto flex max-w-xl flex-col items-center gap-4 text-center">
          <div className="h-3 w-32 rounded-full bg-white/10 animate-pulse" />
          <div className="h-5 w-48 rounded-full bg-white/10 animate-pulse" />
          <div className="h-3 w-full rounded-full bg-white/5 animate-pulse" />
          <div className="h-3 w-3/4 rounded-full bg-white/5 animate-pulse" />
        </div>
      </div>

      {zonePlaceholders.map((_, index) => (
        <div
          key={`skeleton-zone-${index}`}
          className="relative overflow-hidden rounded-3xl border border-white/10 bg-white/2 px-6 py-8 sm:px-8"
        >
          {/* emerald corner glow */}
          <span className="absolute right-6 top-6 h-24 w-24 rounded-full bg-emerald-500/15 blur-[120px]" />
          <div className="relative flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
            <div className="space-y-3">
              <div className="h-5 w-36 rounded-full bg-white/10 animate-pulse" />
              <div className="h-3 w-56 rounded-full bg-white/5 animate-pulse" />
            </div>
            <div className="flex flex-wrap gap-3">
              {Array.from({ length: 3 }).map((__, chipIndex) => (
                <span
                  key={`skeleton-chip-${chipIndex}`}
                  className="h-8 w-28 rounded-full border border-white/10 bg-white/5 animate-pulse"
                />
              ))}
            </div>
          </div>

          <div className="relative mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
            {Array.from({ length: 6 }).map((__, tableIndex) => (
              <div
                key={`skeleton-table-${tableIndex}`}
                className="flex flex-col items-center gap-3 rounded-2xl border border-white/10 bg-white/3 p-4"
              >
                <div className="h-14 w-14 rounded-full bg-white/10 animate-pulse" />
                <div className="h-3 w-16 rounded-full bg-white/5 animate-pulse" />
                <div className="h-3 w-24 rounded-full bg-white/5 animate-pulse" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

const RestaurantLayoutComponent: React.FC<RestaurantLayoutProps> = ({
  zones,
  selectedTableIds,
  onTableSelect,
  isLoading = false,
}) => {
  if (isLoading) {
    return <LayoutSkeleton />;
  }

  if (zones.length === 0) {
    return (
      <div className="mt-4 rounded-3xl border border-white/10 bg-white/3 p-10 text-center text-zinc-400">
        ขณะนี้ยังไม่มีผังโต๊ะสำหรับวันที่เลือก
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {zones.map((zone) => {
        const totalTables = zone.tables.length;
        const availableTables = zone.tables.filter(
          (table) => table.status === "available",
        ).length;
        const pendingTables = zone.tables.filter(
          (table) => table.status === "pending",
        ).length;

        return (
          <div
            key={zone.id}
            className="relative overflow-hidden rounded-3xl border border-white/10 bg-white/2 px-6 py-8 sm:px-8"
          >
            {/* emerald corner glow */}
            <span className="absolute right-6 top-6 h-24 w-24 rounded-full bg-emerald-500/20 blur-[120px]" />
            <div className="relative flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h3 className="text-2xl font-semibold text-white">
                  {zone.name}
                </h3>
                <p className="mt-1 text-sm text-zinc-400">
                  ค่ามัดจำโซนนี้ {(Number(zone.booking_fee) || 0).toFixed(2)}{" "}
                  THB ต่อโต๊ะ
                </p>
              </div>

              <div className="flex flex-wrap gap-3 text-xs uppercase">
                <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-zinc-300">
                  ทั้งหมด <strong className="text-white">{totalTables}</strong>{" "}
                  โต๊ะ
                </span>

                {/* available = emerald */}
                <span className="inline-flex items-center gap-2 rounded-full border border-emerald-400/40 bg-emerald-500/10 px-4 py-2 text-emerald-200">
                  ว่าง <strong className="text-white">{availableTables}</strong>
                </span>

                {/* pending แสดงด้วย amber (นับไว้เผื่อโชว์) */}
                {pendingTables > 0 && (
                  <span className="inline-flex items-center gap-2 rounded-full border border-amber-400/40 bg-amber-500/10 px-4 py-2 text-amber-200">
                    รอดำเนินการ{" "}
                    <strong className="text-white">{pendingTables}</strong>
                  </span>
                )}
              </div>
            </div>

            <div className="relative mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
              {zone.tables.map((table) => (
                <button
                  key={table.id}
                  className={[
                    "group flex flex-col items-center gap-3 rounded-2xl p-4 transition",
                    "border border-white/10 bg-white/3",
                    "hover:border-emerald-400/60 hover:bg-white/5",
                    "disabled:cursor-not-allowed disabled:opacity-60",
                    "focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/60",
                  ].join(" ")}
                  disabled={table.status !== "available"}
                  type="button"
                  onClick={() =>
                    table.status === "available" && onTableSelect(table)
                  }
                >
                  <div
                    className={tableVariant({
                      shape: getTableShape(table.capacity),
                      status: table.status,
                      isSelected: selectedTableIds.includes(table.id),
                    })}
                  >
                    <span className="text-xl">{table.table_number}</span>
                    <span className="text-xs opacity-80">
                      ({table.capacity} ที่นั่ง)
                    </span>
                  </div>

                  <div className="text-center text-xs text-zinc-400">
                    <p className="font-semibold text-white">
                      โต๊ะ {table.table_number}
                    </p>
                    <p className="mt-1 text-[11px]">
                      {table.status === "available"
                        ? "ว่าง"
                        : table.status === "pending"
                          ? "กำลังตรวจสอบ"
                          : "ถูกจองเรียบร้อยแล้ว"}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export const RestaurantLayout = React.memo(RestaurantLayoutComponent);
RestaurantLayout.displayName = "RestaurantLayout";
