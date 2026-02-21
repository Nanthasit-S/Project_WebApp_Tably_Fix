import { memo } from "react";
import { Switch } from "@heroui/switch";

import {
  COOKIE_PREFERENCE_METADATA,
  COOKIE_PREFERENCE_ORDER,
  CookieConsentPreferences,
  CookiePreferenceKey,
} from "@/lib/cookies/consent";

interface CookiePreferencesFormProps {
  preferences: CookieConsentPreferences;
  onChange: (key: CookiePreferenceKey, value: boolean) => void;
  dense?: boolean;
}

const statusLabel = (isEnabled: boolean, optional: boolean) => {
  if (!optional) {
    return "บังคับใช้";
  }

  return isEnabled ? "ใช้งานอยู่" : "ปิดอยู่";
};

export const CookiePreferencesForm = memo(
  ({ preferences, onChange, dense = false }: CookiePreferencesFormProps) => (
    <div className={dense ? "space-y-3" : "space-y-4"}>
      {COOKIE_PREFERENCE_ORDER.map((key) => {
        const meta = COOKIE_PREFERENCE_METADATA[key];
        const isEnabled = preferences[key];

        return (
          <div
            key={key}
            className="rounded-xl border border-white/10 bg-zinc-900/70 p-4 shadow-lg shadow-black/10"
          >
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold text-foreground">
                    {meta.label}
                  </p>
                  <span className="rounded-full border border-white/10 bg-black/40 px-2 py-0.5 text-[11px] uppercase text-zinc-300">
                    {statusLabel(isEnabled, meta.optional)}
                  </span>
                </div>
                <p className="text-xs leading-relaxed text-zinc-400">
                  {meta.description}
                </p>
              </div>
              <Switch
                aria-label={meta.label}
                className="sm:mt-1"
                color="success"
                isDisabled={!meta.optional}
                isSelected={isEnabled}
                onValueChange={(value) => onChange(key, value)}
                size={dense ? "sm" : "md"}
              />
            </div>
          </div>
        );
      })}
    </div>
  ),
);

CookiePreferencesForm.displayName = "CookiePreferencesForm";
