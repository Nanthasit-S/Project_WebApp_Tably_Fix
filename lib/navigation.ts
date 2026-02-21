import type { ParsedUrlQuery } from "querystring";

export type NavigationBreadcrumb = {
  label: string;
  href?: string;
};

export type NavigationHeaderContent = {
  title: string;
  description?: string;
  breadcrumbs?: NavigationBreadcrumb[];
};

type NavigationContext = {
  pathname: string;
  asPath: string;
  query: ParsedUrlQuery;
};

type NavigationRoute = {
  pattern: RegExp;
  base: NavigationHeaderContent;
  resolve?: (context: NavigationContext) => Partial<NavigationHeaderContent>;
};

const NAVIGATION_ROUTES: NavigationRoute[] = [
  {
    pattern: /^\/$/,
    base: {
      title: "",
      description: "Discover upcoming events and tailor your next night out.",
      breadcrumbs: [{ label: "หน้าหลัก" }],
    },
  },
  {
    pattern: /^\/booking$/,
    base: {
      title: "อยากได้โต๊ะไหนเลือกได้เลย",
      description: "โซนไหนโดน แก๊งกี่คนจัดมา กดจองไว้เลยก่อนโต๊ะเต็ม",
      breadcrumbs: [{ label: "หน้าหลัก", href: "/" }, { label: "จองโต๊ะ" }],
    },
  },
  {
    pattern: /^\/layout-table$/,
    base: {
      title: "แผนผังโต๊ะของทาร้าน",
      description: "ไปที่หน้าจองโต๊ะเพื่อเลือกโต๊ะได้เลย!!!",
      breadcrumbs: [{ label: "หน้าหลัก", href: "/" }, { label: "แผนผังโต๊ะ" }],
    },
  },
  {
    pattern: /^\/events(?:\/index)?$/,
    base: {
      title: "",
      description: "",
      breadcrumbs: [{ label: "หน้าหลัก", href: "/" }, { label: "อีเว้นต์" }],
    },
  },
  {
    pattern: /^\/events\/\[eventId\]$/,
    base: {
      title: "รายละเอียดอีเว้นต์",
      description: "พร้อมมั้ย? ดูศิลปินกับสิทธิพิเศษก่อนกดจองเลย ✨",
      breadcrumbs: [
        { label: "หน้าหลัก", href: "/" },
        { label: "อีเว้นต์", href: "/events" },
      ],
    },
    resolve: ({ query }) => {
      const eventId = toSingle(query.eventId);

      if (!eventId) {
        return {
          breadcrumbs: [
            { label: "หน้าหลัก", href: "/" },
            { label: "อีเว้นต์", href: "/events" },
            { label: "รายละเอียดอีเว้นต์" },
          ],
        };
      }
      const label = toTitle(eventId);

      return {
        title: `อีเว้นต์: ${label}`,
        breadcrumbs: [
          { label: "หน้าหลัก", href: "/" },
          { label: "อีเว้นต์", href: "/events" },
          { label },
        ],
      };
    },
  },
  {
    pattern: /^\/events\/order\/\[orderId\]$/,
    base: {
      title: "รายละเอียดการสั่งซื้อ",
      description: "",
      breadcrumbs: [
        { label: "หน้าหลัก", href: "/" },
        { label: "อีเว้นต์", href: "/events" },
        { label: "ติดตามสถานะการสั่งซื้อ" },
      ],
    },
    resolve: ({ query }) => {
      const orderId = toSingle(query.orderId);

      if (!orderId) {
        return {};
      }
      const label = `หมายเลขคำสั่งซื้อ #${abbreviate(orderId)}`;

      return {
        title: label,
        breadcrumbs: [
          { label: "หน้าหลัก", href: "/" },
          { label: "อีเว้นต์", href: "/events" },
          { label: "ติดตามคำสั่งซื้อ" },
          { label },
        ],
      };
    },
  },
  {
    pattern: /^\/bookings\/order\/\[orderId\]$/,
    base: {
      title: "สถานะการจองโต๊ะ",
      description:
        "ตรวจสอบสถานะการจองโต๊ะและยืนยันการชำระเงินผ่านระบบได้ที่นี่",
      breadcrumbs: [
        { label: "หน้าหลัก", href: "/" },
        { label: "การจองโต๊ะ", href: "/booking" },
        { label: "ติดตามการจองโต๊ะ" },
      ],
    },
    resolve: ({ query }) => {
      const orderId = toSingle(query.orderId);

      if (!orderId) {
        return {};
      }
      const label = `หมายเลขการจองโต๊ะ #${abbreviate(orderId)}`;

      return {
        title: label,
        breadcrumbs: [
          { label: "หน้าหลัก", href: "/" },
          { label: "การจองโต๊ะ", href: "/booking" },
          { label: "ติดตามการจองโต๊ะ" },
          { label },
        ],
      };
    },
  },
  {
    pattern: /^\/profile(?:\/index)?$/,
    base: {
      title: "",
      description: "",
      breadcrumbs: [{ label: "หน้าหลัก", href: "/" }, { label: "โปรไฟล์" }],
    },
  },
  {
    pattern: /^\/admin\/management(?:\/index)?$/,
    base: {
      title: "",
      description: "",
      breadcrumbs: [
        { label: "หน้าหลัก", href: "/" },
        { label: "หน้าภาพรวม", href: "/admin/management" },
        { label: "ภาพรวม" },
      ],
    },
  },
  {
    pattern: /^\/admin\/management\/bookings$/,
    base: {
      title: "",
      description: "",
      breadcrumbs: [
        { label: "หน้าหลัก", href: "/" },
        { label: "หน้าภาพรวม", href: "/admin/management" },
        { label: "การจองโต๊ะ" },
      ],
    },
  },
  {
    pattern: /^\/admin\/management\/tables$/,
    base: {
      title: "โต๊ะและโซน",
      description:
        "Define seating capacity and zone availability for each event.",
      breadcrumbs: [
        { label: "หน้าหลัก", href: "/" },
        { label: "หน้าภาพรวม", href: "/admin/management" },
        { label: "โต๊ะ" },
      ],
    },
  },
  {
    pattern: /^\/admin\/management\/events$/,
    base: {
      title: "",
      description: "",
      breadcrumbs: [
        { label: "หน้าหลัก", href: "/" },
        { label: "หน้าภาพรวม", href: "/admin/management" },
        { label: "อีเว้นต์" },
      ],
    },
  },
  {
    pattern: /^\/admin\/management\/users$/,
    base: {
      title: "",
      description: "",
      breadcrumbs: [
        { label: "หน้าหลัก", href: "/" },
        { label: "หน้าภาพรวม", href: "/admin/management" },
        { label: "ผู้ใช้งาน" },
      ],
    },
  },
  {
    pattern: /^\/admin\/management\/zones$/,
    base: {
      title: "Venue Zones",
      description:
        "Set capacity and experience details for each area of the venue.",
      breadcrumbs: [
        { label: "Home", href: "/" },
        { label: "Admin", href: "/admin/management" },
        { label: "Zones" },
      ],
    },
  },
  {
    pattern: /^\/admin\/management\/settings$/,
    base: {
      title: "",
      description: "",
      breadcrumbs: [
        { label: "หน้าหลัก", href: "/" },
        { label: "หน้าภาพรวม", href: "/admin/management" },
        { label: "ตั้งค่า" },
      ],
    },
  },
];

