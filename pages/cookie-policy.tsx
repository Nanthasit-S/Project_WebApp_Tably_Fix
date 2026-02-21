import type { GetServerSideProps } from "next";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@heroui/button";
import { Card, CardBody } from "@heroui/card";

import DefaultLayout from "@/layouts/default";
import { CookiePreferencesForm } from "@/components/shared/CookiePreferencesForm";
import {
  COOKIE_PREFERENCE_METADATA,
  COOKIE_PREFERENCE_ORDER,
  CookieConsentPreferences,
  CookiePreferenceKey,
  DEFAULT_COOKIE_CONSENT,
  readConsentFromHeader,
  mergePreferences,
  writeConsentCookie,
} from "@/lib/cookies/consent";

const FAQ_ITEMS: Array<{ question: string; answer: string }> = [
  {
    question: "ฉันสามารถเปลี่ยนแปลงความยินยอมของคุกกี้ได้เมื่อไร?",
    answer:
      "คุณสามารถกลับมาปรับตั้งค่าหรือถอนความยินยอมได้ทุกเมื่อผ่านหน้าเพจนี้ หรือจากแบนเนอร์แจ้งเตือนคุกกี้ที่ปรากฏเมื่อสถานะความยินยอมหมดอายุ",
  },
  {
    question: "คุกกี้จำเป็นมีประโยชน์อะไร?",
    answer:
      "คุกกี้จำเป็นช่วยให้เว็บไซต์ทำงานได้ตามปกติ เช่น การเข้าสู่ระบบ การรักษาความปลอดภัย และการบันทึกการตั้งค่าพื้นฐานที่จำเป็นต่อการใช้งาน",
  },
  {
    question: "ถ้าปฏิเสธคุกกี้เสริมจะเกิดอะไรขึ้น?",
    answer:
      "คุณยังสามารถใช้งานเว็บไซต์และบริการหลักได้ตามปกติ แต่เราจะไม่สามารถเก็บข้อมูลเชิงสถิติหรือปรับประสบการณ์ให้ตรงกับความสนใจของคุณได้",
  },
];

interface CookiePolicyPageProps {
  initialPreferences: CookieConsentPreferences;
  hasExistingConsent: boolean;
  lastUpdated: number | null;
}

