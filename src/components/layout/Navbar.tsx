"use client";

import { useEffect, useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import { Link, useRouter, usePathname } from "@/i18n/routing";
import { createClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";
import { Music, Menu, X, LogOut, User as UserIcon, Sparkles, Gift, Coins, Sun, Moon } from "lucide-react";

export default function Navbar() {
  const t = useTranslations("common");
  const tg = useTranslations("gift");
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<User | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("theme");
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const dark = stored === "dark" || (!stored && prefersDark);
    setIsDark(dark);
    document.documentElement.classList.toggle("dark", dark);
  }, []);

  function toggleTheme() {
    const next = !isDark;
    setIsDark(next);
    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem("theme", next ? "dark" : "light");
  }

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => setUser(data.user));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    setDropdownOpen(false);
    router.push("/");
    router.refresh();
  }

  return (
    <nav className="border-b border-border bg-card/90 backdrop-blur-lg sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex h-16 items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <Music className="h-6 w-6 text-primary" />
          <span className="text-xl font-extrabold tracking-tight">{t("appName")}</span>
        </Link>

        {/* Desktop nav */}
        <div className="hidden sm:flex items-center gap-6">
          <Link href="/create" className="text-sm font-medium text-primary hover:text-primary/80 transition-colors flex items-center gap-1">
            <Sparkles className="h-3.5 w-3.5" />{t("create")}
          </Link>
          <Link href="/songs" className="text-sm text-muted-foreground hover:text-foreground transition-colors">{t("songs")}</Link>
          <Link href="/gift" className="text-sm font-medium text-accent-foreground hover:text-foreground transition-colors flex items-center gap-1">
            <Gift className="h-3.5 w-3.5" />{tg("nav")}
          </Link>
          {!user && (
            <Link href="/pricing" className="text-sm text-muted-foreground hover:text-foreground transition-colors">{t("pricing")}</Link>
          )}

          <button onClick={toggleTheme} className="p-2 rounded-full hover:bg-muted transition-colors text-muted-foreground hover:text-foreground" aria-label="Toggle theme">
            {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>

          <div className="flex items-center bg-muted rounded-full p-0.5 text-xs font-bold">
            <button onClick={() => locale !== "es" && router.replace(pathname, { locale: "es" })} className={`px-2.5 py-1 rounded-full transition-all ${locale === "es" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>ES</button>
            <button onClick={() => locale !== "en" && router.replace(pathname, { locale: "en" })} className={`px-2.5 py-1 rounded-full transition-all ${locale === "en" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>EN</button>
          </div>

          {user ? (
            <div className="relative">
              <button onClick={() => setDropdownOpen(!dropdownOpen)} className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary hover:bg-primary/20 transition-colors">
                <UserIcon className="h-4 w-4" />
              </button>
              {dropdownOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setDropdownOpen(false)} />
                  <div className="absolute right-0 top-full mt-2 w-48 bg-card border border-border rounded-xl shadow-lg py-1 z-50">
                    <Link href="/my-songs" className="flex items-center gap-2 px-4 py-2.5 text-sm hover:bg-muted transition-colors" onClick={() => setDropdownOpen(false)}>
                      <Music className="h-4 w-4 text-muted-foreground" />{t("mySongs")}
                    </Link>
                    <Link href="/profile" className="flex items-center gap-2 px-4 py-2.5 text-sm hover:bg-muted transition-colors" onClick={() => setDropdownOpen(false)}>
                      <UserIcon className="h-4 w-4 text-muted-foreground" />{t("profile")}
                    </Link>
                    <Link href="/pricing" className="flex items-center gap-2 px-4 py-2.5 text-sm hover:bg-muted transition-colors" onClick={() => setDropdownOpen(false)}>
                      <Coins className="h-4 w-4 text-muted-foreground" />{t("pricing")}
                    </Link>
                    <hr className="my-1 border-border" />
                    <button onClick={handleLogout} className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-destructive hover:bg-muted transition-colors">
                      <LogOut className="h-4 w-4" />{t("logout")}
                    </button>
                  </div>
                </>
              )}
            </div>
          ) : (
            <Link href="/auth/login" className="text-sm font-semibold bg-primary text-primary-foreground px-4 py-2 rounded-xl hover:bg-primary/90 transition-all hover:shadow-md">{t("login")}</Link>
          )}
        </div>

        <button className="sm:hidden text-muted-foreground" onClick={() => setMenuOpen(!menuOpen)}>
          {menuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {menuOpen && (
        <div className="sm:hidden border-t border-border px-4 py-4 space-y-3 bg-background">
          <Link href="/create" className="block text-sm py-2 font-medium text-primary flex items-center gap-2" onClick={() => setMenuOpen(false)}>
            <Sparkles className="h-3.5 w-3.5" />{t("create")}
          </Link>
          <Link href="/songs" className="block text-sm py-2" onClick={() => setMenuOpen(false)}>{t("songs")}</Link>
          <Link href="/gift" className="block text-sm py-2 font-medium text-accent-foreground flex items-center gap-2" onClick={() => setMenuOpen(false)}>
            <Gift className="h-3.5 w-3.5" />{tg("nav")}
          </Link>
          <Link href="/pricing" className="block text-sm py-2" onClick={() => setMenuOpen(false)}>{t("pricing")}</Link>

          <div className="flex items-center gap-3">
            <button onClick={toggleTheme} className="p-2 rounded-full hover:bg-muted transition-colors text-muted-foreground" aria-label="Toggle theme">
              {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
            <div className="flex items-center bg-muted rounded-full p-0.5 text-xs font-bold">
              <button onClick={() => { if (locale !== "es") { router.replace(pathname, { locale: "es" }); setMenuOpen(false); } }} className={`px-3 py-1.5 rounded-full transition-all ${locale === "es" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>ES</button>
              <button onClick={() => { if (locale !== "en") { router.replace(pathname, { locale: "en" }); setMenuOpen(false); } }} className={`px-3 py-1.5 rounded-full transition-all ${locale === "en" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>EN</button>
            </div>
          </div>

          {user ? (
            <>
              <Link href="/my-songs" className="block text-sm py-2" onClick={() => setMenuOpen(false)}>{t("mySongs")}</Link>
              <Link href="/profile" className="block text-sm py-2" onClick={() => setMenuOpen(false)}>{t("profile")}</Link>
              <button onClick={() => { handleLogout(); setMenuOpen(false); }} className="block text-sm py-2 text-destructive">{t("logout")}</button>
            </>
          ) : (
            <Link href="/auth/login" className="block text-sm bg-primary text-primary-foreground px-4 py-2 rounded-lg text-center" onClick={() => setMenuOpen(false)}>{t("login")}</Link>
          )}
        </div>
      )}
    </nav>
  );
}
