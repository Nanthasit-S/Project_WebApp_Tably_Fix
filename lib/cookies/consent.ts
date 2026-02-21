import { SerializeOptions } from "cookie";

import { parse as parseCookie } from "cookie";

export const COOKIE_CONSENT_COOKIE_NAME = "cookie_consent";
export const CONSENT_COOKIE_MAX_AGE_DAYS = 365;
export const CONSENT_COOKIE_VERSION = 1;

export type CookiePreferenceKey = "necessary" | "analytics" | "marketing";

export type CookieConsentPreferences = Record<CookiePreferenceKey, boolean>;

export interface CookieConsentPayload {
  version: number;
  preferences: CookieConsentPreferences;
  timestamp: number;
}

export const DEFAULT_COOKIE_CONSENT: CookieConsentPreferences = {
  necessary: true,
  analytics: false,
  marketing: false,
};

export const COOKIE_PREFERENCE_METADATA: Record<
  CookiePreferenceKey,
  {
    label: string;
    description: string;
    optional: boolean;
  }
> = {
  necessary: {
    label: "จำเป็นต่อการทำงานของระบบ",
    description:
      "คุกกี้ที่จำเป็นเพื่อให้เว็บไซต์ทำงานอย่างถูกต้อง เช่น การรักษาการเข้าสู่ระบบและการตั้งค่าความปลอดภัย",
    optional: false,
  },
  analytics: {
    label: "วิเคราะห์การใช้งาน",
    description:
      "ช่วยให้เราทราบรูปแบบการใช้งานของผู้ใช้ เพื่อปรับปรุงประสบการณ์และประสิทธิภาพของเว็บไซต์",
    optional: true,
  },
  marketing: {
    label: "การตลาดและการสื่อสาร",
    description:
      "ใช้เพื่อนำเสนอเนื้อหาและข้อเสนอที่ตรงกับความสนใจของคุณ รวมถึงการสื่อสารผ่านช่องทางต่าง ๆ",
    optional: true,
  },
};

export const COOKIE_PREFERENCE_ORDER: CookiePreferenceKey[] = [
  "necessary",
  "analytics",
  "marketing",
];

export const ensurePreferences = (
  preferences?: Partial<CookieConsentPreferences>,
): CookieConsentPreferences => ({
  necessary: true,
  analytics: Boolean(preferences?.analytics),
  marketing: Boolean(preferences?.marketing),
});

export const decodeConsentValue = (
  value: string | null | undefined,
): CookieConsentPayload | null => {
  if (!value) {
    return null;
  }

  try {
    const raw = JSON.parse(decodeURIComponent(value)) as Partial<
      CookieConsentPayload & {
        preferences?: Partial<CookieConsentPreferences>;
      }
    >;

    if (!raw || typeof raw !== "object") {
      return null;
    }

    return {
      version:
        typeof raw.version === "number" && Number.isFinite(raw.version)
          ? raw.version
          : 0,
      timestamp:
        typeof raw.timestamp === "number" && Number.isFinite(raw.timestamp)
          ? raw.timestamp
          : Date.now(),
      preferences: ensurePreferences(raw.preferences),
    };
  } catch {
    return null;
  }
};

export const encodeConsentValue = (
  preferences: CookieConsentPreferences,
): string =>
  encodeURIComponent(
    JSON.stringify({
      version: CONSENT_COOKIE_VERSION,
      timestamp: Date.now(),
      preferences: ensurePreferences(preferences),
    }),
  );

const buildCookieAttributes = (days: number): string => {
  const expiresAt = new Date(
    Date.now() + days * 24 * 60 * 60 * 1000,
  ).toUTCString();

  let attributes = `; Expires=${expiresAt}; Path=/; SameSite=Lax`;

  if (
    typeof window !== "undefined" &&
    typeof window.location !== "undefined" &&
    window.location.protocol === "https:"
  ) {
    attributes += "; Secure";
  }

  return attributes;
};

export const writeConsentCookie = (
  preferences: CookieConsentPreferences,
  days = CONSENT_COOKIE_MAX_AGE_DAYS,
) => {
  if (typeof document === "undefined") {
    return;
  }

  const value = encodeConsentValue(preferences);
  document.cookie =
    `${COOKIE_CONSENT_COOKIE_NAME}=${value}` + buildCookieAttributes(days);
};

export const clearConsentCookie = () => {
  if (typeof document === "undefined") {
    return;
  }

  document.cookie =
    `${COOKIE_CONSENT_COOKIE_NAME}=; Expires=Thu, 01 Jan 1970 00:00:00 GMT; Path=/; SameSite=Lax`;
};

export const readConsentFromDocument = (): CookieConsentPayload | null => {
  if (typeof document === "undefined") {
    return null;
  }

  const cookies = document.cookie.split(";");

  for (let i = 0; i < cookies.length; i++) {
    const cookie = cookies[i]?.trim();

    if (!cookie) continue;
    if (cookie.startsWith(`${COOKIE_CONSENT_COOKIE_NAME}=`)) {
      const value = cookie.substring(COOKIE_CONSENT_COOKIE_NAME.length + 1);
      return decodeConsentValue(value);
    }
  }

  return null;
};

export const readConsentFromHeader = (
  cookieHeader: string | undefined | null,
): CookieConsentPayload | null => {
  if (!cookieHeader) {
    return null;
  }

  try {
    const parsed = parseCookie(cookieHeader);
    return decodeConsentValue(parsed[COOKIE_CONSENT_COOKIE_NAME]);
  } catch {
    return null;
  }
};

export const shouldDisplayConsentBanner = (
  payload: CookieConsentPayload | null,
): boolean => {
  if (!payload) {
    return true;
  }

  if (payload.version !== CONSENT_COOKIE_VERSION) {
    return true;
  }

  return false;
};

export const mergePreferences = (
  base: CookieConsentPreferences,
  overrides: Partial<CookieConsentPreferences>,
): CookieConsentPreferences => ensurePreferences({ ...base, ...overrides });


export const createCookieOptions = (
  overrides?: SerializeOptions, // เปลี่ยนจาก CookieSerializeOptions เป็น SerializeOptions
): SerializeOptions => ({
  httpOnly: false,
  sameSite: "lax",
  path: "/",
  maxAge: CONSENT_COOKIE_MAX_AGE_DAYS * 24 * 60 * 60,
  ...overrides,
});
