import { emailLayout, escapeHtml, tipBox, type EmailLang } from "./layout";

const translations = {
  es: {
    subject: (n: string) => `🎁 Tu regalo para ${n} está listo para entregar`,
    preheader: "Comparte el enlace y la familia crea las canciones con sus propios detalles.",
    eyebrow: "Regalo listo",
    heading: (n: string) => `Un regalo musical para ${n}`,
    body: (n: string) => [
      `Este enlace le permite a la familia de ${escapeHtml(n)} crear sus canciones con el nombre y los detalles que solo ellos conocen.`,
      "Cópialo y mándalo como quieras: por WhatsApp, en una tarjeta o en el baby shower.",
    ],
    cta: "Ver el enlace del regalo",
    note: "El enlace es único: compártelo solo con quien recibe el regalo.",
    tipTitle: "Cómo funciona",
    tips: [
      "1. Abren el enlace y crean su cuenta.",
      "2. Escriben el nombre y lo que le encanta al bebé.",
      "3. En 2 minutos tienen su canción. 🎶",
    ],
  },
  en: {
    subject: (n: string) => `🎁 Your gift for ${n} is ready to give`,
    preheader: "Share the link and the family creates the songs with their own details.",
    eyebrow: "Gift ready",
    heading: (n: string) => `A musical gift for ${n}`,
    body: (n: string) => [
      `This link lets ${escapeHtml(n)}'s family create their songs with the name and the little details only they know.`,
      "Copy it and send it however you like: by text, in a card or at the baby shower.",
    ],
    cta: "See the gift link",
    note: "The link is unique, so share it only with the person receiving the gift.",
    tipTitle: "How it works",
    tips: [
      "1. They open the link and create an account.",
      "2. They write the baby's name and what they love.",
      "3. Two minutes later, the song is ready. 🎶",
    ],
  },
};

export function getGiftCodeSubject(childName: string, lang: EmailLang) {
  return translations[lang].subject(childName);
}

export function giftCodeEmail({ childName, redeemUrl, lang }: { childName: string; redeemUrl: string; lang: EmailLang }) {
  const t = translations[lang];
  return emailLayout({
    lang,
    title: t.subject(childName),
    preheader: t.preheader,
    image: { src: "/emails/regalo.png", width: 150 },
    eyebrow: t.eyebrow,
    heading: t.heading(childName),
    paragraphs: t.body(childName),
    cta: { label: t.cta, href: redeemUrl },
    note: t.note,
    extra: tipBox(t.tipTitle, t.tips),
  });
}
