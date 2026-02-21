import type { Session } from "next-auth";

import React from "react";

interface ProfileHeaderProps {
  user: Session["user"];
}

const roleLabelMap: Record<string, string> = {
  admin: "ผู้ดูแลระบบ",
  staff: "พนักงาน",
  user: "ผู้ใช้งาน",
};

const roleStyleMap: Record<string, string> = {
  admin: "bg-rose-500/15 text-rose-200 ring-1 ring-rose-400/40",
  staff: "bg-cyan-500/15 text-cyan-100 ring-1 ring-cyan-300/40",
  user: "bg-white/10 text-muted ring-1 ring-[rgba(148,163,184,0.25)]",
};

const getInitials = (name?: string | null) =>
  (name ?? "")
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("")
    .slice(0, 2) || "CY";

export const ProfileHeader: React.FC<ProfileHeaderProps> = ({ user }) => {
  const role = user?.role ?? "user";
  const roleLabel = roleLabelMap[role] ?? roleLabelMap.user;
  const roleStyles = roleStyleMap[role] ?? roleStyleMap.user;
  const fallbackInitials = getInitials(user?.name);

  return (
    <div className="border border-white/10 bg-zinc-950/80 rounded-3xl p-6 text-center text-white">
      <div className="mx-auto flex h-24 w-24 items-center justify-center overflow-hidden rounded-full border border-soft bg-white/5 shadow-lg">
        {user?.image ? (
          <img
            alt={user.name ?? "CY Guest"}
            className="h-full w-full object-cover"
            src={`/api/image-proxy?url=${encodeURIComponent(user.image)}`}
          />
        ) : (
          <span className="text-2xl font-semibold uppercase text-white">
            {fallbackInitials}
          </span>
        )}
      </div>
      <h1 className="mt-4 text-xl font-semibold">{user?.name ?? "แขก"}</h1>
      <div className="mt-5 flex justify-center">
        <span
          className={`inline-flex items-center rounded-full px-4 py-1 text-xs font-medium uppercase ${roleStyles}`}
        >
          {roleLabel}
        </span>
      </div>
    </div>
  );
};
