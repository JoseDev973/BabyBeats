"use client";

import { useRef, useState, type FormEvent } from "react";
import { CheckCircle2, Mail, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { SUPPORT_EMAIL_MAX_LENGTH, SUPPORT_MESSAGE_MAX_LENGTH } from "@/lib/support-limits";

type Status = "idle" | "sending" | "sent" | "invalid" | "failed" | "limited";

export default function SupportWidget() {
  const t = useTranslations("support");
  const dialog = useRef<HTMLDialogElement>(null);
  const [status, setStatus] = useState<Status>("idle");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");

  async function send(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (status === "sending") return;
    if (!message.trim()) {
      setStatus("invalid");
      return;
    }
    setStatus("sending");
    try {
      const response = await fetch("/api/support", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, message }),
      });
      if (response.status === 204) setStatus("sent");
      else if (response.status === 429) setStatus("limited");
      else if (response.status === 400) setStatus("invalid");
      else setStatus("failed");
    } catch {
      setStatus("failed");
    }
  }

  function handleClose() {
    if (status === "sent") {
      setMessage("");
      setEmail("");
      setStatus("idle");
    }
  }

  return (
    <>
      <button type="button" aria-haspopup="dialog" onClick={() => dialog.current?.showModal()}
        className="fixed right-0 bottom-[calc(5.5rem+env(safe-area-inset-bottom))] z-20 inline-flex min-h-11 items-center gap-2 rounded-l-full border border-r-0 bg-card py-2 pr-3 pl-4 text-sm font-bold text-primary shadow-md hover:bg-secondary sm:right-5 sm:rounded-full sm:border-r sm:px-4">
        <Mail size={17} aria-hidden="true" />{t("button")}
      </button>
      <dialog ref={dialog} onClose={handleClose} aria-labelledby="support-title"
        className="fixed inset-0 m-auto max-h-[90dvh] w-[min(26rem,calc(100%-2rem))] overflow-y-auto rounded-3xl border bg-card p-6 text-foreground shadow-xl backdrop:bg-foreground/40 sm:p-8">
        <div className="flex items-center justify-between gap-3">
          <h2 id="support-title" className="text-2xl">{t("title")}</h2>
          <button type="button" aria-label={t("close")} onClick={() => dialog.current?.close()}
            className="grid size-11 shrink-0 place-items-center rounded-full text-muted-foreground hover:bg-muted">
            <X size={20} aria-hidden="true" />
          </button>
        </div>
        {status === "sent" ? (
          <div role="status" className="mt-4 flex items-start gap-3">
            <CheckCircle2 className="mt-0.5 shrink-0 text-primary" size={20} aria-hidden="true" />
            <p className="break-words">{t("sent", { email: email.trim() })}</p>
          </div>
        ) : (
          <form onSubmit={send} className="mt-2 grid gap-4">
            <p className="text-sm text-muted-foreground">{t("intro")}</p>
            <label className="grid gap-1 text-sm font-bold">{t("email")}
              <input type="email" autoComplete="email" required maxLength={SUPPORT_EMAIL_MAX_LENGTH}
                value={email} onChange={e => setEmail(e.target.value)} readOnly={status === "sending"}
                className="rounded-xl border bg-background px-3 py-2 text-base font-normal focus:outline-primary" />
            </label>
            <label className="grid gap-1 text-sm font-bold">{t("message")}
              <textarea required rows={4} maxLength={SUPPORT_MESSAGE_MAX_LENGTH}
                value={message} onChange={e => setMessage(e.target.value)} readOnly={status === "sending"}
                className="resize-y rounded-xl border bg-background px-3 py-2 text-base font-normal focus:outline-primary" />
            </label>
            {(status === "failed" || status === "limited" || status === "invalid") && (
              <p role="alert" className="text-sm text-destructive">{t(status)}</p>
            )}
            <button type="submit" disabled={status === "sending"}
              className="min-h-11 rounded-full bg-primary px-5 py-2 font-bold text-primary-foreground disabled:opacity-60">
              {t(status === "sending" ? "sending" : "send")}
            </button>
          </form>
        )}
      </dialog>
    </>
  );
}
