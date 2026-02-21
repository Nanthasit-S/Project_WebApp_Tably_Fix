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

const activityStatusConfig: Record<
  string,
  { label: string; className: string }
> = {
  cancelled: {
    label: "",
    className: "border border-rose-400/40 bg-rose-500/15 text-rose-200",
  },
  expired: {
    label: "",
    className: "border border-amber-400/40 bg-amber-500/15 text-amber-100",
  },
  paid: {
    label: "",
    className: "border border-emerald-400/50 bg-emerald-500/20 text-emerald-100",
  },
  pending: {
    label: "",
    className: "border border-cyan-400/40 bg-cyan-500/15 text-cyan-100",
  },
  confirmed: {
    label: "",
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

          throw new Error(body.message || "");
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

          throw new Error(body.message || "");
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
    const allKeys = Array.from(
      new Set([...Object.keys(texts), ...Object.keys(drafts)]),
    );

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

        throw new Error(body.message || "");
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
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary-500" />
        <p className="ml-4">...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="rounded-2xl border border-danger-500/40 bg-danger-500/10 p-10 text-center text-danger-100">
        <p className="text-lg font-semibold"></p>
        <p className="mt-2 text-sm text-danger-200/80">
          {error ?? ""}
        </p>
        <button
          className="mt-6 px-4 py-2 bg-primary-500 text-white rounded-md"
          onClick={() => location.reload()}
        >
          
        </button>
      </div>
    );
  }

  const statCards = [
    {
      title: "",
      value: formatNumber(data.stats.todaysBookings),
      helper: ` ${formatNumber(data.stats.pendingConfirmations)}`,
    },
    {
      title: "",
      value: formatNumber(data.eventMetrics.totalOrders),
      helper: ` ${formatNumber(data.eventMetrics.paidOrders)}`,
    },
    {
      title: "",
      value: formatNumber(data.ticketMetrics.totalTickets),
      helper: ` ${formatNumber(data.ticketMetrics.validTickets)}`,
    },
  ];

  const managementLinks = [
    {
      label: " & ",
      href: "/admin/management/bookings",
      accent:
        "border-emerald-400/30 bg-emerald-500/10 text-emerald-100 hover:border-emerald-400/60 hover:bg-emerald-500/15 hover:text-emerald-50",
    },
    {
      label: " & ",
      href: "/admin/management/events",
      accent:
        "border-purple-400/30 bg-purple-500/10 text-purple-100 hover:border-purple-400/60 hover:bg-purple-500/15 hover:text-purple-50",
    },
    {
      label: " & ",
      href: "/admin/management/users",
      accent:
        "border-sky-400/30 bg-sky-500/10 text-sky-100 hover:border-sky-400/60 hover:bg-sky-500/15 hover:text-sky-50",
    },
    {
      label: "",
      href: "/admin/management/settings",
      accent:
        "border-amber-400/30 bg-amber-500/10 text-amber-100 hover:border-amber-400/60 hover:bg-amber-500/15 hover:text-amber-50",
    },
  ];

  return (
    <div className="space-y-10">
      <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {statCards.map((card) => (
          <div
            key={card.title}
            className="border border-white/10 bg-white/4 rounded-lg"
          >
            <div className="space-y-2 p-5">
              <p className="text-xs uppercase text-white/60">{card.title}</p>
              <p className="text-3xl font-semibold text-white">{card.value}</p>
              <p className="text-xs text-white/60">{card.helper}</p>
            </div>
          </div>
        ))}
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="border border-white/10 bg-white/4 rounded-lg">
          <div className="border-b border-white/10 px-6 py-4">
            <h2 className="text-lg font-semibold text-white">
               7 
            </h2>
          </div>
          <div className="overflow-x-auto px-6 py-5 text-sm text-white/80">
            <table className="min-w-full table-fixed">
              <thead>
                <tr className="text-left text-xs uppercase text-white/60">
                  <th className="py-2"></th>
                  <th className="py-2"></th>
                  <th className="py-2"></th>
                  <th className="py-2"></th>
                </tr>
              </thead>
              <tbody>
                {data.systemTimeline.map((row) => {
                  const date = format(
                    new Date(`${row.date}T00:00:00`),
                    "d MMM",
                    { locale: th },
                  );

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

        <div className="border border-white/10 bg-white/4 rounded-lg">
          <div className="border-b border-white/10 px-6 py-4">
            <h2 className="text-lg font-semibold text-white"></h2>
          </div>
          <div className="space-y-3 px-6 py-5 text-sm text-white/80">
            {data.roleDistribution.map((role) => (
              <div
                key={role.role}
                className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-4 py-3"
              >
                <span>{role.role || ""}</span>
                <span className="font-semibold text-white">
                  {formatNumber(role.total)}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="border border-white/10 bg-white/4 rounded-lg">
          <div className="border-b border-white/10 px-6 py-4">
            <h2 className="text-lg font-semibold text-white"></h2>
          </div>
          <div className="space-y-3 px-6 py-5 text-sm text-white/80">
            {data.recentActivity.length === 0 ? (
              <p className="text-white/60"></p>
            ) : (
              data.recentActivity.map((activity) => {
                const badge = resolveActivityStatus(activity.status);

                return (
                  <div
                    key={activity.id}
                    className="flex flex-col gap-1 rounded-xl border border-white/10 bg-white/5 px-4 py-3"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-white">
                        {activity.title}
                      </span>
                      <span
                        className={`text-xs px-2 py-1 rounded-full uppercase tracking-wide ${badge.className}`}
                      >
                        {badge.label}
                      </span>
                    </div>
                    <span className="text-xs text-white/60">
                       {activity.actor} {" "}
                      {format(new Date(activity.timestamp), "d MMM HH:mm .", {
                        locale: th,
                      })}
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </div>

        <div className="border border-white/10 bg-white/4 rounded-lg">
          <div className="border-b border-white/10 px-6 py-4">
            <h2 className="text-lg font-semibold text-white">
              
            </h2>
          </div>
          <div className="space-y-3 px-6 py-5 text-sm text-white/80">
            {data.pendingBookings.length === 0 ? (
              <p className="text-white/60"></p>
            ) : (
              data.pendingBookings.map((booking) => (
                <div
                  key={booking.id}
                  className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-4 py-3"
                >
                  <img
                    alt={booking.display_name ?? "Guest"}
                    className="w-8 h-8 rounded-full bg-primary/20 text-primary-200"
                    src={booking.picture_url ?? undefined}
                  />
                  <div className="flex-1">
                    <p className="font-medium text-white">
                      {booking.display_name ?? ""}
                    </p>
                    <p className="text-xs text-white/60">
                       {booking.table_number} {" "}
                      {format(new Date(booking.booking_date), "d MMM yyyy", {
                        locale: th,
                      })}
                    </p>
                  </div>
                  <NextLink
                    className="px-3 py-1 text-sm rounded-md border border-primary-500 text-primary-500 hover:bg-primary-500/10"
                    href="/admin/management/bookings"
                  >
                    
                  </NextLink>
                </div>
              ))
            )}
          </div>
        </div>
      </section>

      <section>
        <div className="border border-white/10 bg-white/4 rounded-lg">
          <div className="border-b border-white/10 px-6 py-4">
            <h2 className="text-lg font-semibold text-white">
              
            </h2>
          </div>
          <div className="grid gap-4 px-6 py-5 md:grid-cols-2 lg:grid-cols-4">
            {managementLinks.map((link) => (
              <NextLink
                key={link.href}
                className={`rounded-xl px-5 py-4 text-sm transition backdrop-blur-xl ${link.accent}`}
                href={link.href}
              >
                <p className="font-semibold text-white">{link.label}</p>
                <p className="mt-1 text-xs text-white/60">
                  
                </p>
              </NextLink>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
};

export const Dashboard = DashboardComponent;

