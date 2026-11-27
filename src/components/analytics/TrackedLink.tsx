"use client";

import type { AnchorHTMLAttributes } from "react";
import { track } from "@/lib/analytics";

type Props = AnchorHTMLAttributes<HTMLAnchorElement> & {
  event: string;
  params?: Record<string, string | number>;
};

/** Plain <a> that reports an analytics event on click (for Server Components). */
export function TrackedLink({ event, params, onClick, ...props }: Props) {
  return (
    <a
      {...props}
      onClick={(e) => {
        track(event, params);
        onClick?.(e);
      }}
    />
  );
}
