// fixcy/components/CookieConsentBanner.tsx
import { useCallback, useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Button } from "@heroui/button";
import { Link } from "@heroui/link";
import {
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
} from "@heroui/modal";

import { CookiePreferencesForm } from "@/components/shared/CookiePreferencesForm";
import {
  DEFAULT_COOKIE_CONSENT,
  CookieConsentPreferences,
  CookiePreferenceKey,
  mergePreferences,
  readConsentFromDocument,
  shouldDisplayConsentBanner,
  writeConsentCookie,
} from "@/lib/cookies/consent";

export const CookieConsentBanner: React.FC = () => {
  const [showBanner, setShowBanner] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [preferences, setPreferences] = useState(DEFAULT_COOKIE_CONSENT);
  const [draftPreferences, setDraftPreferences] =
    useState(DEFAULT_COOKIE_CONSENT);

  useEffect(() => {
    const payload = readConsentFromDocument();

    if (payload) {
      setPreferences(payload.preferences);
    }

    setShowBanner(shouldDisplayConsentBanner(payload));
  }, []);

  const persistAndClose = useCallback(
    (updated: CookieConsentPreferences) => {
      writeConsentCookie(updated);
      setPreferences(updated);
      setDraftPreferences(updated);
      setShowBanner(false);
      setIsSettingsOpen(false);
    },
    [],
  );

  const handleAcceptAll = useCallback(() => {
    persistAndClose(
      mergePreferences(preferences, { analytics: true, marketing: true }),
    );
  }, [persistAndClose, preferences]);

  const handleRejectNonEssential = useCallback(() => {
    persistAndClose(
      mergePreferences(preferences, { analytics: false, marketing: false }),
    );
  }, [persistAndClose, preferences]);

  const handleOpenSettings = useCallback(() => {
    setDraftPreferences(preferences);
    setIsSettingsOpen(true);
  }, [preferences]);

  const handleCloseSettings = useCallback(() => {
    setIsSettingsOpen(false);
    setDraftPreferences(preferences);
  }, [preferences]);

  const handlePreferenceChange = useCallback(
    (key: CookiePreferenceKey, value: boolean) => {
      setDraftPreferences((prev) =>
        mergePreferences(prev, { [key]: value } as Partial<
          CookieConsentPreferences
        >),
      );
    },
    [],
  );

  const handleSaveSettings = useCallback(() => {
    persistAndClose(draftPreferences);
  }, [draftPreferences, persistAndClose]);

  return (
    <>
      <AnimatePresence>
        {showBanner && (
          <motion.div
            animate={{ y: 0, opacity: 1 }}
            className="fixed bottom-4 left-4 right-4 z-50 max-w-md sm:left-auto sm:right-4"
            exit={{ y: "110%", opacity: 0 }}
            initial={{ y: "110%", opacity: 0 }}
            transition={{ type: "spring", stiffness: 260, damping: 26 }}
          >
            <div className="space-y-4 rounded-2xl border border-white/10 bg-zinc-950/90 p-6 shadow-2xl backdrop-blur-xl">
              <div className="space-y-3">
                <p className="text-sm font-semibold text-foreground">
                  เราใช้คุกกี้เพื่อมอบประสบการณ์ที่ดีที่สุดให้กับคุณ
                </p>
                <p className="text-xs leading-relaxed text-zinc-400">
                  คุกกี้ช่วยให้เว็บไซต์จดจำการตั้งค่าของคุณ วิเคราะห์การใช้งาน
                  และนำเสนอเนื้อหาที่ตรงกับความสนใจมากขึ้น คุณสามารถจัดการหรือ
                  ปรับเปลี่ยนความยินยอมของคุณได้ตลอดเวลาใน{" "}
                  <Link
                    className="font-medium text-emerald-400 underline decoration-emerald-500/60 underline-offset-4 hover:text-emerald-300"
                    href="/cookie-policy"
                  >
                    ศูนย์การตั้งค่าคุกกี้
                  </Link>
                </p>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
                <Button
                  className="w-full sm:w-auto"
                  color="danger"
                  variant="flat"
                  onPress={handleRejectNonEssential}
                >
                  ปฏิเสธคุกกี้เสริม
                </Button>
                <Button
                  className="w-full sm:w-auto"
                  color="default"
                  variant="bordered"
                  onPress={handleOpenSettings}
                >
                  ตั้งค่าคุกกี้
                </Button>
                <Button
                  className="w-full sm:w-auto shadow-lg shadow-emerald-500/20"
                  color="success"
                  onPress={handleAcceptAll}
                >
                  ยอมรับทั้งหมด
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <Modal
        isOpen={isSettingsOpen}
        motionProps={{
          variants: {
            enter: {
              opacity: 1,
              y: 0,
              transition: { duration: 0.3, ease: "easeOut" },
            },
            exit: {
              opacity: 0,
              y: 12,
              transition: { duration: 0.2, ease: "easeIn" },
            },
          },
        }}
        placement="center"
        size="lg"
        onClose={handleCloseSettings}
      >
        <ModalContent className="bg-zinc-950/95 backdrop-blur-xl">
          <ModalHeader className="flex flex-col gap-2">
            <span className="text-lg font-semibold text-foreground">
              การตั้งค่าคุกกี้
            </span>
            <span className="text-xs text-zinc-400">
              ปรับเปลี่ยนความยินยอมของคุณสำหรับประเภทคุกกี้เสริมได้ตลอดเวลา
            </span>
          </ModalHeader>
          <ModalBody className="space-y-4">
            <CookiePreferencesForm
              dense
              preferences={draftPreferences}
              onChange={handlePreferenceChange}
            />
            <p className="text-[11px] leading-relaxed text-zinc-500">
              หมายเหตุ: คุกกี้ที่จำเป็นไม่สามารถปิดได้
              เพราะมีผลต่อการทำงานและความปลอดภัยพื้นฐานของเว็บไซต์
            </p>
          </ModalBody>
          <ModalFooter className="flex flex-col gap-2 sm:flex-row sm:justify-between">
            <Button
              className="w-full sm:w-auto"
              color="danger"
              variant="light"
              onPress={handleRejectNonEssential}
            >
              ปฏิเสธคุกกี้เสริม
            </Button>
            <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
              <Button
                className="w-full sm:w-auto"
                color="default"
                variant="bordered"
                onPress={handleCloseSettings}
              >
                ยกเลิก
              </Button>
              <Button
                className="w-full sm:w-auto"
                color="success"
                onPress={handleSaveSettings}
              >
                บันทึกการตั้งค่า
              </Button>
            </div>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </>
  );
};
