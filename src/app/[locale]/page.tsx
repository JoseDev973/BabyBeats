import { useTranslations } from "next-intl";
import { Link } from "@/i18n/routing";
import { Music, BookOpen, Moon, Headphones, Sparkles, Share2 } from "lucide-react";

export default function HomePage() {
  const t = useTranslations();

  return (
    <>
      {/* Hero */}
      <section className="flex flex-col items-center justify-center px-4 py-24 sm:py-32 text-center bg-gradient-to-b from-secondary/50 to-background">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-foreground">
            {t("home.hero.title")}
          </h1>
          <p className="mt-6 text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto">
            {t("home.hero.subtitle")}
          </p>
          <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/create"
              className="bg-primary text-primary-foreground px-8 py-3 rounded-lg text-lg font-medium hover:bg-primary/90 transition-colors flex items-center justify-center gap-2"
            >
              <Sparkles className="h-5 w-5" />
              {t("home.hero.ctaCreate")}
            </Link>
            <Link
              href="/songs"
              className="border border-border px-8 py-3 rounded-lg text-lg font-medium hover:bg-muted transition-colors"
            >
              {t("home.hero.cta")}
            </Link>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-24 px-4 bg-background">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12">
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
              <div key={item.step} className="text-center">
                <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  {item.icon}
                </div>
                <h3 className="font-semibold mb-1">{item.title}</h3>
                <p className="text-sm text-muted-foreground">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Categories */}
      <section id="categories" className="py-24 px-4 bg-muted/30">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12">
            {t("home.categories.title")}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <CategoryCard
              icon={<Moon className="h-8 w-8 text-primary" />}
              title={t("home.categories.lullabies")}
              description={t("home.categories.lullabiesDesc")}
            />
            <CategoryCard
              icon={<BookOpen className="h-8 w-8 text-primary" />}
              title={t("home.categories.educational")}
              description={t("home.categories.educationalDesc")}
            />
            <CategoryCard
              icon={<Music className="h-8 w-8 text-primary" />}
              title={t("home.categories.fun")}
              description={t("home.categories.funDesc")}
            />
          </div>
        </div>
      </section>

      {/* Listen Anywhere */}
      <section className="py-24 px-4 bg-muted/50">
        <div className="max-w-4xl mx-auto text-center">
          <Headphones className="h-12 w-12 text-primary mx-auto mb-6" />
          <h2 className="text-3xl font-bold mb-4">
            {t("home.platforms.title")}
          </h2>
          <p className="text-lg text-muted-foreground mb-8">
            {t("home.platforms.subtitle")}
          </p>
          <div className="flex flex-wrap justify-center gap-6 text-muted-foreground">
            {["Spotify", "Apple Music", "YouTube Music", "Amazon Music"].map(
              (platform) => (
                <div
                  key={platform}
                  className="px-6 py-3 rounded-lg border border-border bg-background text-sm font-medium"
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
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="flex flex-col items-center text-center p-8 rounded-xl border border-border bg-card hover:shadow-lg transition-shadow">
      <div className="mb-4">{icon}</div>
      <h3 className="text-xl font-semibold mb-2">{title}</h3>
      <p className="text-muted-foreground">{description}</p>
    </div>
  );
}
