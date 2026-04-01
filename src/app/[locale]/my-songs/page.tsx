import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import MySongsList from "./MySongsList";
import type { GeneratedSong } from "@/types/database";

export const metadata = {
  title: "My Songs",
  description:
    "View and manage all the personalized songs you have created for your baby.",
};

export default async function MySongsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  const { data: songs } = await supabase
    .from("generated_songs")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  const { data: profile } = await supabase
    .from("profiles")
    .select("credits")
    .eq("id", user.id)
    .single();

  return (
    <MySongsList
      songs={(songs as GeneratedSong[]) ?? []}
      credits={profile?.credits ?? 0}
    />
  );
}
