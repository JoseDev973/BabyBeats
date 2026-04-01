import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy",
};

const CONTENT = {
  en: {
    title: "Privacy Policy",
    lastUpdated: "Last updated: April 1, 2026",
    sections: [
      {
        heading: "1. Information We Collect",
        body: `We collect the following information when you use BabyBeats:\n\n- Account information: email address and display name\n- Song preferences: your child's name, preferred themes, music styles, language, and any custom prompts you provide\n- Payment information: processed securely through Stripe (we do not store your card details)\n- Usage data: songs generated, credits used, and basic analytics`,
      },
      {
        heading: "2. How We Use Your Information",
        body: `We use your information to:\n\n- Generate personalized songs based on your preferences\n- Manage your account and credit balance\n- Send transactional emails (account confirmation, song delivery, purchase receipts)\n- Improve our service and user experience\n- Communicate important updates about BabyBeats`,
      },
      {
        heading: "3. Third-Party Services",
        body: `We use the following third-party services to operate BabyBeats:\n\n- Supabase: authentication and database hosting\n- Stripe: payment processing\n- Suno: AI audio generation\n- Anthropic (Claude): AI lyrics generation\n- Resend: transactional emails\n- Vercel: hosting and analytics\n\nEach of these services has their own privacy policy. We only share the minimum information necessary for each service to function.`,
      },
      {
        heading: "4. Cookies",
        body: `BabyBeats uses essential cookies for authentication and session management. We also use Vercel Analytics for basic, privacy-friendly usage analytics. We do not use third-party advertising cookies or tracking pixels.`,
      },
      {
        heading: "5. Data Retention",
        body: `We retain your account information and generated songs for as long as your account is active. If you delete your account, we will remove your personal data within 30 days. Generated audio files may be retained in backup systems for up to 90 days after deletion.`,
      },
      {
        heading: "6. Your Rights",
        body: `You have the right to:\n\n- Access the personal data we hold about you\n- Request correction of inaccurate data\n- Delete your account and associated data\n- Export your generated songs\n\nTo exercise any of these rights, contact us at hola@babybeats.art.`,
      },
      {
        heading: "7. Children's Privacy",
        body: `BabyBeats is a service used by parents and guardians to create songs for their children. We do not knowingly collect personal information directly from children under 13. The child's name provided during song creation is used solely for generating personalized lyrics and is associated with the parent's account.`,
      },
      {
        heading: "8. Data Security",
        body: `We implement industry-standard security measures to protect your data, including encryption in transit (HTTPS) and at rest. However, no method of electronic transmission or storage is 100% secure, and we cannot guarantee absolute security.`,
      },
      {
        heading: "9. Changes to This Policy",
        body: `We may update this Privacy Policy from time to time. We will notify registered users of significant changes via email. Your continued use of BabyBeats after changes constitutes acceptance of the updated policy.`,
      },
      {
        heading: "10. Contact",
        body: `If you have questions about this Privacy Policy or your data, contact us at hola@babybeats.art.`,
      },
    ],
  },
  es: {
    title: "Política de Privacidad",
    lastUpdated: "Última actualización: 1 de abril de 2026",
    sections: [
      {
        heading: "1. Información que Recopilamos",
        body: `Recopilamos la siguiente información cuando usas BabyBeats:\n\n- Información de cuenta: dirección de correo electrónico y nombre para mostrar\n- Preferencias de canciones: el nombre de tu hijo/a, temas preferidos, estilos musicales, idioma y cualquier solicitud personalizada que proporciones\n- Información de pago: procesada de forma segura a través de Stripe (no almacenamos los datos de tu tarjeta)\n- Datos de uso: canciones generadas, créditos utilizados y análisis básicos`,
      },
      {
        heading: "2. Cómo Usamos tu Información",
        body: `Usamos tu información para:\n\n- Generar canciones personalizadas basadas en tus preferencias\n- Administrar tu cuenta y saldo de créditos\n- Enviar correos transaccionales (confirmación de cuenta, entrega de canciones, recibos de compra)\n- Mejorar nuestro servicio y experiencia de usuario\n- Comunicar actualizaciones importantes sobre BabyBeats`,
      },
      {
        heading: "3. Servicios de Terceros",
        body: `Utilizamos los siguientes servicios de terceros para operar BabyBeats:\n\n- Supabase: autenticación y alojamiento de base de datos\n- Stripe: procesamiento de pagos\n- Suno: generación de audio con IA\n- Anthropic (Claude): generación de letras con IA\n- Resend: correos transaccionales\n- Vercel: alojamiento y análisis\n\nCada uno de estos servicios tiene su propia política de privacidad. Solo compartimos la información mínima necesaria para que cada servicio funcione.`,
      },
      {
        heading: "4. Cookies",
        body: `BabyBeats usa cookies esenciales para autenticación y gestión de sesiones. También usamos Vercel Analytics para análisis básicos y respetuosos con la privacidad. No usamos cookies de publicidad de terceros ni píxeles de seguimiento.`,
      },
      {
        heading: "5. Retención de Datos",
        body: `Conservamos la información de tu cuenta y las canciones generadas mientras tu cuenta esté activa. Si eliminas tu cuenta, eliminaremos tus datos personales dentro de 30 días. Los archivos de audio generados pueden conservarse en sistemas de respaldo hasta 90 días después de la eliminación.`,
      },
      {
        heading: "6. Tus Derechos",
        body: `Tienes derecho a:\n\n- Acceder a los datos personales que tenemos sobre ti\n- Solicitar la corrección de datos inexactos\n- Eliminar tu cuenta y datos asociados\n- Exportar tus canciones generadas\n\nPara ejercer cualquiera de estos derechos, contáctanos en hola@babybeats.art.`,
      },
      {
        heading: "7. Privacidad de los Niños",
        body: `BabyBeats es un servicio utilizado por padres y tutores para crear canciones para sus hijos. No recopilamos intencionalmente información personal directamente de niños menores de 13 años. El nombre del niño proporcionado durante la creación de la canción se utiliza únicamente para generar letras personalizadas y está asociado con la cuenta del padre/tutor.`,
      },
      {
        heading: "8. Seguridad de Datos",
        body: `Implementamos medidas de seguridad estándar de la industria para proteger tus datos, incluyendo cifrado en tránsito (HTTPS) y en reposo. Sin embargo, ningún método de transmisión electrónica o almacenamiento es 100% seguro, y no podemos garantizar seguridad absoluta.`,
      },
      {
        heading: "9. Cambios en Esta Política",
        body: `Podemos actualizar esta Política de Privacidad de vez en cuando. Notificaremos a los usuarios registrados sobre cambios significativos por correo electrónico. Tu uso continuado de BabyBeats después de los cambios constituye la aceptación de la política actualizada.`,
      },
      {
        heading: "10. Contacto",
        body: `Si tienes preguntas sobre esta Política de Privacidad o tus datos, contáctanos en hola@babybeats.art.`,
      },
    ],
  },
};

export default async function PrivacyPage({
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
                <p className="text-muted-foreground leading-relaxed whitespace-pre-line">
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
