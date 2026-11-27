import { getLocale } from "next-intl/server";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import ResetPasswordForm from "./ResetPasswordForm";

export default async function ResetPasswordPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/${await getLocale()}/auth/login?error=auth_failed`);
  return <ResetPasswordForm />;
}
