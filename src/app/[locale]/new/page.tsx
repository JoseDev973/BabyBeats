import type { Metadata } from "next";
import Image from "next/image";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/routing";
import { CREDIT_PACKS, GIFT_PACKS_USD } from "@/lib/stripe/credit-packs";
import { CREDIT_PACKS_COP, GIFT_PACKS_COP } from "@/lib/mercado-pago/config";
import DemoPlayer from "@/components/new-web/DemoPlayer";
import StickyCta from "@/components/new-web/StickyCta";
import styles from "./new.module.css";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "newWeb" });
  // Preview of the redesign: keep it out of search results
  return { title: t("metaTitle"), robots: { index: false, follow: false } };
}

// Demo songs made with the current Suno prompts: Emma in English, Sofía otherwise
const DEMOS_BY_LANG = {
  en: {
    name: "Emma",
    cuna: { src: "/new-web/demos/cuna-emma.mp3", chorus: ["Sleeeep little Emma", "Moon is holding youuu", "Dream so softly nowww"] },
    edu: { src: "/new-web/demos/educativa-emma.mp3", chorus: ["One two three four five", "Emma count with me", "Clap your hands with me"] },
    jugar: { src: "/new-web/demos/jugar-emma.mp3", chorus: ["Clap clap Emma", "Jump jump Emma", "Moo moo quack quack hey"] },
  },
  es: {
    name: "Sofía",
    cuna: { src: "/new-web/demos/cuna-sofia.mp3", chorus: ["Duerme Sofíaaa", "La luna te cuida", "Duerme mi amooor"] },
    edu: { src: "/new-web/demos/educativa-sofia.mp3", chorus: ["Uno dos tres", "cuatro y cinco", "canta Sofía", "otra vez"] },
    jugar: { src: "/new-web/demos/jugar-sofia.mp3", chorus: ["Palmas palmas ya", "baila Sofía", "chiki chiki pum"] },
  },
};

const cop = (n: number) => `$${n.toLocaleString("es-CO")} COP`;

