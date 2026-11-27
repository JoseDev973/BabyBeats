import { emailHref, escapeHtml } from "./escape";

/** Brand colors from the website (globals.css) */
const C = {
  page: "#FFF8F0",
  card: "#FFFFFF",
  ink: "#2E2350",
  body: "#5B5277",
  muted: "#9A92B0",
  violet: "#5B4CA8",
  peach: "#FDE3C6",
  line: "#F1E6D6",
};
const FONT = "'Nunito','Quicksand','Helvetica Neue',Arial,sans-serif";

export function appUrl() {
  return (process.env.NEXT_PUBLIC_APP_URL || "https://babybeats.art").trim().replace(/\/+$/, "");
}

export type EmailLang = "es" | "en";

const footerText = {
  es: {
    signoff: "Con cariño,<br />el equipo de BabyBeats 💜",
    reply: "¿Una duda o una idea? Responde este correo: lo leemos nosotros.",
    tagline: "Canciones originales con el nombre de tu bebé",
    unsubscribe: "No quiero recibir más correos como este",
  },
  en: {
    signoff: "With love,<br />the BabyBeats team 💜",
    reply: "A question or an idea? Just reply to this email — real people read it.",
    tagline: "Original songs with your baby's name",
    unsubscribe: "Unsubscribe from emails like this",
  },
};

/** One illustration, a headline, a few paragraphs and one button, on the website's cream page. */
export function emailLayout(opts: {
  lang: EmailLang;
  title: string;
  preheader: string;
  image: { src: string; width: number; alt?: string; rounded?: boolean };
  eyebrow?: string;
  heading: string;
  paragraphs: string[];
  cta: { label: string; href: string };
  note?: string;
  extra?: string;
  unsubscribeUrl?: string;
}) {
  const f = footerText[opts.lang];
  const base = appUrl();
  const img = opts.image;
  const imgSrc = img.src.startsWith("http") ? img.src : `${base}${img.src}`;

  return `<!DOCTYPE html>
<html lang="${opts.lang}">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="color-scheme" content="light only" />
  <title>${escapeHtml(opts.title)}</title>
</head>
<body style="margin:0;padding:0;background-color:${C.page};font-family:${FONT};">
  <div style="display:none;max-height:0;overflow:hidden;">${escapeHtml(opts.preheader)}&#8199;&#65279;&#847;</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:${C.page};">
    <tr>
      <td align="center" style="padding:32px 16px 40px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;">
          <tr>
            <td align="center" style="padding:0 0 20px;">
              <a href="${base}" style="text-decoration:none;color:${C.violet};font-size:20px;font-weight:800;letter-spacing:-0.3px;">〰 BabyBeats</a>
            </td>
          </tr>
          <tr>
            <td style="background-color:${C.card};border-radius:24px;padding:40px 36px 36px;border:1px solid ${C.line};">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="padding:0 0 24px;">
                    <img src="${emailHref(imgSrc)}" width="${img.width}" alt="${escapeHtml(img.alt ?? "")}"
                      style="display:block;width:${img.width}px;max-width:100%;height:auto;border:0;${img.rounded ? "border-radius:20px;" : ""}" />
                  </td>
                </tr>
                ${opts.eyebrow ? `<tr><td align="center" style="padding:0 0 8px;color:${C.violet};font-size:13px;font-weight:700;letter-spacing:1px;text-transform:uppercase;">${escapeHtml(opts.eyebrow)}</td></tr>` : ""}
                <tr>
                  <td align="center" style="padding:0 0 16px;color:${C.ink};font-size:28px;line-height:1.2;font-weight:800;letter-spacing:-0.5px;">
                    ${escapeHtml(opts.heading)}
                  </td>
                </tr>
                ${opts.paragraphs.map((p) => `<tr><td align="center" style="padding:0 0 12px;color:${C.body};font-size:16px;line-height:1.6;">${p}</td></tr>`).join("")}
                <tr>
                  <td align="center" style="padding:20px 0 8px;">
                    <a href="${emailHref(opts.cta.href)}"
                      style="display:inline-block;background-color:${C.violet};color:#ffffff;text-decoration:none;font-size:17px;font-weight:800;padding:16px 36px;border-radius:999px;">
                      ${escapeHtml(opts.cta.label)}
                    </a>
                  </td>
                </tr>
                ${opts.note ? `<tr><td align="center" style="padding:4px 0 0;color:${C.muted};font-size:13px;line-height:1.5;">${opts.note}</td></tr>` : ""}
                ${opts.extra ? `<tr><td style="padding:28px 0 0;">${opts.extra}</td></tr>` : ""}
              </table>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding:28px 24px 0;color:${C.body};font-size:15px;line-height:1.6;">
              ${f.signoff}
            </td>
          </tr>
          <tr>
            <td align="center" style="padding:16px 24px 0;color:${C.muted};font-size:13px;line-height:1.5;">
              ${f.reply}<br />
              <a href="${base}" style="color:${C.muted};">babybeats.art</a> · ${f.tagline}
              ${opts.unsubscribeUrl ? `<br /><a href="${emailHref(opts.unsubscribeUrl)}" style="color:${C.muted};">${f.unsubscribe}</a>` : ""}
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

/** Soft peach box for a tip or a short list */
export function tipBox(title: string, lines: string[]) {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:${C.peach};border-radius:16px;">
    <tr><td style="padding:20px 22px;">
      <div style="color:${C.ink};font-size:15px;font-weight:800;padding:0 0 6px;">${escapeHtml(title)}</div>
      ${lines.map((l) => `<div style="color:${C.ink};font-size:15px;line-height:1.6;">${l}</div>`).join("")}
    </td></tr>
  </table>`;
}

export { escapeHtml };
