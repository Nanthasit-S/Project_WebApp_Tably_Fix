import type { UiTextMap } from "@/lib/ui-texts";

import React, { useEffect, useMemo, useState } from "react";
import NextLink from "next/link";
import { format } from "date-fns";
import { th } from "date-fns/locale";

type DashboardPayload = {
  stats: {
    totalUsers: number;
    todaysBookings: number;
    pendingConfirmations: number;
  };
  moduleTotals: {
    tables: number;
    zones: number;
    activeEvents: number;
    totalBookings: number;
    confirmedBookings: number;
    awaitingBookings: number;
    cancelledBookings: number;
  };
  pendingBookings: Array<{
    id: number;
    display_name: string | null;
    picture_url: string | null;
    table_number: string;
    booking_date: string;
  }>;
  systemTimeline: Array<{
    date: string;
    bookings: number;
    events: number;
    tickets: number;
  }>;
  eventMetrics: {
    totalOrders: number;
    pendingOrders: number;
    paidOrders: number;
    expiredOrders: number;
    cancelledOrders: number;
  };
  ticketMetrics: {
    totalTickets: number;
    validTickets: number;
    usedTickets: number;
    cancelledTickets: number;
  };
  roleDistribution: Array<{ role: string; total: number }>;
  recentActivity: Array<{
    id: string;
    type: "booking" | "event";
    title: string;
    actor: string;
    status: string;
    timestamp: string;
  }>;
};

type UiTextResponse = { texts: UiTextMap };

const formatNumber = (value: number) => value.toLocaleString("th-TH");

const activityStatusConfig: Record<string, { label: string; className: string }> = {
  cancelled: {
    label: "ถูกยกเลิก",
    className: "border border-rose-400/40 bg-rose-500/15 text-rose-200",
  },
  expired: {
    label: "หมดเวลาการชำระเงิน",
    className: "border border-amber-400/40 bg-amber-500/15 text-amber-100",
  },
  paid: {
    label: "จ่ายแล้ว",
    className: "border border-emerald-400/50 bg-emerald-500/20 text-emerald-100",
  },
  pending: {
    label: "รอการชำระเงิน",
    className: "border border-cyan-400/40 bg-cyan-500/15 text-cyan-100",
  },
  confirmed: {
    label: "ยืนยัน",
    className: "border border-blue-400/40 bg-blue-500/15 text-blue-100",
  },
};

const resolveActivityStatus = (status: string) => {
  const key = status.toLowerCase();

  return (
    activityStatusConfig[key] ?? {
      label: status.toUpperCase(),
      className: "border border-white/20 bg-white/10 text-white/80",
    }
  );
};