export default async function NewWebPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "newWeb" });
  const DEMOS = locale === "en" ? DEMOS_BY_LANG.en : DEMOS_BY_LANG.es;
  const nameRe = new RegExp(`(${DEMOS.name}\\w*)`);
  const tg = await getTranslations({ locale, namespace: "gift" });
  const giftNames = { first_album: tg("firstAlbum"), sweet_dreams: tg("sweetDreams"), learning: tg("learning") };

  const kinds = [
    { key: "cuna", img: "luna", w: 520, h: 487, band: styles.bandLavender, title: t("cunaTitle"), body: t("cunaBody"), demo: t("demoCuna") },
    { key: "edu", img: "xilofono", w: 520, h: 362, band: styles.bandMint, title: t("eduTitle"), body: t("eduBody"), demo: t("demoEdu") },
    { key: "jugar", img: "ukulele", w: 486, h: 520, band: styles.bandPeach, title: t("jugarTitle"), body: t("jugarBody"), demo: t("demoJugar") },
  ] as const;

  const steps = [
    { n: "1", title: t("step1Title"), body: t("step1Body") },
    { n: "2", title: t("step2Title"), body: t("step2Body") },
    { n: "3", title: t("step3Title"), body: t("step3Body") },
  ];

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <Link href="/new" className={styles.logo}>
            <svg viewBox="0 0 28 20" aria-hidden="true" className={styles.logoMark}>
              <path d="M2 14c4-8 8-8 12 0s8 8 12 0" fill="none" strokeWidth="2.2" strokeLinecap="round" />
              <circle cx="8" cy="9" r="2.2" />
              <circle cx="20" cy="15" r="2.2" />
            </svg>
            BabyBeats
          </Link>
          <span className={styles.badge}>{t("badge")}</span>
          <nav className={styles.nav}>
            <Link href="/pricing">{t("navPricing")}</Link>
            <Link href="/gift">{t("navGift")}</Link>
            <Link href="/create" className={styles.navCta}>
              {t("navCta")}
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className={styles.hero}>
        <div className={styles.heroInner}>
          <div className={styles.heroText}>
            <p className={styles.eyebrow}>{t("eyebrow")}</p>
            <h1 className={styles.heroTitle}>{t("heroTitle")}</h1>
            <p className={styles.heroBody}>{t("heroBody")}</p>
            <div className={styles.heroActions}>
              <Link href="/create" id="hero-cta" className={styles.primary}>
                {t("heroCta")}
              </Link>
              <a href="#ejemplos" className={styles.textLink}>
                {t("heroListen")}
              </a>
            </div>
            <p className={styles.note}>{t("heroNote")}</p>
          </div>
          <div className={styles.heroStage}>
            <Image
              src="/new-web/hero.webp"
              alt=""
              width={1600}
              height={893}
              priority
              className={styles.heroArt}
            />
            <div className={styles.heroCard}>
              <DemoPlayer
                variant="hero"
                src={DEMOS.cuna.src}
                title={t("demoCuna")}
                eyebrow={t("playerNow")}
                playLabel={t("play")}
                pauseLabel={t("pause")}
              />
              <p className={styles.heroLyrics}>
                {DEMOS.cuna.chorus.map((line, n) => (
                  <span key={line}>
                    {line.split(nameRe).map((part, i) =>
                      part.startsWith(DEMOS.name) ? <mark key={i}>{part}</mark> : part,
                    )}
                    {n < DEMOS.cuna.chorus.length - 1 ? " · " : ""}
                  </span>
                ))}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Three kinds of songs */}
      <section id="ejemplos" className={styles.kinds}>
        <h2 className={styles.sectionTitle}>{t("kindsTitle")}</h2>
        <div className={styles.kindGrid}>
          {kinds.map((k) => (
            <article key={k.key} className={`${styles.kind} ${k.band}`}>
              <Image src={`/new-web/${k.img}.webp`} alt="" width={k.w} height={k.h} className={styles.kindArt} />
              <h3 className={styles.kindTitle}>{k.title}</h3>
              <p className={styles.kindBody}>{k.body}</p>
              <DemoPlayer
                src={DEMOS[k.key].src}
                title={k.demo}
                playLabel={t("play")}
                pauseLabel={t("pause")}
              />
              <p className={styles.chorus}>
                <span className={styles.lyricsLabel}>{t("lyricsLabel")}</span>
                {DEMOS[k.key].chorus.join(" · ")}
              </p>
              <Link href="/create" className={styles.kindCta}>
                {t("kindCta")} <span aria-hidden="true">→</span>
              </Link>
            </article>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className={styles.how}>
        <div className={styles.howInner}>
          <div>
            <h2 className={styles.sectionTitle}>{t("howTitle")}</h2>
            <Image src="/new-web/caja-musical.webp" alt="" width={495} height={520} className={styles.howArt} />
          </div>
          <ol className={styles.steps}>
            {steps.map((s) => (
              <li key={s.n} className={styles.step}>
                <span className={styles.stepNumber}>{s.n}</span>
                <div>
                  <h3 className={styles.stepTitle}>{s.title}</h3>
                  <p className={styles.stepBody}>{s.body}</p>
                </div>
              </li>
            ))}
          </ol>
          <div className={styles.howCta}>
            <Link href="/create" className={styles.primary}>
              {t("howCta")}
            </Link>
            <p className={styles.note}>{t("howNote")}</p>
          </div>
        </div>
      </section>

      {/* Gifts */}
      <section className={styles.giftWrap}>
        <div className={`${styles.giftPanel} ${styles.bandButter}`}>
          <Image src="/new-web/regalo.webp" alt="" width={361} height={520} className={styles.giftArt} />
          <div className={styles.bandText}>
            <p className={styles.eyebrow}>{t("giftEyebrow")}</p>
            <h3 className={styles.bandTitle}>{t("giftTitle")}</h3>
            <p className={styles.bandBody}>{t("giftBody")}</p>
            <ul className={styles.ledger}>
              {(Object.keys(GIFT_PACKS_USD) as (keyof typeof GIFT_PACKS_USD)[]).map((k) => (
                <li key={k}>
                  <span>
                    {giftNames[k]}
                    <small>{t("giftSongs", { count: GIFT_PACKS_USD[k].songs })}</small>
                  </span>
                  <span className={styles.ledgerPrice}>
                    US${GIFT_PACKS_USD[k].price}
                    <small>{cop(GIFT_PACKS_COP[k].price)}</small>
                  </span>
                </li>
              ))}
            </ul>
            <Link href="/gift" className={styles.primary}>
              {t("giftCta")}
            </Link>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className={styles.pricing}>
        <div className={styles.pricingInner}>
          <div>
            <h2 className={styles.sectionTitle}>{t("priceTitle")}</h2>
            <p className={styles.bandBody}>{t("priceBody")}</p>
          </div>
          <ul className={styles.ledger}>
            {(Object.keys(CREDIT_PACKS) as (keyof typeof CREDIT_PACKS)[]).map((k) => (
              <li key={k} className={CREDIT_PACKS[k].popular ? styles.ledgerPopular : undefined}>
                <span>
                  {CREDIT_PACKS[k].name}
                  {CREDIT_PACKS[k].popular && <em className={styles.popularTag}>{t("popular")}</em>}
                  <small>{t("pricePerSong", { price: `US$${CREDIT_PACKS[k].pricePerSong.toFixed(2)}` })}</small>
                </span>
                <span className={styles.ledgerRight}>
                  <span className={styles.ledgerPrice}>
                    US${CREDIT_PACKS[k].price}
                    <small>{cop(CREDIT_PACKS_COP[k].price)}</small>
                  </span>
                  <Link href={`/checkout/${k}`} className={styles.buy}>
                    {t("buy")}
                  </Link>
                </span>
              </li>
            ))}
          </ul>
          <Link href="/pricing" className={styles.textLink}>
            {t("priceCta")}
          </Link>
        </div>
      </section>

      {/* Closing */}
      <section className={styles.closing}>
        <Image src="/new-web/audifonos.webp" alt="" width={520} height={489} className={styles.closingArt} />
        <h2 className={styles.closingTitle}>{t("closingTitle")}</h2>
        <Link href="/create" className={styles.primary}>
          {t("closingCta")}
        </Link>
      </section>

      <StickyCta targetId="hero-cta" className={styles.sticky} hiddenClassName={styles.stickyHidden}>
        <Link href="/create" className={styles.primary}>
          {t("stickyCta")}
        </Link>
      </StickyCta>

      <footer className={styles.footer}>
        <span>{t("footerNote")}</span>
        <Link href="/" className={styles.textLink}>
          {t("footerOld")}
        </Link>
      </footer>
    </div>
  );
}
