// web-app-none-node/components/shared/Navbar.tsx
import { useSession, signIn, signOut } from "@/lib/next-auth-react";
import NextLink from "next/link";
import { useRouter } from "next/router";
import { useMemo, useState, useCallback, Key } from "react";
import {
  Navbar,
  NavbarBrand,
  NavbarContent,
  NavbarItem,
  NavbarMenuToggle,
  NavbarMenu,
  NavbarMenuItem,
  Link,
  Button,
  Dropdown,
  DropdownTrigger,
  DropdownMenu,
  DropdownSection,
  DropdownItem,
  Avatar,
  Skeleton,
} from "@heroui/react";

import { LoginRequiredModal } from "@/components/auth/LoginRequiredModal";

const iconSize = 20;

const SettingsIcon = ({ size = iconSize }: { size?: number }) => (
  <svg
    height={size}
    viewBox="0 0 24 24"
    width={size}
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M16.604 11.048a5.67 5.67 0 0 0 .751-3.44c-.179-1.784-1.175-3.361-2.803-4.44l-1.105 1.666c1.119.742 1.8 1.799 1.918 2.974a3.693 3.693 0 0 1-1.072 2.986l-1.192 1.192 1.618.475C18.951 13.701 19 17.957 19 18h2c0-1.789-.956-5.285-4.396-6.952z"
      fill="currentColor"
    />
    <path
      d="M9.5 12c2.206 0 4-1.794 4-4s-1.794-4-4-4-4 1.794-4 4 1.794 4 4 4zm0-6c1.103 0 2 .897 2 2s-.897 2-2 2-2-.897-2-2 .897-2 2-2zm1.5 7H8c-3.309 0-6 2.691-6 6v1h2v-1c0-2.206 1.794-4 4-4h3c2.206 0 4 1.794 4 4v1h2v-1c0-3.309-2.691-6-6-6z"
      fill="currentColor"
    />
  </svg>
);

const LogoutIcon = ({ size = iconSize }: { size?: number }) => (
  <svg
    fill="none"
    height={size}
    stroke="currentColor"
    strokeLinecap="round"
    strokeLinejoin="round"
    strokeWidth="2.2"
    viewBox="0 0 24 24"
    width={size}
    xmlns="http://www.w3.org/2000/svg"
  >
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
    <polyline points="16 17 21 12 16 7" />
    <line x1="21" x2="9" y1="12" y2="12" />
  </svg>
);

const TableIcon = ({ size = iconSize }: { size?: number }) => (
  <svg
    aria-hidden="true"
    focusable="false"
    height={size}
    role="presentation"
    viewBox="0 0 24 24"
    width={size}
  >
    <path
      d="M15.48 3H7.52C4.07 3 2 5.06 2 8.52v7.95C2 19.94 4.07 22 7.52 22h7.95c3.46 0 5.52-2.06 5.52-5.52V8.52C21 5.06 18.93 3 15.48 3Z"
      fill="currentColor"
      opacity={0.4}
    />
    <path
      d="M21.02 2.98c-1.79-1.8-3.54-1.84-5.38 0L14.51 4.1c-.1.1-.13.24-.09.37.7 2.45 2.66 4.41 5.11 5.11.03.01.08.01.11.01.1 0 .2-.04.27-.11l1.11-1.12c.91-.91 1.36-1.78 1.36-2.67 0-.9-.45-1.79-1.36-2.71ZM17.86 10.42c-.27-.13-.53-.26-.77-.41-.2-.12-.4-.25-.59-.39-.16-.1-.34-.25-.52-.4-.02-.01-.08-.06-.16-.14-.31-.25-.64-.59-.95-.96-.02-.02-.08-.08-.13-.17-.1-.11-.25-.3-.38-.51-.11-.14-.24-.34-.36-.55-.15-.25-.28-.5-.4-.76-.13-.28-.23-.54-.32-.79L7.9 10.72c-.35.35-.69 1.01-.76 1.5l-.43 2.98c-.09.63.08 1.22.47 1.61.33.33.78.5 1.28.5.11 0 .22-.01.33-.02l2.97-.42c.49-.07 1.15-.4 1.5-.76l5.38-5.38c-.25-.08-.5-.19-.78-.31Z"
      fill="currentColor"
    />
  </svg>
);

const BrandIcon = () => (
  <svg height="24" viewBox="0 0 24 24" width="24">
    <path
      d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"
      fill="none"
      stroke="url(#emeraldGlow)"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
    />
    <defs>
      <linearGradient
        gradientUnits="userSpaceOnUse"
        id="emeraldGlow"
        x1="2"
        x2="22"
        y1="2"
        y2="22"
      >
        <stop stopColor="#34d399" /> {/* emerald-400 */}
        <stop offset="1" stopColor="#10b981" /> {/* emerald-500 */}
      </linearGradient>
    </defs>
  </svg>
);

