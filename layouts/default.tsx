// fixcy/layouts/default.tsx
import { useRouter } from "next/router";

import { Head } from "./head";

import { Navbar } from "@/components/shared/Navbar";
import { Footer } from "@/components/shared/Footer";
import { CookieConsentBanner } from "@/components/shared/CookieConsentBanner"; // <-- 1. Import Component
import { fontSans } from "@/config/fonts";
import { NavigationHeader } from "@/components/navigation/NavigationHeader";
import { resolveNavigationHeader } from "@/lib/navigation";

export default function DefaultLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const navigation = resolveNavigationHeader({
    pathname: router.pathname,
    asPath: router.asPath,
    query: router.query,
  });

  return (
    <div
      className={`${fontSans.className} relative flex min-h-screen flex-col bg-background transition-colors duration-500 ease-out`}
    >
      <Head />
      <Navbar />
      <NavigationHeader {...navigation} />
      <main className="container mx-auto mt-10 grow max-w-7xl px-6 py-12 transition-all duration-500 ease-out">
        {children}
      </main>
      <Footer />
      <CookieConsentBanner /> {/* <-- 2. Add Component here */}
    </div>
  );
}
