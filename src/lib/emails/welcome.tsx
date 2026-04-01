type WelcomeEmailProps = {
  displayName: string | null;
  lang: "es" | "en";
};

const translations = {
  es: {
    subject: "Bienvenido/a a BabyBeats!",
    preheader: "Crea canciones personalizadas para los mas pequenos.",
    greeting: (name: string | null) =>
      name ? `Hola ${name}!` : "Hola!",
    welcome: "Bienvenido/a a BabyBeats",
    body1:
      "Estamos encantados de que te unas a nuestra comunidad de familias que crean musica personalizada para sus pequenos.",
    body2:
      "Con BabyBeats puedes crear canciones unicas con el nombre de tu hijo/a, perfectas para dormir, aprender o simplemente divertirse.",
    whatYouCanDo: "Que puedes hacer:",
    feature1: "Crear canciones personalizadas con el nombre de tu bebe",
    feature2: "Elegir entre nanas, canciones educativas y divertidas",
    feature3: "Regalar albums personalizados a familiares y amigos",
    cta: "Crear mi primera cancion",
    footer:
      "Hecho con amor por BabyBeats - Canciones personalizadas para los mas pequenos.",
    noReply: "Este es un correo automatico, por favor no respondas.",
  },
  en: {
    subject: "Welcome to BabyBeats!",
    preheader: "Create personalized songs for your little ones.",
    greeting: (name: string | null) =>
      name ? `Hi ${name}!` : "Hi there!",
    welcome: "Welcome to BabyBeats",
    body1:
      "We're thrilled to have you join our community of families creating personalized music for their little ones.",
    body2:
      "With BabyBeats you can create unique songs featuring your child's name, perfect for bedtime, learning, or just having fun.",
    whatYouCanDo: "What you can do:",
    feature1: "Create personalized songs with your baby's name",
    feature2: "Choose between lullabies, educational, and fun songs",
    feature3: "Gift personalized albums to family and friends",
    cta: "Create my first song",
    footer:
      "Made with love by BabyBeats - Personalized songs for little ones.",
    noReply: "This is an automated email, please do not reply.",
  },
};

export function getWelcomeSubject(lang: "es" | "en") {
  return translations[lang].subject;
}

export function welcomeEmail({ displayName, lang }: WelcomeEmailProps): string {
  const t = translations[lang];
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://babybeats.art";

  return `<!DOCTYPE html>
<html lang="${lang}">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${t.subject}</title>
</head>
<body style="margin:0;padding:0;background-color:#faf5ff;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;">
  <!-- Preheader -->
  <div style="display:none;max-height:0;overflow:hidden;">${t.preheader}</div>

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
              <h2 style="margin:0 0 8px;color:#4c1d95;font-size:20px;font-weight:700;">
                ${t.greeting(displayName)}
              </h2>
              <h3 style="margin:0 0 20px;color:#6d28d9;font-size:18px;font-weight:600;">
                ${t.welcome}
              </h3>

              <p style="margin:0 0 12px;color:#6b7280;font-size:15px;line-height:1.6;">
                ${t.body1}
              </p>
              <p style="margin:0 0 24px;color:#6b7280;font-size:15px;line-height:1.6;">
                ${t.body2}
              </p>

              <!-- Features -->
              <div style="background-color:#f5f3ff;border-radius:12px;padding:20px 24px;margin-bottom:28px;">
                <p style="margin:0 0 12px;color:#4c1d95;font-size:14px;font-weight:700;">
                  ${t.whatYouCanDo}
                </p>
                <p style="margin:0 0 8px;color:#6b7280;font-size:14px;">&#127926; ${t.feature1}</p>
                <p style="margin:0 0 8px;color:#6b7280;font-size:14px;">&#127769; ${t.feature2}</p>
                <p style="margin:0;color:#6b7280;font-size:14px;">&#127873; ${t.feature3}</p>
              </div>

              <!-- CTA Button -->
              <div style="text-align:center;margin:32px 0 8px;">
                <a href="${appUrl}/create"
                   style="display:inline-block;background:linear-gradient(135deg,#7c3aed,#a78bfa);color:#ffffff;text-decoration:none;font-size:17px;font-weight:700;padding:14px 40px;border-radius:999px;box-shadow:0 4px 14px rgba(124,58,237,0.35);">
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
