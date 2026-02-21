// fixcy/components/auth/LoginRequiredModal.tsx
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
} from "@heroui/react";

interface LoginRequiredModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLogin: () => void;
}

export function LoginRequiredModal({
  isOpen,
  onClose,
  onLogin,
}: LoginRequiredModalProps) {
  return (
    <Modal
      isDismissable
      backdrop="blur"
      classNames={{
        wrapper: "fixed inset-0 flex items-center justify-center !m-0", // ✅ ทำให้ modal อยู่กลางจอ
        base: "max-h-[85vh] w-[92vw] max-w-sm overflow-hidden rounded-xl border border-white/10 bg-black/70 text-white/90 shadow-2xl backdrop-blur-md md:max-w-md",
        header: "px-6 pt-6 pb-2 text-center", // ✅ จัดหัวข้อให้อยู่กลาง
        body: "px-6 py-2 text-sm leading-6 text-white/70 text-center", // ✅ ข้อความอยู่กลาง
        footer: "px-6 pb-6 pt-2 flex justify-center", // ✅ ปุ่มอยู่กลาง
        closeButton:
          "right-4 top-4 text-white/60 hover:text-white/80 hover:bg-transparent",
      }}
      isOpen={isOpen}
      placement="center"
      scrollBehavior="outside"
      size="md"
      onClose={onClose}
    >
      <ModalContent>
        <ModalHeader>
          <h3 className="text-base font-semibold leading-none text-white/95 md:text-lg">
            เข้าสู่ระบบก่อนจองโต๊ะ
          </h3>
        </ModalHeader>

        <ModalBody>
          <p>
            เพื่อจองโต๊ะและจัดการการจองของคุณ โปรดเข้าสู่ระบบด้วย LINE
            แล้วกลับมาทำรายการต่อได้ทันที
          </p>
        </ModalBody>

        <ModalFooter>
          <Button
            className={[
              "h-10 px-6 text-sm font-semibold",
              "border border-emerald-400/40 bg-emerald-500/20 text-emerald-100",
              "backdrop-blur-sm shadow-[0_8px_30px_-10px_rgba(16,185,129,0.35)]",
              "transition-all duration-300 hover:bg-emerald-500/30 hover:shadow-[0_14px_40px_-10px_rgba(16,185,129,0.45)]",
              "active:scale-[0.98]",
            ].join(" ")}
            radius="md"
            onPress={onLogin}
          >
            เข้าสู่ระบบด้วย LINE
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
