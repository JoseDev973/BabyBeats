import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import CreateWizard from "./CreateWizard";

export const metadata = {
  title: "Create a Song",
  description:
    "Create a personalized AI-generated song for your baby. Choose a theme, add your child's name, and get a unique tune in minutes.",
};

export default async function CreatePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("credits, total_songs_generated")
    .eq("id", user.id)
    .single();

  return (
    <CreateWizard
      credits={profile?.credits ?? 0}
      totalGenerated={profile?.total_songs_generated ?? 0}
    />
  );
}