export function resolveNavigationHeader({
  pathname,
  asPath,
  query,
}: NavigationContext): NavigationHeaderContent {
  for (const route of NAVIGATION_ROUTES) {
    if (route.pattern.test(pathname) || route.pattern.test(asPath)) {
      const overrides = route.resolve
        ? route.resolve({ pathname, asPath, query })
        : {};

      return {
        ...route.base,
        ...overrides,
      };
    }
  }

  const fallbackPath = safePath(asPath || pathname);

  return buildFallbackHeader(fallbackPath);
}

function buildFallbackHeader(path: string): NavigationHeaderContent {
  const cleanPath = safePath(path);

  if (cleanPath === "/") {
    return {
      title: "Explore CY Nightlife",
      description: "Discover updates and tools tailored to your experience.",
      breadcrumbs: [{ label: "Home" }],
    };
  }

  const segments = cleanPath.split("/").filter(Boolean);

  if (segments.length === 0) {
    return {
      title: "Explore CY Nightlife",
      description: "Discover updates and tools tailored to your experience.",
      breadcrumbs: [{ label: "Home" }],
    };
  }

  const breadcrumbs: NavigationBreadcrumb[] = [{ label: "Home", href: "/" }];
  const cumulative: string[] = [];

  segments.forEach((segment, index) => {
    cumulative.push(segment);
    const href = `/${cumulative.join("/")}`;
    const label = toTitle(segment);
    const isLast = index === segments.length - 1;

    breadcrumbs.push({
      label,
      href: isLast ? undefined : href,
    });
  });

  return {
    title: toTitle(segments[segments.length - 1]),
    description: "",
    breadcrumbs,
  };
}

function safePath(path: string | undefined): string {
  if (!path) {
    return "/";
  }
  const clean = path.split("?")[0]?.split("#")[0];

  return clean && clean.startsWith("/")
    ? clean
    : `/${clean ?? ""}`.replace(/\/+/g, "/");
}

function toSingle(value: string | string[] | undefined): string | null {
  if (!value) {
    return null;
  }
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return value;
}

function toTitle(raw: string): string {
  if (!raw) {
    return "";
  }
  const decoded = decodeURIComponent(raw);
  const cleaned = decoded.replace(/[-_]+/g, " ").replace(/\s+/g, " ").trim();

  if (!cleaned) {
    return decoded;
  }

  return cleaned
    .split(" ")
    .map((word) => capitalize(word))
    .join(" ");
}

function capitalize(word: string): string {
  if (!word) {
    return word;
  }

  return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
}

function abbreviate(value: string, length = 6): string {
  const normalized = value.toUpperCase();

  if (normalized.length <= length) {
    return normalized;
  }

  return `${normalized.slice(0, length)}...`;
}
