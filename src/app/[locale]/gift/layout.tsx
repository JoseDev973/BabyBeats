import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Gift a Song",
  description:
    "Gift a personalized baby song to someone special. Choose a pack, add the baby's name, and share a unique musical gift.",
};

export default function GiftLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