const DashboardComponent: React.FC = () => {
  const [data, setData] = useState<DashboardPayload | null>(null);
  const [texts, setTexts] = useState<UiTextMap>({});
  const [drafts, setDrafts] = useState<UiTextMap>({});
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [textLoading, setTextLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [textError, setTextError] = useState<string | null>(null);
  const [savingKey, setSavingKey] = useState<string | null>(null);

  useEffect(() => {
    const loadDashboard = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/admin/dashboard-stats");

        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.message || "Failed to load dashboard data.");
        }

        const payload = (await res.json()) as DashboardPayload;
        setData(payload);
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setLoading(false);
      }
    };

    loadDashboard();
  }, []);

  useEffect(() => {
    const loadTexts = async () => {
      setTextLoading(true);
      setTextError(null);
      try {
        const res = await fetch("/api/admin/ui-texts");

        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.message || "Failed to load UI texts.");
        }

        const payload = (await res.json()) as UiTextResponse;
        setTexts(payload.texts);
      } catch (err) {
        setTextError((err as Error).message);
      } finally {
        setTextLoading(false);
      }
    };

    loadTexts();
  }, []);

  const filteredKeys = useMemo(() => {
    const allKeys = Array.from(new Set([...Object.keys(texts), ...Object.keys(drafts)]));

    if (!search.trim()) {
      return allKeys.sort();
    }

    const matcher = search.trim().toLowerCase();
    return allKeys.filter((key) => key.toLowerCase().includes(matcher)).sort();
  }, [texts, drafts, search]);

  const handleDraftChange = (key: string, value: string) => {
    setDrafts((prev) => ({ ...prev, [key]: value }));
  };

  const handleResetDraft = (key: string) => {
    setDrafts((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  const handleSave = async (key: string, value: string) => {
    setSavingKey(key);
    setTextError(null);
    try {
      const res = await fetch("/api/admin/ui-texts", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key, value }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.message || "Unable to save text override.");
      }

      const payload = (await res.json()) as UiTextResponse;
      setTexts(payload.texts);
      handleResetDraft(key);
    } catch (err) {
      setTextError((err as Error).message);
    } finally {
      setSavingKey(null);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center text-white/70">
        <div className="h-16 w-16 animate-spin rounded-full border-b-2 border-primary-500" />
        <p className="ml-4 text-sm">Loading dashboard data...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="rounded-2xl border border-danger-500/40 bg-danger-500/10 p-10 text-center text-danger-100">
        <p className="text-lg font-semibold">Unable to load dashboard</p>
        <p className="mt-2 text-sm text-danger-200/80">{error ?? "Please try again later."}</p>
        <button
          className="mt-6 rounded-md bg-primary-500 px-4 py-2 text-white"
          type="button"
          onClick={() => location.reload()}
        >
          Reload page
        </button>
      </div>
    );
  }

  const statCards = [
    {
      title: "ยอดจองวันนี้",
      value: formatNumber(data.stats.todaysBookings),
      helper: `รอยืนยัน ${formatNumber(data.stats.pendingConfirmations)}`,
    },
    {
      title: "จำนวนออเดอร์อีเว้นต์",
      value: formatNumber(data.eventMetrics.totalOrders),
      helper: `ยืนยันการชำระเงิน ${formatNumber(data.eventMetrics.paidOrders)}`,
    },
    {
      title: "ปัญหาที่พบอีเว้นต์",
      value: formatNumber(data.ticketMetrics.totalTickets),
      helper: `รอยืนยัน ${formatNumber(data.ticketMetrics.validTickets)}`,
    },
    {
      title: "จำนวนผู้ลงทะเบียน",
      value: formatNumber(data.stats.totalUsers),
      helper: "คน",
    },
  ];

  const managementLinks = [
    {
      label: "การจองโต๊ะ",
      href: "/admin/management/bookings",
      accent:
        "border-emerald-400/30 bg-emerald-500/10 text-emerald-100 hover:border-emerald-400/60 hover:bg-emerald-500/15 hover:text-emerald-50",
    },
    {
      label: "อีเว้นต์",
      href: "/admin/management/events",
      accent:
        "border-purple-400/30 bg-purple-500/10 text-purple-100 hover:border-purple-400/60 hover:bg-purple-500/15 hover:text-purple-50",
    },
    {
      label: "สมาชิก",
      href: "/admin/management/users",
      accent:
        "border-sky-400/30 bg-sky-500/10 text-sky-100 hover:border-sky-400/60 hover:bg-sky-500/15 hover:text-sky-50",
    },
    {
      label: "ระบบ",
      href: "/admin/management/settings",
      accent:
        "border-amber-400/30 bg-amber-500/10 text-amber-100 hover:border-amber-400/60 hover:bg-amber-500/15 hover:text-amber-50",
    },
  ];

  const moduleSummary = [
    {
      label: "กิจกรรมที่กำลังดำเนิการ",
      value: formatNumber(data.moduleTotals.activeEvents),
    },
    {
      label: "ยอดจองโต๊ะ",
      value: formatNumber(data.moduleTotals.totalBookings),
    },
    {
      label: "ยืนยัน",
      value: formatNumber(data.moduleTotals.confirmedBookings),
    },
    {
      label: "รอยืนยัน",
      value: formatNumber(data.moduleTotals.awaitingBookings),
    },
    {
      label: "ยกเลิก",
      value: formatNumber(data.moduleTotals.cancelledBookings),
    },
  ];

  return (
    <div className="space-y-10 text-white">
      <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {statCards.map((card) => (
          <div key={card.title} className="rounded-lg border border-white/10 bg-white/5">
            <div className="space-y-2 p-5">
              <p className="text-xs uppercase text-white/60">{card.title}</p>
              <p className="text-3xl font-semibold text-white">{card.value}</p>
              <p className="text-xs text-white/60">{card.helper}</p>
            </div>
          </div>
        ))}
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-lg border border-white/10 bg-white/5">
          <div className="border-b border-white/10 px-6 py-4">
            <h2 className="text-lg font-semibold text-white">ภาพรวม</h2>
          </div>
          <div className="grid gap-3 px-6 py-5 text-sm text-white/80 sm:grid-cols-2">
            {moduleSummary.map((item) => (
              <div
                key={item.label}
                className="rounded-xl border border-white/10 bg-white/8 px-4 py-3"
              >
                <p className="text-xs uppercase text-white/50">{item.label}</p>
                <p className="mt-1 text-xl font-semibold text-white">{item.value}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-lg border border-white/10 bg-white/5">
          <div className="border-b border-white/10 px-6 py-4">
            <h2 className="text-lg font-semibold text-white">สถานะการจองโต๊ะ & อีเว้นต์</h2>
          </div>
          <div className="grid gap-3 px-6 py-5 text-sm text-white/80 sm:grid-cols-2">
            <div className="rounded-xl border border-white/10 bg-white/8 px-4 py-3">
              <p className="text-xs uppercase text-white/50">รอการยืนยัน</p>
              <p className="mt-1 text-xl font-semibold text-white">
                {formatNumber(data.eventMetrics.pendingOrders)}
              </p>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/8 px-4 py-3">
              <p className="text-xs uppercase text-white/50">หมดอายุการชำระเงิน</p>
              <p className="mt-1 text-xl font-semibold text-white">
                {formatNumber(data.eventMetrics.expiredOrders)}
              </p>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/8 px-4 py-3">
              <p className="text-xs uppercase text-white/50">จำนวนบัตร</p>
              <p className="mt-1 text-xl font-semibold text-white">
                {formatNumber(data.ticketMetrics.usedTickets)}
              </p>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/8 px-4 py-3">
              <p className="text-xs uppercase text-white/50">บัตรถูกยกเลิก</p>
              <p className="mt-1 text-xl font-semibold text-white">
                {formatNumber(data.ticketMetrics.cancelledTickets)}
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-lg border border-white/10 bg-white/5">
          <div className="border-b border-white/10 px-6 py-4">
            <h2 className="text-lg font-semibold text-white">ภาพรวม 7 วันที่ผ่านมา</h2>
          </div>
          <div className="overflow-x-auto px-6 py-5 text-sm text-white/80">
            <table className="min-w-full table-fixed">
              <thead>
                <tr className="text-left text-xs uppercase text-white/60">
                  <th className="py-2">วันที่</th>
                  <th className="py-2">ยอดจองโต๊ะ</th>
                  <th className="py-2">อีเว้นต์</th>
                  <th className="py-2">บัตร</th>
                </tr>
              </thead>
              <tbody>
                {data.systemTimeline.map((row) => {
                  const date = format(new Date(`${row.date}T00:00:00`), "d MMM", {
                    locale: th,
                  });

                  return (
                    <tr key={row.date} className="border-t border-white/10">
                      <td className="py-2">{date}</td>
                      <td className="py-2">{formatNumber(row.bookings)}</td>
                      <td className="py-2">{formatNumber(row.events)}</td>
                      <td className="py-2">{formatNumber(row.tickets)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        <div className="rounded-lg border border-white/10 bg-white/5">
          <div className="border-b border-white/10 px-6 py-4">
            <h2 className="text-lg font-semibold text-white">ภาพรวมจำนวนสมาชิก</h2>
          </div>
          <div className="space-y-3 px-6 py-5 text-sm text-white/80">
            {data.roleDistribution.map((role) => (
              <div
                key={role.role}
                className="flex items-center justify-between rounded-xl border border-white/10 bg-white/8 px-4 py-3"
              >
                <span>{role.role || "Unspecified"}</span>
                <span className="font-semibold text-white">
                  {formatNumber(role.total)}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-lg border border-white/10 bg-white/5">
          <div className="border-b border-white/10 px-6 py-4">
            <h2 className="text-lg font-semibold text-white">กิจกรรมล่าสุด</h2>
          </div>
          <div className="space-y-3 px-6 py-5 text-sm text-white/80">
            {data.recentActivity.length === 0 ? (
              <p className="text-white/60">No activity recorded yet.</p>
            ) : (
              data.recentActivity.map((activity) => {
                const badge = resolveActivityStatus(activity.status);

                return (
                  <div
                    key={activity.id}
                    className="flex flex-col gap-1 rounded-xl border border-white/10 bg-white/5 px-4 py-3"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-white">{activity.title}</span>
                      <span
                        className={`text-xs px-2 py-1 rounded-full uppercase tracking-wide ${badge.className}`}
                      >
                        {badge.label}
                      </span>
                    </div>
                    <span className="text-xs text-white/60">
                      by {activity.actor} • {format(new Date(activity.timestamp), "d MMM HH:mm", { locale: th })}
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </div>

        <div className="rounded-lg border border-white/10 bg-white/5">
          <div className="border-b border-white/10 px-6 py-4">
            <h2 className="text-lg font-semibold text-white">รอการยืนยัน</h2>
          </div>
          <div className="space-y-3 px-6 py-5 text-sm text-white/80">
            {data.pendingBookings.length === 0 ? (
              <p className="text-white/60">ไม่มีการจอง โต๊ะ เข้ามา.</p>
            ) : (
              data.pendingBookings.map((booking) => (
                <div
                  key={booking.id}
                  className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-4 py-3"
                >
                  <img
                    alt={booking.display_name ?? "Guest"}
                    className="h-8 w-8 rounded-full bg-primary/20 object-cover"
                    src={booking.picture_url ?? undefined}
                  />
                  <div className="flex-1">
                    <p className="font-medium text-white">
                      {booking.display_name ?? "Unnamed user"}
                    </p>
                    <p className="text-xs text-white/60">
                      Table {booking.table_number} • {format(new Date(booking.booking_date), "d MMM yyyy", { locale: th })}
                    </p>
                  </div>
                  <NextLink
                    className="rounded-md border border-primary-500 px-3 py-1 text-sm text-primary-500 hover:bg-primary-500/10"
                    href="/admin/management/bookings"
                  >
                    Manage
                  </NextLink>
                </div>
              ))
            )}
          </div>
        </div>
      </section>

      <section>
        <div className="rounded-lg border border-white/10 bg-white/5">
          <div className="border-b border-white/10 px-6 py-4">
            <h2 className="text-lg font-semibold text-white">การจัดการอื่นๆ</h2>
          </div>
          <div className="grid gap-4 px-6 py-5 md:grid-cols-2 lg:grid-cols-4">
            {managementLinks.map((link) => (
              <NextLink
                key={link.href}
                className={`rounded-xl border px-5 py-4 text-sm transition backdrop-blur-xl ${link.accent}`}
                href={link.href}
              >
                <p className="font-semibold text-white">{link.label}</p>
                <p className="mt-1 text-xs text-white/60">เปิดหน้าต่าง</p>
              </NextLink>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
};

export const Dashboard = DashboardComponent;
