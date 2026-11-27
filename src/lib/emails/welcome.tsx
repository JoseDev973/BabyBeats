import { appUrl, emailLayout, tipBox, type EmailLang } from "./layout";

type WelcomeEmailProps = {
  displayName: string | null;
  lang: EmailLang;
};

const translations = {
  es: {
    subject: "Te damos la bienvenida a BabyBeats 💜",
    preheader: "Tu primera canción es gratis y está a 2 minutos.",
    heading: (name: string | null) => (name ? `¡Hola, ${name}!` : "¡Hola!"),
    body: [
      "Qué alegría tenerte aquí. En BabyBeats hacemos canciones originales con el nombre de tu bebé: para dormir, para aprender y para jugar.",
      "Tu <strong>primera canción es gratis</strong>. Solo necesitas su nombre y un par de detalles: lo que le encanta, cómo le dicen en casa, su peluche favorito.",
    ],
    cta: "Crear su primera canción",
    note: "Tarda unos 2 minutos.",
    tipTitle: "Un secreto",
    tips: [
      "Mientras más detalles nos cuentes, más suya suena la canción. ✨",
    ],
  },
  en: {
    subject: "Welcome to BabyBeats 💜",
    preheader: "Your first song is free and two minutes away.",
    heading: (name: string | null) => (name ? `Hi, ${name}!` : "Hi there!"),
    body: [
      "We're so happy you're here. BabyBeats makes original songs with your baby's name: for sleeping, learning and playing.",
      "Your <strong>first song is free</strong>. All we need is their name and a few details: what they love, their nickname at home, their favorite plush.",
    ],
    cta: "Create their first song",
    note: "It takes about 2 minutes.",
    tipTitle: "A little secret",
    tips: [
      "The more details you share, the more the song sounds like them. ✨",
    ],
  },
};

export function getWelcomeSubject(lang: EmailLang) {
  return translations[lang].subject;
}

export function welcomeEmail({ displayName, lang }: WelcomeEmailProps): string {
  const t = translations[lang];
  return emailLayout({
    lang,
    title: t.subject,
    preheader: t.preheader,
    image: { src: "/emails/caja-musical.png", width: 170 },
    heading: t.heading(displayName),
    paragraphs: t.body,
    cta: { label: t.cta, href: `${appUrl()}/${lang}/create` },
    note: t.note,
    extra: tipBox(t.tipTitle, t.tips),
  });
}

