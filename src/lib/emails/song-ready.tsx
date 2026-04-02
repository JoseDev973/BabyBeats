type SongReadyEmailProps = {
  childName: string;
  songUrl: string;
  lang: "es" | "en";
};

const translations = {
  es: {
    subject: (childName: string) =>
      `La cancion de ${childName} esta lista!`,
    preheader: (childName: string) =>
      `La cancion personalizada de ${childName} esta lista para escuchar.`,
    heading: (childName: string) =>
      `La cancion de ${childName} esta lista!`,
    body: "Hemos terminado de crear tu cancion personalizada llena de amor y magia musical.",
    cta: "Escuchar ahora",
    footer:
      "Hecho con amor por BabyBeats - Canciones personalizadas para los mas pequenos.",
    noReply: "Este es un correo automatico, por favor no respondas.",
  },
  en: {
    subject: (childName: string) =>
      `${childName}'s song is ready!`,
    preheader: (childName: string) =>
      `${childName}'s personalized song is ready to listen.`,
    heading: (childName: string) =>
      `${childName}'s song is ready!`,
    body: "We've finished creating your personalized song filled with love and musical magic.",
    cta: "Listen Now",
    footer:
      "Made with love by BabyBeats - Personalized songs for little ones.",
    noReply: "This is an automated email, please do not reply.",
  },
};

export function getSongReadySubject(childName: string, lang: "es" | "en") {
  return translations[lang].subject(childName);
}

export function songReadyEmail({
  childName,
  songUrl,
  lang,
}: SongReadyEmailProps): string {
  const t = translations[lang];

  return `<!DOCTYPE html>
<html lang="${lang}">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${t.subject(childName)}</title>
</head>
<body style="margin:0;padding:0;background-color:#faf5ff;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;">
  <!-- Preheader -->
  <div style="display:none;max-height:0;overflow:hidden;">${t.preheader(childName)}</div>

  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#faf5ff;">
    <tr>
      <td align="center" style="padding:40px 20px;">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(128,90,213,0.12);">

          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#7c3aed,#a78bfa,#c084fc);padding:40px 40px 30px;text-align:center;">
              <div style="font-size:32px;margin-bottom:8px;">&#127925;</div>
              <h1 style="margin:0;color:#ffffff;font-size:24px;font-weight:700;letter-spacing:-0.5px;">BabyBeats</h1>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:40px;">
              <h2 style="margin:0 0 16px;color:#4c1d95;font-size:22px;font-weight:700;text-align:center;">
                ${t.heading(childName)}
              </h2>

              <p style="margin:0 0 8px;color:#6b7280;font-size:16px;line-height:1.6;text-align:center;">
                ${t.body}
              </p>

              <!-- CTA Button -->
              <div style="text-align:center;margin:32px 0;">
                <a href="${songUrl}"
                   style="display:inline-block;background:linear-gradient(135deg,#7c3aed,#a78bfa);color:#ffffff;text-decoration:none;font-size:18px;font-weight:700;padding:16px 48px;border-radius:999px;box-shadow:0 4px 14px rgba(124,58,237,0.35);">
                  ${t.cta}
                </a>
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color:#f5f3ff;padding:24px 40px;text-align:center;border-top:1px solid #ede9fe;">
              <p style="margin:0 0 4px;color:#8b5cf6;font-size:13px;font-weight:600;">
                &#127925; BabyBeats
              </p>
              <p style="margin:0 0 8px;color:#9ca3af;font-size:12px;">
                ${t.footer}
              </p>
              <p style="margin:0;color:#d1d5db;font-size:11px;">
                ${t.noReply}
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
