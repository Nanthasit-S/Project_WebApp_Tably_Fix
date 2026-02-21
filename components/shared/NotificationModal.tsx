// fixcy/components/NotificationModal.tsx
import React from "react";
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
} from "@heroui/modal";
import { Button } from "@heroui/button";

import { useNotification } from "@/lib/NotificationContext";

const SuccessIcon = () => (
  <svg height="24" viewBox="0 0 24 24" width="24">
    <path
      d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10s10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5l1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"
      fill="currentColor"
    />
  </svg>
);
const ErrorIcon = () => (
  <svg height="24" viewBox="0 0 24 24" width="24">
    <path
      d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10s10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"
      fill="currentColor"
    />
  </svg>
);
const InfoIcon = () => (
  <svg height="24" viewBox="0 0 24 24" width="24">
    <path
      d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10s10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"
      fill="currentColor"
    />
  </svg>
);

const icons = {
  success: <SuccessIcon />,
  error: <ErrorIcon />,
  info: <InfoIcon />,
};

const colors = {
  success: "text-success",
  error: "text-danger",
  info: "text-primary",
};

export const NotificationModal = () => {
  const { isOpen, hideNotification, title, message, type } = useNotification();

  return (
    <Modal backdrop="blur" isOpen={isOpen} onClose={hideNotification}>
      <ModalContent>
        <ModalHeader className="flex items-center gap-2">
          <span className={colors[type]}>{icons[type]}</span>
          {title}
        </ModalHeader>
        <ModalBody>
          <p>{message}</p>
        </ModalBody>
        <ModalFooter>
          <Button color="primary" onPress={hideNotification}>
            Close
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};
