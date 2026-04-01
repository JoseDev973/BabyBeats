import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/routing";
import { Music, BookOpen, Moon, Headphones, Sparkles, Share2, Gift } from "lucide-react";
import { createClient } from "@/lib/supabase/server";

export default async function HomePage() {
  const t = await getTranslations();

  // Check if user already used their free song
  let isFirstSong = true;
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("total_songs_generated")
        .eq("id", user.id)
        .single();
      isFirstSong = (profile?.total_songs_generated ?? 0) === 0;
    }
  } catch {
    // Not logged in, show free CTA
  }

  return (
    <>
      {/* Hero */}
      <section className="relative flex flex-col items-center justify-center px-4 pt-20 pb-16 sm:pt-28 sm:pb-20 text-center overflow-hidden">
        {/* Warm gradient background */}
        <div className="absolute inset-0 bg-gradient-to-b from-secondary/60 via-background to-background" />
        {/* Decorative circles */}
        <div className="absolute top-10 left-10 w-32 h-32 bg-gold/20 rounded-full blur-3xl" />
        <div className="absolute bottom-20 right-10 w-40 h-40 bg-accent/20 rounded-full blur-3xl" />
        <div className="absolute top-1/3 right-1/4 w-24 h-24 bg-primary/10 rounded-full blur-2xl" />

        <div className="max-w-3xl mx-auto relative z-10">
          <div className="inline-flex items-center gap-2 bg-gold/20 text-accent-foreground px-4 py-1.5 rounded-full text-sm font-medium mb-6">
            <Sparkles className="h-4 w-4" />
            {t("common.tagline")}
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-foreground leading-tight">
            {t("home.hero.title")}
          </h1>
          <p className="mt-6 text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto">
            {t("home.hero.subtitle")}
          </p>
          <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/create"
              className="bg-primary text-primary-foreground px-8 py-3.5 rounded-2xl text-lg font-bold hover:bg-primary/90 transition-all hover:scale-[1.02] hover:shadow-lg flex items-center justify-center gap-2"
            >
              <Sparkles className="h-5 w-5" />
              {isFirstSong ? t("home.hero.ctaCreateFree") : t("home.hero.ctaCreate")}
            </Link>
            <Link
              href="/gift"
              className="bg-gradient-to-r from-accent to-gold text-accent-foreground px-8 py-3.5 rounded-2xl text-lg font-bold hover:shadow-lg transition-all hover:scale-[1.02] flex items-center justify-center gap-2"
            >
              <Gift className="h-5 w-5" />
              {t("home.hero.ctaGift")}
            </Link>
          </div>
        </div>

        {/* Wave separator */}
        <div className="absolute -bottom-1 left-0 right-0">
          <svg viewBox="0 0 1440 40" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full">
            <path d="M0 20C240 40 480 0 720 20C960 40 1200 0 1440 20V40H0V20Z" fill="var(--background)" />
          </svg>
        </div>
      </section>

      {/* How it works */}
      <section className="py-12 sm:py-16 px-4 bg-background">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-extrabold text-center mb-10">
            {t("home.howItWorks.title")}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
            {[
              {
                step: "1",
                title: t("home.howItWorks.step1Title"),
                desc: t("home.howItWorks.step1Desc"),
                icon: <Sparkles className="h-6 w-6 text-primary" />,
              },
              {
                step: "2",
                title: t("home.howItWorks.step2Title"),
                desc: t("home.howItWorks.step2Desc"),
                icon: <Music className="h-6 w-6 text-primary" />,
              },
              {
                step: "3",
                title: t("home.howItWorks.step3Title"),
                desc: t("home.howItWorks.step3Desc"),
                icon: <Share2 className="h-6 w-6 text-primary" />,
              },
            ].map((item) => (
              <div key={item.step} className="text-center group">
                <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                  {item.icon}
                </div>
                <div className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-gold/30 text-xs font-bold text-accent-foreground mb-2">
                  {item.step}
                </div>
                <h3 className="font-bold mb-1">{item.title}</h3>
                <p className="text-sm text-muted-foreground">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Categories */}
      <section id="categories" className="relative py-20 px-4 overflow-hidden">
        {/* Wave top */}
        <div className="absolute top-0 left-0 right-0 rotate-180">
          <svg viewBox="0 0 1440 60" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full">
            <path d="M0 30C360 60 720 0 1080 30C1260 45 1350 15 1440 30V60H0V30Z" fill="var(--background)" />
          </svg>
        </div>
        <div className="absolute inset-0 bg-gradient-to-b from-secondary/30 to-muted/20" />
        <div className="max-w-7xl mx-auto relative z-10">
          <h2 className="text-3xl font-extrabold text-center mb-12">
            {t("home.categories.title")}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <CategoryCard
              icon={<Moon className="h-8 w-8 text-primary" />}
              title={t("home.categories.lullabies")}
              description={t("home.categories.lullabiesDesc")}
              gradient="from-indigo-50 to-purple-50"
            />
            <CategoryCard
              icon={<BookOpen className="h-8 w-8 text-emerald-500" />}
              title={t("home.categories.educational")}
              description={t("home.categories.educationalDesc")}
              gradient="from-emerald-50 to-teal-50"
            />
            <CategoryCard
              icon={<Music className="h-8 w-8 text-pink-500" />}
              title={t("home.categories.fun")}
              description={t("home.categories.funDesc")}
              gradient="from-pink-50 to-orange-50"
            />
          </div>
        </div>
      </section>

      {/* Listen Anywhere */}
      <section className="py-20 px-4 bg-background">
        <div className="max-w-4xl mx-auto text-center">
          <div className="h-16 w-16 bg-gradient-to-br from-primary/20 to-gold/30 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <Headphones className="h-8 w-8 text-primary" />
          </div>
          <h2 className="text-3xl font-extrabold mb-4">
            {t("home.platforms.title")}
          </h2>
          <p className="text-lg text-muted-foreground mb-8">
            {t("home.platforms.subtitle")}
          </p>
          <div className="flex flex-wrap justify-center gap-4 text-muted-foreground">
            {["Spotify", "Apple Music", "YouTube Music", "Amazon Music"].map(
              (platform) => (
                <div
                  key={platform}
                  className="px-6 py-3 rounded-2xl border border-border bg-card text-sm font-semibold hover:border-primary/30 hover:shadow-sm transition-all"
                >
                  {platform}
                </div>
              ),
            )}
          </div>
        </div>
      </section>
    </>
  );
}

function CategoryCard({
  icon,
  title,
  description,
  gradient,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  gradient: string;
}) {
  return (
    <div className={`flex flex-col items-center text-center p-8 rounded-2xl border border-border bg-gradient-to-br ${gradient} hover:shadow-lg hover:scale-[1.02] transition-all cursor-default`}>
      <div className="mb-4 h-16 w-16 rounded-2xl bg-white/80 flex items-center justify-center shadow-sm">
        {icon}
      </div>
      <h3 className="text-xl font-bold mb-2">{title}</h3>
      <p className="text-muted-foreground">{description}</p>
    </div>
  );
}
