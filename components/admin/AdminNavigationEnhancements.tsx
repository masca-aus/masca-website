"use client";

import { usePathname, useRouter } from "next/navigation";
import { type ReactNode, useEffect, useRef, useState } from "react";

import { AccountNavigation } from "./AccountNavigation";
import { adminNavigationPath, isAdminNavigationTarget } from "./adminNavigation";

type Props = {
  children?: ReactNode;
};

const hrefFromEvent = (target: EventTarget | null) =>
  target instanceof Element ? target.closest<HTMLAnchorElement>("a[href]")?.getAttribute("href") : null;

export function AdminNavigationEnhancements({ children }: Props) {
  const pathname = usePathname();
  const router = useRouter();
  const prefetchedPaths = useRef(new Set<string>());
  const [navigationTarget, setNavigationTarget] = useState<string | null>(null);

  useEffect(() => {
    const prefetchRoute = (event: PointerEvent) => {
      const href = hrefFromEvent(event.target);

      if (!href || !isAdminNavigationTarget(href) || prefetchedPaths.current.has(href)) {
        return;
      }

      prefetchedPaths.current.add(href);
      router.prefetch(href);
    };

    const beginNavigation = (event: MouseEvent) => {
      const href = hrefFromEvent(event.target);

      if (
        !href ||
        !isAdminNavigationTarget(href) ||
        adminNavigationPath(href) === pathname ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      ) {
        return;
      }

      setNavigationTarget(adminNavigationPath(href));
    };

    document.addEventListener("pointerover", prefetchRoute, true);
    document.addEventListener("click", beginNavigation, true);

    return () => {
      document.removeEventListener("pointerover", prefetchRoute, true);
      document.removeEventListener("click", beginNavigation, true);
    };
  }, [pathname, router]);

  const isNavigating = navigationTarget !== null && navigationTarget !== pathname;

  return (
    <>
      {isNavigating ? <span aria-hidden="true" className="masca-admin-route-progress" /> : null}
      {pathname === "/admin/account" ? <div className="masca-account-page"><AccountNavigation />{children}</div> : children}
    </>
  );
}
