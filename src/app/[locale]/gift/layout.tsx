import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "metadata" });
  return {
    title: t("giftTitle"),
    description: t("giftDescription"),
  };
}

export default function GiftLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
