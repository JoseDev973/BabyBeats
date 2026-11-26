"use client";

import { useEffect, useState } from "react";

/** Mobile bottom bar that appears only once the hero's main button has scrolled out of view. */
export default function StickyCta({
  targetId,
  className,
  hiddenClassName,
  children,
}: {
  targetId: string;
  className: string;
  hiddenClassName: string;
  children: React.ReactNode;
}) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const target = document.getElementById(targetId);
    if (!target) return;
    const observer = new IntersectionObserver(([entry]) => setVisible(!entry.isIntersecting));
    observer.observe(target);
    return () => observer.disconnect();
  }, [targetId]);

  return <div className={`${className} ${visible ? "" : hiddenClassName}`}>{children}</div>;
}
