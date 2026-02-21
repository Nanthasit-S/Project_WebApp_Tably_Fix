import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

type NotificationType = "success" | "error" | "info";

interface NotificationState {
  isOpen: boolean;
  title: string;
  message: string;
  type: NotificationType;
}

interface NotificationContextValue extends NotificationState {
  showNotification: (
    title: string,
    message: string,
    type?: NotificationType,
  ) => void;
  hideNotification: () => void;
}

const defaultState: NotificationState = {
  isOpen: false,
  title: "",
  message: "",
  type: "info",
};

const NotificationContext = createContext<NotificationContextValue | undefined>(
  undefined,
);

export const NotificationProvider = ({ children }: { children: ReactNode }) => {
  const [state, setState] = useState<NotificationState>(defaultState);

  const showNotification = useCallback(
    (title: string, message: string, type: NotificationType = "info") => {
      setState({
        isOpen: true,
        title,
        message,
        type,
      });
    },
    [],
  );

  const hideNotification = useCallback(() => {
    setState((prev) => ({
      ...prev,
      isOpen: false,
    }));
  }, []);

  const value = useMemo<NotificationContextValue>(
    () => ({
      ...state,
      showNotification,
      hideNotification,
    }),
    [state, showNotification, hideNotification],
  );

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotification = () => {
  const context = useContext(NotificationContext);

  if (!context) {
    throw new Error(
      "useNotification must be used within a NotificationProvider",
    );
  }

  return context;
};
