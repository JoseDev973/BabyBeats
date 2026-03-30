"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Link, useRouter, usePathname } from "@/i18n/routing";
import { createClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";
import { Music, Menu, X, Globe, LogOut, User as UserIcon, Sparkles } from "lucide-react";

export default function Navbar() {
  const t = useTranslations("common");
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<User | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => setUser(data.user));

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }

  function switchLocale(locale: "en" | "es") {
    router.replace(pathname, { locale });
  }

  return (
    <nav className="border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex h-16 items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <Music className="h-6 w-6 text-primary" />
          <span className="text-xl font-bold">{t("appName")}</span>
        </Link>

        {/* Desktop nav */}
        <div className="hidden sm:flex items-center gap-6">
          <Link
            href="/create"
            className="text-sm font-medium text-primary hover:text-primary/80 transition-colors flex items-center gap-1"
          >
            <Sparkles className="h-3.5 w-3.5" />
            Create
          </Link>
          <Link
            href="/songs"
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            {t("songs")}
          </Link>
          <Link
            href="/pricing"
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            {t("pricing")}
          </Link>

          <button
            onClick={() => switchLocale(pathname ? "en" : "es")}
            className="text-muted-foreground hover:text-foreground transition-colors"
            title="Switch language"
          >
            <Globe className="h-4 w-4" />
          </button>

          {user ? (
            <div className="flex items-center gap-3">
              <Link
                href="/profile"
                className="text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
              >
                <UserIcon className="h-4 w-4" />
                {t("profile")}
              </Link>
              <button
                onClick={handleLogout}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <Link
              href="/auth/login"
              className="text-sm bg-primary text-primary-foreground px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors"
            >
              {t("login")}
            </Link>
          )}
        </div>

        {/* Mobile menu button */}
        <button
          className="sm:hidden text-muted-foreground"
          onClick={() => setMenuOpen(!menuOpen)}
        >
          {menuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="sm:hidden border-t border-border px-4 py-4 space-y-3 bg-background">
          <Link
            href="/songs"
            className="block text-sm py-2"
            onClick={() => setMenuOpen(false)}
          >
            {t("songs")}
          </Link>
          <Link
            href="/pricing"
            className="block text-sm py-2"
            onClick={() => setMenuOpen(false)}
          >
            {t("pricing")}
          </Link>
          {user ? (
            <>
              <Link
                href="/my-songs"
                className="block text-sm py-2"
                onClick={() => setMenuOpen(false)}
              >
                My Songs
              </Link>
              <Link
                href="/profile"
                className="block text-sm py-2"
                onClick={() => setMenuOpen(false)}
              >
                {t("profile")}
              </Link>
              <button
                onClick={() => {
                  handleLogout();
                  setMenuOpen(false);
                }}
                className="block text-sm py-2 text-destructive"
              >
                {t("logout")}
              </button>
            </>
          ) : (
            <Link
              href="/auth/login"
              className="block text-sm bg-primary text-primary-foreground px-4 py-2 rounded-lg text-center"
              onClick={() => setMenuOpen(false)}
            >
              {t("login")}
            </Link>
          )}
        </div>
      )}
    </nav>
  );
}
