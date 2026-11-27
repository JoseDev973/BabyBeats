"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/routing";
import { createClient } from "@/lib/supabase/client";

export default function ResetPasswordForm() {
  const t = useTranslations("auth");
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function updatePassword(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const fields = new FormData(event.currentTarget);
    const password = String(fields.get("password"));
    if (password !== fields.get("confirmation")) {
      setError(t("passwordsMismatch"));
      return;
    }
    setError("");
    setSaving(true);
    try {
      const { error } = await createClient().auth.updateUser({ password });
      if (error) setError(error.message);
      else router.replace("/profile");
    } catch {
      setError(t("requestFailed"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={updatePassword} className="mx-auto my-16 max-w-md space-y-5 rounded-xl border border-border bg-card p-6">
      <h1 className="text-2xl font-bold">{t("setPassword")}</h1>
      <label className="block text-sm font-medium">
        {t("password")}
        <input name="password" type="password" autoComplete="new-password" required minLength={6} className="mt-1 block w-full rounded-lg border border-input px-3 py-2" />
      </label>
      <label className="block text-sm font-medium">
        {t("confirmPassword")}
        <input name="confirmation" type="password" autoComplete="new-password" required minLength={6} className="mt-1 block w-full rounded-lg border border-input px-3 py-2" />
      </label>
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      <button type="submit" disabled={saving} className="w-full rounded-lg bg-primary px-4 py-2 font-medium text-primary-foreground disabled:opacity-50">
        {t("setPassword")}
      </button>
    </form>
  );
}
