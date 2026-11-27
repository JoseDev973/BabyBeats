import { emailLayout, escapeHtml, tipBox, type EmailLang } from "./layout";

type SongReadyEmailProps = {
  childName: string;
  songUrl: string;
  lang: EmailLang;
  coverUrl?: string | null;
};

const translations = {
  es: {
    subject: (n: string) => `🎶 La canción de ${n} está lista`,
    preheader: (n: string) => `Dale play: suena su nombre. La hicimos pensando en ${n}.`,
    eyebrow: "Tu canción está lista",
    heading: (n: string) => `${n} ya tiene su canción`,
    body: (n: string) => [
      `La escribimos con su nombre y con lo que nos contaste. Es solo de ${escapeHtml(n)}: no hay otra igual en el mundo.`,
      "Te dejamos dos versiones para que elijas tu favorita.",
    ],
    cta: (n: string) => `Escuchar la canción de ${n}`,
    note: "Puedes descargarla y guardarla para siempre.",
    tipTitle: "Para estrenarla",
    tips: (n: string) => [
      `🌙 Ponla esta noche en la rutina de dormir de ${escapeHtml(n)}.`,
      "💌 Mándasela a los abuelos: el enlace funciona sin cuenta.",
    ],
  },
  en: {
    subject: (n: string) => `🎶 ${n}'s song is ready`,
    preheader: (n: string) => `Press play and hear their name. We made it just for ${n}.`,
    eyebrow: "Your song is ready",
    heading: (n: string) => `${n} has their own song`,
    body: (n: string) => [
      `We wrote it with their name and the little details you shared. It belongs to ${escapeHtml(n)} — there's no other like it.`,
      "We made two versions so you can pick your favorite.",
    ],
    cta: (n: string) => `Listen to ${n}'s song`,
    note: "You can download it and keep it forever.",
    tipTitle: "To debut it",
    tips: (n: string) => [
      `🌙 Play it tonight in ${escapeHtml(n)}'s bedtime routine.`,
      "💌 Send it to the grandparents — the link works without an account.",
    ],
  },
};

export function getSongReadySubject(childName: string, lang: EmailLang) {
  return translations[lang].subject(childName);
}

export function songReadyEmail({ childName, songUrl, lang, coverUrl }: SongReadyEmailProps): string {
  const t = translations[lang];
  return emailLayout({
    lang,
    title: t.subject(childName),
    preheader: t.preheader(childName),
    image: coverUrl ? { src: coverUrl, width: 220, rounded: true } : { src: "/emails/luna.png", width: 180 },
    eyebrow: t.eyebrow,
    heading: t.heading(childName),
    paragraphs: t.body(childName),
    cta: { label: t.cta(childName), href: songUrl },
    note: t.note,
    extra: tipBox(t.tipTitle, t.tips(childName)),
  });
}
