import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import ProfileView from "./ProfileView";
import type { Profile, Song } from "@/types/database";

export const metadata = {
  title: "Profile",
};

export default async function ProfilePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  const [profileResult, favoritesResult, historyResult] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", user.id).single(),
    supabase
      .from("favorites")
      .select("song_id, songs:song_id(*, category:categories(*))")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(20),
    supabase
      .from("play_history")
      .select("played_at, songs:song_id(*, category:categories(*))")
      .eq("user_id", user.id)
      .order("played_at", { ascending: false })
      .limit(20),
  ]);

  const profile = profileResult.data as Profile | null;
  const favorites = (favoritesResult.data?.map((f: Record<string, unknown>) => f.songs).filter(Boolean) as Song[]) ?? [];
  const history = (historyResult.data?.map((h: Record<string, unknown>) => h.songs).filter(Boolean) as Song[]) ?? [];

  return (
    <ProfileView
      profile={profile}
      email={user.email ?? ""}
      favorites={favorites}
      history={history}
    />
  );
}
