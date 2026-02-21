import type { AppProps } from "next/app";
import { SessionProvider } from "@/lib/next-auth-react";
import "@/styles/globals.css";
import { AnimatePresence, motion } from "framer-motion";
import { useRouter } from "next/router";
import { HeroUIProvider } from "@heroui/react";
import { ThemeProvider as NextThemesProvider } from "next-themes";
import { NotificationProvider } from "@/lib/NotificationContext";
import { NotificationModal } from "@/components/shared/NotificationModal";

type ExtendedPageProps = Record<string, unknown> & {
  session?: AppProps["pageProps"]["session"];
};

type ExtendedAppProps = AppProps<ExtendedPageProps>;

function App({ Component, pageProps }: ExtendedAppProps) {
  const router = useRouter();
  const { session, ...restPageProps } = pageProps;

  return (
    <SessionProvider session={session}>
      <NotificationProvider>
        <HeroUIProvider navigate={router.push}>
          <NextThemesProvider
            attribute="class"
            defaultTheme="dark"
            enableSystem={false}
          >
            <AnimatePresence mode="wait">
              <motion.div
                key={router.route}
                animate={{ opacity: 1, y: 0 }}
                className="page-fade"
                exit={{ opacity: 0, y: -15 }}
                initial={{ opacity: 0, y: 15 }}
                transition={{ duration: 0.35, ease: "easeOut" }}
              >
                <Component {...(restPageProps as Record<string, unknown>)} />
              </motion.div>
            </AnimatePresence>
            <NotificationModal />
          </NextThemesProvider>
        </HeroUIProvider>
      </NotificationProvider>
    </SessionProvider>
  );
}

export default App;
