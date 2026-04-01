import { Moon, BookOpen, PartyPopper } from "lucide-react";
import type { SongTheme } from "@/types/database";

const THEME_CONFIG = {
  lullaby: {
    gradient: "from-indigo-200 to-purple-200",
    icon: Moon,
  },
  educational: {
    gradient: "from-emerald-200 to-teal-200",
    icon: BookOpen,
  },
  fun: {
    gradient: "from-pink-200 to-orange-200",
    icon: PartyPopper,
  },
} as const;

const SIZE_CLASSES = {
  sm: "h-10 w-10",
  md: "h-12 w-12",
  lg: "h-40 w-40",
} as const;

const ICON_SIZES = {
  sm: "h-4 w-4",
  md: "h-5 w-5",
  lg: "h-16 w-16",
} as const;

const LETTER_SIZES = {
  sm: "text-lg",
  md: "text-xl",
  lg: "text-6xl",
} as const;

interface SongCoverProps {
  theme: SongTheme;
  size?: "sm" | "md" | "lg";
  childName?: string;
}

export default function SongCover({
  theme,
  size = "md",
  childName,
}: SongCoverProps) {
  const config = THEME_CONFIG[theme] || THEME_CONFIG.lullaby;
  const Icon = config.icon;

  return (
    <div
      className={`${SIZE_CLASSES[size]} rounded-xl bg-gradient-to-br ${config.gradient} flex items-center justify-center shadow-sm shrink-0`}
    >
      {childName ? (
        <span
          className={`${LETTER_SIZES[size]} font-bold text-white/80 select-none`}
        >
          {childName.charAt(0).toUpperCase()}
        </span>
      ) : (
        <Icon className={`${ICON_SIZES[size]} text-white/70`} />
      )}
    </div>
  );
}
