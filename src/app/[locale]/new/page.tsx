import { redirect } from "@/i18n/routing";

// The preview became the home page
export default async function NewWebRedirect({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  redirect({ href: "/", locale });
}
