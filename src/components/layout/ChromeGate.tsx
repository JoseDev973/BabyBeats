"use client";

import { usePathname } from "@/i18n/routing";

/** Hides the current site chrome (navbar, footer, player) on the home page, which brings its own. */
export default function ChromeGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  if (pathname === "/") return null;
  return <>{children}</>;
}
