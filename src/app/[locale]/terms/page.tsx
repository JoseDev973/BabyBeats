import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service",
};

const CONTENT = {
  en: {
    title: "Terms of Service",
    lastUpdated: "Last updated: April 1, 2026",
    sections: [
      {
        heading: "1. Service Description",
        body: `BabyBeats is a platform that uses artificial intelligence to create personalized songs for babies and toddlers. Our service generates custom lyrics and audio based on information you provide, such as your child's name, preferred theme, and musical style.`,
      },
      {
        heading: "2. User Accounts",
        body: `To use BabyBeats, you must create an account by providing a valid email address. You are responsible for maintaining the security of your account credentials. You must be at least 18 years old to create an account and use our services.`,
      },
      {
        heading: "3. Credits & Payments",
        body: `BabyBeats operates on a credit-based system. Your first song is free. Additional songs require credits, which can be purchased through our platform via Stripe. All purchases are final and non-refundable, except as required by applicable law. Credits never expire.`,
      },
      {
        heading: "4. Content Ownership",
        body: `You own the songs generated for you through BabyBeats. You may download, share, and use them for personal, non-commercial purposes. BabyBeats retains all rights to the platform, its technology, design, and underlying systems. You grant BabyBeats a limited license to store and deliver your generated content through our platform.`,
      },
      {
        heading: "5. Prohibited Use",
        body: `You may not use BabyBeats to generate content that is harmful, offensive, or inappropriate for children. You may not attempt to reverse-engineer our AI systems, abuse the API, or use automated tools to access the service beyond normal use. Violation of these terms may result in account termination.`,
      },
      {
        heading: "6. Limitation of Liability",
        body: `BabyBeats is provided "as is" without warranties of any kind. We are not liable for any indirect, incidental, or consequential damages arising from your use of the service. Our total liability is limited to the amount you have paid for credits in the 12 months preceding any claim.`,
      },
      {
        heading: "7. Changes to Terms",
        body: `We may update these Terms of Service from time to time. We will notify registered users of significant changes via email. Your continued use of the service after changes constitutes acceptance of the updated terms.`,
      },
      {
        heading: "8. Contact",
        body: `If you have any questions about these Terms, please contact us at hola@babybeats.art.`,
      },
    ],
  },
  es: {
    title: "Términos de Servicio",
    lastUpdated: "Última actualización: 1 de abril de 2026",
    sections: [
      {
        heading: "1. Descripción del Servicio",
        body: `BabyBeats es una plataforma que utiliza inteligencia artificial para crear canciones personalizadas para bebés y niños pequeños. Nuestro servicio genera letras y audio personalizados basados en la información que proporcionas, como el nombre de tu hijo, el tema preferido y el estilo musical.`,
      },
      {
        heading: "2. Cuentas de Usuario",
        body: `Para usar BabyBeats, debes crear una cuenta proporcionando una dirección de correo electrónico válida. Eres responsable de mantener la seguridad de tus credenciales de cuenta. Debes tener al menos 18 años para crear una cuenta y usar nuestros servicios.`,
      },
      {
        heading: "3. Créditos y Pagos",
        body: `BabyBeats opera con un sistema de créditos. Tu primera canción es gratis. Las canciones adicionales requieren créditos, que se pueden comprar a través de nuestra plataforma mediante Stripe. Todas las compras son finales y no reembolsables, excepto según lo requiera la ley aplicable. Los créditos nunca expiran.`,
      },
      {
        heading: "4. Propiedad del Contenido",
        body: `Tú eres dueño de las canciones generadas para ti a través de BabyBeats. Puedes descargarlas, compartirlas y usarlas para fines personales y no comerciales. BabyBeats retiene todos los derechos sobre la plataforma, su tecnología, diseño y sistemas subyacentes. Nos otorgas una licencia limitada para almacenar y entregar tu contenido generado a través de nuestra plataforma.`,
      },
      {
        heading: "5. Uso Prohibido",
        body: `No puedes usar BabyBeats para generar contenido que sea dañino, ofensivo o inapropiado para niños. No puedes intentar realizar ingeniería inversa de nuestros sistemas de IA, abusar de la API o usar herramientas automatizadas para acceder al servicio más allá del uso normal. La violación de estos términos puede resultar en la terminación de la cuenta.`,
      },
      {
        heading: "6. Limitación de Responsabilidad",
        body: `BabyBeats se proporciona "tal cual" sin garantías de ningún tipo. No somos responsables de ningún daño indirecto, incidental o consecuente derivado de tu uso del servicio. Nuestra responsabilidad total se limita al monto que hayas pagado por créditos en los 12 meses anteriores a cualquier reclamación.`,
      },
      {
        heading: "7. Cambios en los Términos",
        body: `Podemos actualizar estos Términos de Servicio de vez en cuando. Notificaremos a los usuarios registrados sobre cambios significativos por correo electrónico. Tu uso continuado del servicio después de los cambios constituye la aceptación de los términos actualizados.`,
      },
      {
        heading: "8. Contacto",
        body: `Si tienes alguna pregunta sobre estos Términos, contáctanos en hola@babybeats.art.`,
      },
    ],
  },
};

export default async function TermsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const lang = locale === "es" ? "es" : "en";
  const content = CONTENT[lang];

  return (
    <div className="min-h-screen bg-background px-4 py-16">
      <div className="mx-auto max-w-3xl">
        <div className="rounded-2xl bg-white p-8 shadow-sm border border-border sm:p-12">
          <h1 className="font-heading text-3xl font-extrabold text-foreground mb-2">
            {content.title}
          </h1>
          <p className="text-sm text-muted-foreground mb-10">
            {content.lastUpdated}
          </p>

          <div className="space-y-8">
            {content.sections.map((section) => (
              <section key={section.heading}>
                <h2 className="font-heading text-lg font-bold text-foreground mb-2">
                  {section.heading}
                </h2>
                <p className="text-muted-foreground leading-relaxed">
                  {section.body}
                </p>
              </section>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
