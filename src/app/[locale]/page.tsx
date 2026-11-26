import Landing from "@/components/new-web/Landing";

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  return <Landing locale={locale} />;
}