/* ---------- à¸Šà¹ˆà¸§à¸¢à¹ƒà¸«à¹‰à¸ªà¹„à¸•à¸¥à¹Œà¸¥à¸´à¸‡à¸à¹Œ/à¸›à¸¸à¹ˆà¸¡à¹ƒà¸™ Navbar â€œà¹€à¸«à¸¡à¸·à¸­à¸™à¸à¸±à¸™â€ à¸—à¸¸à¸à¸—à¸µà¹ˆ ---------- */
const navLinkBase =
  "inline-flex items-center rounded-md px-3 py-2 text-sm font-medium transition-all duration-200";
const navLinkIdle = "text-zinc-400 hover:text-emerald-300";
const navLinkActive = "text-emerald-400";
const underlineBase =
  "relative after:absolute after:left-0 after:-bottom-0.5 after:h-0.5 after:w-full after:scale-x-0 after:rounded after:bg-emerald-400 after:transition-transform after:duration-200";
const underlineHover = "hover:after:scale-x-100";
const underlineActive = "after:scale-x-100";

/* ---------- Component ---------- */
export const NavbarComponent = () => {
  const router = useRouter();
  const { data: session, status } = useSession();
  const user = session?.user;
  const isAuthenticated = status === "authenticated";
  const isLoading = status === "loading";

  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);

  const onOpenLoginModal = useCallback(() => setIsLoginModalOpen(true), []);
  const onCloseLoginModal = useCallback(() => setIsLoginModalOpen(false), []);

  const navLinks = useMemo(() => {
    const primaryLink = isAuthenticated
      ? { label: "à¹‚à¸›à¸£à¹„à¸Ÿà¸¥à¹Œ", href: "/profile", needsAuth: false }
      : { label: "à¸«à¸™à¹‰à¸²à¸«à¸¥à¸±à¸", href: "/", needsAuth: false };

    return [
      primaryLink,
      { label: "à¸ˆà¸­à¸‡à¹‚à¸•à¹Šà¸°", href: "/booking", needsAuth: true }, 
      { label: "à¹à¸œà¸‡à¸œà¸±à¸‡à¹‚à¸•à¹Šà¸°", href: "/layout-table", needsAuth: false },
      { label: "à¸­à¸µà¹€à¸§à¸™à¸•à¹Œ", href: "/events", needsAuth: false },
    ];
  }, [isAuthenticated]);

  const go = useCallback((href: string) => router.push(href), [router]);

  const handleBookingClick = useCallback(
    (closeMenu?: () => void) => {
      if (isAuthenticated) {
        closeMenu?.();
        go("/booking");
      } else if (!isLoading) {
        closeMenu?.();
        onOpenLoginModal();
      }
    },
    [isAuthenticated, isLoading, onOpenLoginModal, go],
  );

  const handleDropdownAction = useCallback(
    (key: Key) => {
      switch (key) {
        case "profile":
          go("/profile");
          break;
        case "management":
          go("/admin/management");
          break;
        case "logout":
          signOut();
          break;
      }
    },
    [go],
  );

  const renderAuthContent = () => {
    if (isLoading) return <Skeleton className="flex h-9 w-9 rounded-full" />;

    if (isAuthenticated && user) {
      const imageUrl = user.image
        ? `/api/image-proxy?url=${encodeURIComponent(user.image)}`
        : undefined;

      return (
        <Dropdown placement="bottom-end">
          <DropdownTrigger>
            <Avatar
              isBordered
              as="button"
              className="h-9 w-9 transition-transform"
              name={user.name ?? undefined}
              size="sm"
              src={imageUrl}
            />
          </DropdownTrigger>
          <DropdownMenu
            aria-label="Profile Actions"
            variant="flat"
            onAction={handleDropdownAction}
          >
            {user.role === "admin" ? (
              <DropdownSection title="à¹€à¸„à¸£à¸·à¹ˆà¸­à¸‡à¸¡à¸·à¸­à¸ˆà¸±à¸”à¸à¸²à¸£">
                <DropdownItem
                  key="management"
                  startContent={<TableIcon />}
                  textValue="à¸ˆà¸±à¸”à¸à¸²à¸£à¸ªà¸–à¸²à¸™à¸›à¸£à¸°à¸à¸­à¸šà¸à¸²à¸£"
                >
                  à¸ˆà¸±à¸”à¸à¸²à¸£à¸ªà¸–à¸²à¸™à¸›à¸£à¸°à¸à¸­à¸šà¸à¸²à¸£
                </DropdownItem>
              </DropdownSection>
            ) : null}
            <DropdownSection title="à¸šà¸±à¸à¸Šà¸µà¸‚à¸­à¸‡à¸‰à¸±à¸™">
              <DropdownItem
                key="profile"
                startContent={<SettingsIcon />}
                textValue="à¹‚à¸›à¸£à¹„à¸Ÿà¸¥à¹Œà¸‚à¸­à¸‡à¸‰à¸±à¸™"
              >
                à¹‚à¸›à¸£à¹„à¸Ÿà¸¥à¹Œà¸‚à¸­à¸‡à¸‰à¸±à¸™
              </DropdownItem>
            </DropdownSection>
            <DropdownSection>
              <DropdownItem
                key="logout"
                color="danger"
                startContent={<LogoutIcon />}
                textValue="à¸­à¸­à¸à¸ˆà¸²à¸à¸£à¸°à¸šà¸š"
              >
                à¸­à¸­à¸à¸ˆà¸²à¸à¸£à¸°à¸šà¸š
              </DropdownItem>
            </DropdownSection>
          </DropdownMenu>
        </Dropdown>
      );
    }

    return (
      <NavbarItem>
        <Button
          className={[
            "h-9 px-4 text-sm font-semibold",
            "border border-emerald-400/40 bg-emerald-500/20 text-emerald-100",
            "backdrop-blur-sm shadow-[0_4px_20px_-5px_rgba(16,185,129,0.25)]",
            "transition-all duration-300 hover:bg-emerald-500/30 hover:shadow-[0_8px_30px_-10px_rgba(16,185,129,0.35)]",
            "active:scale-[0.97]",
          ].join(" ")}
          radius="full"
          size="sm"
          onPress={() => signIn("line")}
        >
          à¹€à¸‚à¹‰à¸²à¸ªà¸¹à¹ˆà¸£à¸°à¸šà¸šà¸”à¹‰à¸§à¸¢ LINE
        </Button>
      </NavbarItem>
    );
  };

  const NavLink = ({
    label,
    href,
    needsAuth,
    onClick,
  }: {
    label: string;
    href: string;
    needsAuth?: boolean;
    onClick?: () => void;
  }) => {
    const isActive = router.pathname === href;

    const className = [
      navLinkBase,
      underlineBase,
      isActive
        ? `${navLinkActive} ${underlineActive}`
        : `${navLinkIdle} ${underlineHover}`,
    ].join(" ");

    if (needsAuth) {
      return (
        <button
          className={className}
          type="button"
          onClick={() => {
            if (onClick) return onClick();
            handleBookingClick();
          }}
        >
          {label}
        </button>
      );
    }

    return (
      <Link
        aria-current={isActive ? "page" : undefined}
        as={NextLink}
        className={className}
        href={href}
      >
        {label}
      </Link>
    );
  };

  return (
    <>
      <Navbar
        isBordered
        className="bg-background/80 backdrop-blur-md"
        isMenuOpen={isMenuOpen}
        maxWidth="xl"
        position="sticky"
        onMenuOpenChange={setIsMenuOpen}
      >
        {/* Brand */}
        <NavbarContent justify="start">
          <NavbarBrand
            as={NextLink}
            className="gap-2"
            href={isAuthenticated ? "/profile" : "/"}
          >
            <BrandIcon />
            <p className="ml-1 text-base font-semibold text-foreground">
              Tably
            </p>
          </NavbarBrand>
        </NavbarContent>

        {/* Desktop Links */}
        <NavbarContent className="hidden gap-2 sm:flex" justify="center">
          {navLinks.map((l) => (
            <NavbarItem key={l.href} isActive={router.pathname === l.href}>
              <NavLink href={l.href} label={l.label} needsAuth={l.needsAuth ?? false} />
            </NavbarItem>
          ))}
        </NavbarContent>

        {/* Right (Auth + Menu Toggle) */}
        <NavbarContent justify="end">
          {renderAuthContent()}
          <NavbarMenuToggle
            aria-label={isMenuOpen ? "Close menu" : "Open menu"}
            className="sm:hidden"
          />
        </NavbarContent>

        {/* Mobile Menu (à¸£à¸¹à¸›à¸£à¹ˆà¸²à¸‡à¹€à¸”à¸µà¸¢à¸§à¸à¸±à¸šà¹€à¸”à¸ªà¸à¹Œà¸—à¹‡à¸­à¸›) */}
        <NavbarMenu className="gap-1">
          {navLinks.map((l) => (
            <NavbarMenuItem key={l.href} isActive={router.pathname === l.href}>
              <NavLink
                href={l.href}
                label={l.label}
                needsAuth={l.needsAuth ?? false}
                onClick={() => {
                  if (l.needsAuth) {
                    handleBookingClick(() => setIsMenuOpen(false));
                  } else {
                    setIsMenuOpen(false);
                    go(l.href);
                  }
                }}
              />
            </NavbarMenuItem>
          ))}
        </NavbarMenu>
      </Navbar>

      {/* Login Modal */}
      <LoginRequiredModal
        isOpen={isLoginModalOpen}
        onClose={onCloseLoginModal}
        onLogin={() => {
          onCloseLoginModal();
          signIn("line");
        }}
      />
    </>
  );
};

export { NavbarComponent as Navbar };

