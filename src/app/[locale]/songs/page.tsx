import { createClient } from "@/lib/supabase/server";
import { useTranslations } from "next-intl";
import SongCatalog from "./SongCatalog";
import type { Song, Category } from "@/types/database";

export const metadata = {
  title: "Songs",
};

export default async function SongsPage() {
  const supabase = await createClient();

  const [songsResult, categoriesResult, userResult] = await Promise.all([
    supabase
      .from("songs")
      .select("*, category:categories(*)")
      .order("created_at", { ascending: false }),
    supabase.from("categories").select("*").order("name"),
    supabase.auth.getUser(),
  ]);

  const songs = (songsResult.data as Song[]) ?? [];
  const categories = (categoriesResult.data as Category[]) ?? [];

  let isPremiumUser = false;
  if (userResult.data.user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("subscription_tier")
      .eq("id", userResult.data.user.id)
      .single();
    isPremiumUser = profile?.subscription_tier === "premium";
  }

  return <SongCatalog songs={songs} categories={categories} isPremiumUser={isPremiumUser} />;
}
