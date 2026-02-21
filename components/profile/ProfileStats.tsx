import React from "react";

type Accent = "primary" | "success" | "warning";

export interface ProfileStat {
  label: string;
  value: number | string;
  helper?: string;
  icon?: React.ReactNode;
  accent?: Accent;
}

interface ProfileStatsProps {
  items: ProfileStat[];
}

const accentBackground: Record<Accent, string> = {
  primary:
    "bg-linear-to-br from-indigo-500/25 via-indigo-500/10 to-sky-400/15 text-indigo-200",
  success:
    "bg-linear-to-br from-emerald-500/20 via-emerald-500/10 to-teal-400/15 text-emerald-200",
  warning:
    "bg-linear-to-br from-amber-500/25 via-orange-500/15 to-yellow-400/15 text-amber-100",
};

const accentRing: Record<Accent, string> = {
  primary: "ring-1 ring-violet-400/40",
  success: "ring-1 ring-emerald-400/40",
  warning: "ring-1 ring-amber-400/40",
};

export const ProfileStats: React.FC<ProfileStatsProps> = ({ items }) => (
  <div className="grid gap-4 sm:grid-cols-3">
    {items.map(({ label, value, helper, icon, accent = "primary" }) => {
      const indicator = accentBackground[accent] ?? accentBackground.primary;
      const ring = accentRing[accent] ?? accentRing.primary;

      return (
        <article
          key={label}
          className="glass-card flex flex-col gap-3 rounded-2xl p-4 text-primary"
        >
          <div className="flex items-start gap-3" />
          <div className="text-3xl font-semibold leading-tight">{value}</div>
          {helper ? (
            <p className="text-[0.75rem] leading-relaxed text-muted">
              {helper}
            </p>
          ) : null}
        </article>
      );
    })}
  </div>
);
