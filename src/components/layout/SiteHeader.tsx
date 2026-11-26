"use client";

import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link, usePathname, useRouter, routing } from "@/i18n/routing";
import { createClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";
import styles from "./site-header.module.css";

/** Site-wide header (new design): nav, account menu, language toggle. */
export default function SiteHeader() {
  const t = useTranslations("newWeb");
  const tc = useTranslations("common");
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [credits, setCredits] = useState<number | null>(null);
  const [accountOpen, setAccountOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    const loadCredits = async (u: User | null) => {
      if (!u) return setCredits(null);
      const { data } = await supabase.from("profiles").select("credits").eq("id", u.id).single();
      setCredits(data?.credits ?? null);
    };
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user);
      void loadCredits(data.user);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user ?? null);
      void loadCredits(session?.user ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  async function logout() {
    await createClient().auth.signOut();
    setAccountOpen(false);
    router.push("/");
    router.refresh();
  }

  const initial = (user?.user_metadata?.full_name || user?.email || "?").trim().charAt(0).toUpperCase();

  const navLinks = (
    <>
      <Link href="/songs">{t("navSongs")}</Link>
      <Link href="/pricing">{t("navPricing")}</Link>
      <Link href="/gift">{t("navGift")}</Link>
    </>
  );

  const langs = (
    <div className={styles.langs} role="group" aria-label={t("language")}>
      {routing.locales.map((loc) => (
        <Link
          key={loc}
          href={pathname}
          locale={loc}
          aria-current={loc === locale ? "true" : undefined}
          className={loc === locale ? styles.langOn : undefined}
        >
          {loc.toUpperCase()}
        </Link>
      ))}
    </div>
  );

  return (
    <header
      className={styles.header}
      onClickCapture={(e) => {
        // Close menus when a link is followed
        if ((e.target as HTMLElement).closest("a")) {
          setAccountOpen(false);
          setMenuOpen(false);
        }
      }}
    >
      <div className={styles.inner}>
        <Link href="/" className={styles.logo}>
          <svg viewBox="0 0 28 20" aria-hidden="true" className={styles.logoMark}>
            <path d="M2 14c4-8 8-8 12 0s8 8 12 0" fill="none" strokeWidth="2.2" strokeLinecap="round" />
            <circle cx="8" cy="9" r="2.2" />
            <circle cx="20" cy="15" r="2.2" />
          </svg>
          BabyBeats
        </Link>

        <nav className={styles.nav}>{navLinks}</nav>

        <div className={styles.actions}>
          <Link href="/create" className={styles.cta}>
            {t("navCta")}
          </Link>

          {user ? (
            <div className={styles.account}>
              <button
                type="button"
                className={styles.avatar}
                onClick={() => setAccountOpen((o) => !o)}
                aria-expanded={accountOpen}
                aria-haspopup="menu"
                aria-label={t("account")}
              >
                {initial}
              </button>
              {accountOpen && (
                <>
                  <div className={styles.backdrop} onClick={() => setAccountOpen(false)} />
                  <div className={styles.dropdown} role="menu">
                    <p className={styles.who}>
                      <span>{user.email}</span>
                      {credits !== null && <strong>{t("creditsLeft", { count: credits })}</strong>}
                    </p>
                    <Link href="/my-songs" role="menuitem">{tc("mySongs")}</Link>
                    <Link href="/profile" role="menuitem">{tc("profile")}</Link>
                    <Link href="/pricing" role="menuitem">{t("buyCredits")}</Link>
                    <button type="button" role="menuitem" onClick={logout} className={styles.logout}>
                      {tc("logout")}
                    </button>
                  </div>
                </>
              )}
            </div>
          ) : (
            <Link href="/auth/login" className={styles.login}>
              {tc("login")}
            </Link>
          )}

          <div className={styles.desktopOnly}>{langs}</div>

          <button
            type="button"
            className={styles.burger}
            onClick={() => setMenuOpen((o) => !o)}
            aria-expanded={menuOpen}
            aria-label={t("menu")}
          >
            <span />
            <span />
            <span />
          </button>
        </div>
      </div>

      {menuOpen && (
        <div className={styles.mobileMenu}>
          <nav className={styles.mobileNav}>
            <Link href="/create">{t("navCta")}</Link>
            {navLinks}
            {user && <Link href="/my-songs">{tc("mySongs")}</Link>}
          </nav>
          {langs}
        </div>
      )}
    </header>
  );
}
