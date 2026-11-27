import { emailLayout, escapeHtml, tipBox, type EmailLang } from "./layout";

type GiftReadyEmailProps = {
  childName: string;
  totalSongs: number;
  deliveryUrl: string;
  lang: EmailLang;
};

const translations = {
  es: {
    subject: (n: string) => `🎁 El álbum de ${n} está listo`,
    preheader: (n: string, k: number) => `${k} canciones con el nombre de ${n}, listas para regalar.`,
    eyebrow: "Tu regalo está listo",
    heading: (n: string) => `El álbum de ${n} está listo`,
    body: (n: string, k: number) => [
      `Terminamos ${k} canciones originales, todas con el nombre de ${escapeHtml(n)}. Para dormir, para aprender y para bailar.`,
      "Ábrelo, escúchalo y, cuando quieras, compártelo con la familia.",
    ],
    cta: "Abrir el álbum",
    note: "El enlace funciona sin cuenta: puedes enviarlo tal cual.",
    tipTitle: "Para entregarlo",
    tips: [
      "💌 Mándalo por WhatsApp con una nota tuya.",
      "🎈 O ábrelo en voz alta en el baby shower: siempre hay lágrimas.",
    ],
  },
  en: {
    subject: (n: string) => `🎁 ${n}'s album is ready`,
    preheader: (n: string, k: number) => `${k} songs with ${n}'s name, ready to give.`,
    eyebrow: "Your gift is ready",
    heading: (n: string) => `${n}'s album is ready`,
    body: (n: string, k: number) => [
      `We finished ${k} original songs, every one with ${escapeHtml(n)}'s name. For sleeping, learning and dancing.`,
      "Open it, listen, and share it with the family whenever you like.",
    ],
    cta: "Open the album",
    note: "The link works without an account, so you can send it as is.",
    tipTitle: "To give it",
    tips: [
      "💌 Send it by text with a note of your own.",
      "🎈 Or play it out loud at the baby shower — there are always happy tears.",
    ],
  },
};

export function getGiftReadySubject(childName: string, lang: EmailLang) {
  return translations[lang].subject(childName);
}

export function giftReadyEmail({ childName, totalSongs, deliveryUrl, lang }: GiftReadyEmailProps): string {
  const t = translations[lang];
  return emailLayout({
    lang,
    title: t.subject(childName),
    preheader: t.preheader(childName, totalSongs),
    image: { src: "/emails/regalo.png", width: 150 },
    eyebrow: t.eyebrow,
    heading: t.heading(childName),
    paragraphs: t.body(childName, totalSongs),
    cta: { label: t.cta, href: deliveryUrl },
    note: t.note,
    extra: tipBox(t.tipTitle, t.tips),
  });
}
