import type {
  NavigationBreadcrumb,
  NavigationHeaderContent,
} from "@/lib/navigation";

import React, { useMemo } from "react";
import NextLink from "next/link";
import { useRouter } from "next/router";

type NavigationHeaderProps = NavigationHeaderContent & {
  actions?: React.ReactNode;
};

const ArrowLeftIcon = ({ className }: { className?: string }) => (
  <svg
    aria-hidden="true"
    className={className}
    fill="none"
    height="16"
    viewBox="0 0 16 16"
    width="16"
  >
    <path
      d="M9.5 3.333L5.167 7.667 9.5 12"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.5"
    />
  </svg>
);

const resolveBackCrumb = (
  breadcrumbs: NavigationBreadcrumb[],
): NavigationBreadcrumb | null => {
  if (breadcrumbs.length === 0) {
    return null;
  }

  let fallback: NavigationBreadcrumb | null = null;

  for (let index = breadcrumbs.length - 2; index >= 0; index -= 1) {
    const candidate = breadcrumbs[index];

    if (!fallback) {
      fallback = candidate;
    }
    if (candidate.href) {
      return candidate;
    }
  }

  if (fallback) {
    return fallback;
  }

  const first = breadcrumbs[0];

  if (first?.href) {
    return first;
  }

  return null;
};

export const NavigationHeader: React.FC<NavigationHeaderProps> = ({
  title,
  description,
  breadcrumbs = [],
  actions,
}) => {
  const router = useRouter();
  const currentCrumb =
    breadcrumbs.length > 0
      ? breadcrumbs[breadcrumbs.length - 1]
      : { label: title };
  const backCrumb = useMemo(
    () => resolveBackCrumb(breadcrumbs) ?? { label: "หน้าแรก", href: "/" },
    [breadcrumbs],
  );
  const backLabel = backCrumb.label ?? "ย้อนกลับ";
  const backText = `กลับไปยัง ${backLabel}`;

  const handleBack = (
    event: React.MouseEvent<HTMLAnchorElement | HTMLButtonElement>,
  ) => {
    if (backCrumb.href) {
      return;
    }
    event.preventDefault();
    router.back();
  };

  return (
    <section className="mx-auto w-full max-w-7xl px-6 pt-20">
      <div className="flex flex-wrap items-start justify-between gap-6 border-b border-white/10 pb-8">
        <div className="flex flex-col gap-3 text-white">
          <div className="flex flex-wrap items-center gap-2 text-sm text-white/60">
            {backCrumb.href ? (
              <NextLink
                className="flex items-center gap-2 transition-colors hover:text-white"
                href={backCrumb.href}
              >
                <ArrowLeftIcon className="text-white/60" />
                <span className="font-medium">{backText}</span>
              </NextLink>
            ) : (
              <button
                className="flex items-center gap-2 text-white/60 transition-colors hover:text-white"
                type="button"
                onClick={handleBack}
              >
                <ArrowLeftIcon className="text-white/60" />
                <span className="font-medium">{backText}</span>
              </button>
            )}
            <span className="text-white/30">/</span>
            <span className="font-semibold text-emerald-300">
              {currentCrumb.label ?? title}
            </span>
          </div>

          <div>
            <h1 className="text-3xl font-semibold text-white">{title}</h1>
            {description ? (
              <p className="mt-2 text-sm text-white/60">{description}</p>
            ) : null}
          </div>
        </div>

        {actions ? <div className="shrink-0">{actions}</div> : null}
      </div>
    </section>
  );
};
