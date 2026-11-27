import { appUrl, emailLayout, escapeHtml, tipBox, type EmailLang } from "./layout";

export type LifecycleKind = "gift_abandoned" | "no_song" | "free_song_no_purchase";

type Props = {
  kind: LifecycleKind;
  lang: EmailLang;
  childName?: string | null;
  /** Where the button goes (gift checkout to resume, create page…) */
  href?: string;
  unsubscribeUrl: string;
};

const copy = {
  gift_abandoned: {
    es: {
      subject: (n: string) => `Tu regalo para ${n} quedó a medio camino 🎁`,
      preheader: "Lo guardamos tal cual lo dejaste. Termínalo en un minuto.",
      eyebrow: "Tu regalo te espera",
      heading: (n: string) => `El álbum de ${n} sigue aquí`,
      body: (n: string) => [
        `Empezaste a armar un álbum de canciones para ${escapeHtml(n)} y no alcanzaste a terminar el pago. Lo guardamos tal cual lo dejaste.`,
        "Si algo falló o tienes una duda, responde este correo y te ayudamos.",
      ],
      cta: "Terminar mi regalo",
      note: "Puedes pagar con tarjeta o con Mercado Pago.",
    },
    en: {
      subject: (n: string) => `Your gift for ${n} is halfway there 🎁`,
      preheader: "We saved it just as you left it. Finish in a minute.",
      eyebrow: "Your gift is waiting",
      heading: (n: string) => `${n}'s album is still here`,
      body: (n: string) => [
        `You started an album of songs for ${escapeHtml(n)} but didn't finish checking out. We saved it just as you left it.`,
        "If something went wrong or you have a question, just reply to this email.",
      ],
      cta: "Finish my gift",
      note: "Pay by card in a minute.",
    },
  },
  no_song: {
    es: {
      subject: () => "Tu canción gratis te está esperando 🎶",
      preheader: "Solo necesitas su nombre y 2 minutos.",
      eyebrow: "Tu primera canción es gratis",
      heading: () => "¿Cómo se llama tu bebé?",
      body: () => [
        "Te registraste en BabyBeats pero todavía no has creado tu canción. Es gratis y toma unos 2 minutos.",
        "Escribe su nombre, cuéntanos qué le encanta y elige si es para dormir, aprender o jugar. Nosotros hacemos el resto.",
      ],
      cta: "Crear su canción gratis",
      note: "Sin tarjeta.",
      tipTitle: "Ideas para contarnos",
      tips: ["🧸 Su peluche favorito", "🐶 El nombre de su mascota", "💛 Cómo le dicen en casa"],
    },
    en: {
      subject: () => "Your free song is waiting 🎶",
      preheader: "All it takes is their name and 2 minutes.",
      eyebrow: "Your first song is free",
      heading: () => "What's your baby's name?",
      body: () => [
        "You signed up for BabyBeats but haven't made your song yet. It's free and takes about 2 minutes.",
        "Write their name, tell us what they love and pick sleep, learn or play. We do the rest.",
      ],
      cta: "Create their free song",
      note: "No card needed.",
      tipTitle: "Ideas to share",
      tips: ["🧸 Their favorite plush", "🐶 Their pet's name", "💛 Their nickname at home"],
    },
  },
  free_song_no_purchase: {
    es: {
      subject: (n: string) => `¿Y si ${n} tuviera una para cada momento? 🌙`,
      preheader: "Una para dormir, otra para aprender, otra para bailar.",
      eyebrow: "Más canciones",
      heading: (n: string) => `Una canción para cada momento de ${n}`,
      body: (n: string) => [
        `Ya tienes la primera canción de ${escapeHtml(n)}. Muchas familias arman su colección: una de cuna para la noche, una para aprender los números y otra para bailar en la mañana.`,
        "También puedes regalarle un álbum a otro bebé de la familia.",
      ],
      cta: "Crear otra canción",
      note: "Paquetes desde 3 canciones.",
      tipTitle: "Ideas para la próxima",
      tips: ["🌙 Una de cuna para la rutina de dormir", "🔢 Una para aprender colores o números", "🎁 Un álbum para un baby shower"],
    },
    en: {
      subject: (n: string) => `What if ${n} had one for every moment? 🌙`,
      preheader: "One for sleep, one for learning, one for dancing.",
      eyebrow: "More songs",
      heading: (n: string) => `A song for every moment of ${n}'s day`,
      body: (n: string) => [
        `You already have ${escapeHtml(n)}'s first song. Many families build a little collection: a lullaby for bedtime, one to learn numbers and one to dance to in the morning.`,
        "You can also give an album to another baby in the family.",
      ],
      cta: "Create another song",
      note: "Packs start at 3 songs.",
      tipTitle: "Ideas for the next one",
      tips: ["🌙 A lullaby for bedtime", "🔢 One to learn colors or numbers", "🎁 An album for a baby shower"],
    },
  },
} as const;

const images: Record<LifecycleKind, { src: string; width: number }> = {
  gift_abandoned: { src: "/emails/regalo.png", width: 150 },
  no_song: { src: "/emails/caja-musical.png", width: 170 },
  free_song_no_purchase: { src: "/emails/luna.png", width: 180 },
};

export function lifecycleEmail({ kind, lang, childName, href, unsubscribeUrl }: Props) {
  const t = copy[kind][lang];
  const name = childName?.trim() || (lang === "en" ? "your baby" : "tu bebé");
  const tips = "tips" in t ? tipBox(t.tipTitle, [...t.tips]) : undefined;
  return {
    subject: t.subject(name),
    html: emailLayout({
      lang,
      title: t.subject(name),
      preheader: t.preheader,
      image: images[kind],
      eyebrow: t.eyebrow,
      heading: t.heading(name),
      paragraphs: [...t.body(name)],
      cta: { label: t.cta, href: href ?? `${appUrl()}/${lang}/create` },
      note: t.note,
      extra: tips,
      unsubscribeUrl,
    }),
  };
}