const formatTimestamp = (value: number | null) => {
  if (!value) {
    return null;
  }

  try {
    return new Date(value).toLocaleString("th-TH", {
      day: "numeric",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return null;
  }
};

type FeedbackState = "saved" | "error" | null;

export default function CookiePolicyPage({
  initialPreferences,
  hasExistingConsent,
  lastUpdated,
}: CookiePolicyPageProps) {
  const [preferences, setPreferences] = useState(initialPreferences);
  const [baselinePreferences, setBaselinePreferences] =
    useState(initialPreferences);
  const [consentTimestamp, setConsentTimestamp] = useState<number | null>(
    lastUpdated,
  );
  const [hasConsent, setHasConsent] = useState(hasExistingConsent);
  const [hasChanges, setHasChanges] = useState(false);
  const [feedback, setFeedback] = useState<FeedbackState>(null);

  useEffect(() => {
    setPreferences(initialPreferences);
    setBaselinePreferences(initialPreferences);
    setConsentTimestamp(lastUpdated);
    setHasConsent(hasExistingConsent);
    setHasChanges(false);
  }, [initialPreferences, hasExistingConsent, lastUpdated]);

  useEffect(() => {
    if (!feedback) {
      return;
    }

    const timer = window.setTimeout(() => setFeedback(null), 3200);

    return () => {
      window.clearTimeout(timer);
    };
  }, [feedback]);

  const humanReadableTimestamp = useMemo(
    () => formatTimestamp(consentTimestamp),
    [consentTimestamp],
  );

  const persistPreferences = useCallback(
    (next: CookieConsentPreferences) => {
      try {
        writeConsentCookie(next);
        setPreferences(next);
        setBaselinePreferences(next);
        setConsentTimestamp(Date.now());
        setHasConsent(true);
        setHasChanges(false);
        setFeedback("saved");
      } catch (error) {
        console.error("Failed to persist cookie consent:", error);
        setFeedback("error");
      }
    },
    [],
  );

  const handlePreferenceChange = useCallback(
    (key: CookiePreferenceKey, value: boolean) => {
      setPreferences((prev) => {
        const updated = mergePreferences(prev, { [key]: value } as Partial<
          CookieConsentPreferences
        >);
        setHasChanges(true);
        return updated;
      });
    },
    [],
  );

  const handleSavePreferences = useCallback(() => {
    persistPreferences(preferences);
  }, [persistPreferences, preferences]);

  const handleAcceptAll = useCallback(() => {
    persistPreferences(
      mergePreferences(DEFAULT_COOKIE_CONSENT, {
        analytics: true,
        marketing: true,
      }),
    );
  }, [persistPreferences]);

  const handleRejectNonEssential = useCallback(() => {
    persistPreferences(
      mergePreferences(DEFAULT_COOKIE_CONSENT, {
        analytics: false,
        marketing: false,
      }),
    );
  }, [persistPreferences]);

  const feedbackMessage =
    feedback === "saved"
      ? "บันทึกการตั้งค่าคุกกี้เรียบร้อยแล้ว"
      : feedback === "error"
        ? "เกิดข้อผิดพลาดในการบันทึก กรุณาลองใหม่อีกครั้ง"
        : null;

  return (
    <DefaultLayout>
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-12">
        <section className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-emerald-500/10 via-zinc-900/40 to-zinc-950/90 p-10 shadow-lg shadow-emerald-500/10">
          <div className="space-y-5">
            <span className="inline-flex items-center gap-2 rounded-full border border-emerald-400/40 bg-emerald-400/10 px-3 py-1 text-xs font-semibold uppercase text-emerald-200">
              ศูนย์การตั้งค่าคุกกี้
            </span>
            <h1 className="text-3xl font-bold text-foreground sm:text-4xl">
              จัดการความยินยอมคุกกี้ของคุณได้ทุกเมื่อ
            </h1>
            <p className="max-w-3xl text-sm leading-relaxed text-zinc-300">
              เราเคารพในการคุ้มครองข้อมูลส่วนบุคคลของคุณ
              หน้านี้ช่วยให้คุณเห็นภาพรวมของคุกกี้ทุกประเภท
              พร้อมปรับการยินยอมได้อย่างโปร่งใสและง่ายดาย
              การเลือกของคุณจะถูกจดจำเป็นเวลา 12 เดือน
              หรือจนกว่าคุณจะเปลี่ยนแปลงใหม่
            </p>
            <div className="flex flex-wrap items-center gap-3 text-xs text-zinc-400">
              <span className="rounded-full border border-white/5 bg-black/30 px-3 py-1">
                สถานะความยินยอม:{" "}
                {hasConsent ? "ตั้งค่าไว้แล้ว" : "ยังไม่ได้ตั้งค่า"}
              </span>
              {humanReadableTimestamp ? (
                <span className="rounded-full border border-white/5 bg-black/20 px-3 py-1">
                  อัปเดตล่าสุด: {humanReadableTimestamp}
                </span>
              ) : null}
            </div>
            <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:items-center">
              <Button
                className="w-full sm:w-auto"
                color="success"
                size="lg"
                onPress={handleAcceptAll}
              >
                ยอมรับคุกกี้ทั้งหมด
              </Button>
              <Button
                className="w-full sm:w-auto"
                color="danger"
                size="lg"
                variant="flat"
                onPress={handleRejectNonEssential}
              >
                ปฏิเสธคุกกี้เสริม
              </Button>
            </div>
          </div>
        </section>

        <section className="space-y-6">
          <div className="space-y-2">
            <h2 className="text-2xl font-semibold text-foreground">
              ปรับแต่งการใช้งานคุกกี้
            </h2>
            <p className="max-w-2xl text-sm text-zinc-400">
              เปิดหรือปิดคุกกี้แต่ละประเภทตามความสะดวกของคุณ
              การเปลี่ยนแปลงจะมีผลทันทีเมื่อกดบันทึก
              และคุณสามารถกลับมาแก้ไขได้ตลอดเวลา
            </p>
          </div>
          <Card className="border border-white/10 bg-zinc-950/80 shadow-2xl shadow-black/20">
            <CardBody className="space-y-6 p-6">
              <CookiePreferencesForm
                preferences={preferences}
                onChange={handlePreferenceChange}
              />
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="text-xs text-zinc-500">
                  {feedbackMessage ?? "เลือกตัวเลือกเพื่อบันทึกความเปลี่ยนแปลง"}
                </div>
                <div className="flex gap-3">
                  <Button
                    color="default"
                    variant="bordered"
                    onPress={() => {
                      setPreferences(baselinePreferences);
                      setHasChanges(false);
                    }}
                  >
                    คืนค่าก่อนหน้า
                  </Button>
                  <Button
                    color="success"
                    isDisabled={!hasChanges}
                    onPress={handleSavePreferences}
                  >
                    บันทึกการตั้งค่า
                  </Button>
                </div>
              </div>
            </CardBody>
          </Card>
        </section>

        <section className="space-y-5">
          <div className="space-y-2">
            <h2 className="text-xl font-semibold text-foreground">
              รายละเอียดคุกกี้แต่ละประเภท
            </h2>
            <p className="text-sm text-zinc-400">
              เราจัดกลุ่มคุกกี้ตามวัตถุประสงค์
              เพื่อให้คุณเข้าใจผลของการเปิดใช้งานได้ง่ายขึ้น
            </p>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {COOKIE_PREFERENCE_ORDER.map((key) => {
              const meta = COOKIE_PREFERENCE_METADATA[key];

              return (
                <div
                  key={key}
                  className="flex h-full flex-col rounded-2xl border border-white/10 bg-zinc-950/80 p-5 shadow-lg shadow-black/20"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <p className="text-sm font-semibold text-foreground">
                        {meta.label}
                      </p>
                      <p className="text-[11px] uppercase text-zinc-400">
                        {meta.optional ? "เลือกเปิด/ปิดได้" : "จำเป็นต้องเปิด"}
                      </p>
                    </div>
                    <span className="rounded-full border border-white/10 bg-black/30 px-2 py-0.5 text-[11px] text-zinc-300">
                      {meta.optional ? "ทางเลือก" : "จำเป็น"}
                    </span>
                  </div>
                  <p className="mt-3 text-xs leading-relaxed text-zinc-400">
                    {meta.description}
                  </p>
                </div>
              );
            })}
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold text-foreground">คำถามพบบ่อย</h2>
          <div className="space-y-3 rounded-2xl border border-white/10 bg-zinc-950/70 p-6">
            {FAQ_ITEMS.map((item) => (
              <details
                key={item.question}
                className="group rounded-xl border border-transparent px-4 py-3 transition hover:border-white/10 hover:bg-white/5"
              >
                <summary className="cursor-pointer text-sm font-semibold text-foreground outline-none marker:text-emerald-400">
                  {item.question}
                </summary>
                <p className="mt-2 text-xs leading-relaxed text-zinc-400">
                  {item.answer}
                </p>
              </details>
            ))}
          </div>
        </section>
      </div>
    </DefaultLayout>
  );
}

export const getServerSideProps: GetServerSideProps<
  CookiePolicyPageProps
> = async (context) => {
  const payload = readConsentFromHeader(context.req.headers.cookie ?? "");

  return {
    props: {
      initialPreferences: payload?.preferences ?? DEFAULT_COOKIE_CONSENT,
      hasExistingConsent: Boolean(payload),
      lastUpdated: payload?.timestamp ?? null,
    },
  };
};
