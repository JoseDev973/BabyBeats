@AGENTS.md

# BabyBeats

Plataforma de canciones personalizadas para bebés con IA.
URL: https://babybeats.art | Repo: github.com/JoseDev973/BabyBeats

## Documentación

Lee **DOCS.md** en la raíz — tiene toda la documentación: stack, arquitectura, DB schema, API routes, flujos, seguridad, env vars, y pendientes.

## Estado actual

- Commit: be6efa2 en dev y main, desplegado en Vercel (producción)
- Todo funciona: creación de canciones, álbums, gifts, i18n (es/en/pt/fr), emails (Resend), Mercado Pago, Google OAuth, catálogo con 10 demos, 27 E2E tests, seguridad auditada

## Pendientes críticos (GitHub issues)

1. **#19 — Stripe checkout retorna 500** — Los STRIPE_*_PRICE_ID en Vercel son placeholders. Pasos para resolverlo al final de DOCS.md.
2. **#21 — Gift genera canciones sin pago** — Falta gate de checkout antes de /api/gift/generate. Bloqueado por #19.

## Reglas de desarrollo

- Trabajar siempre en branch `dev` (nunca directo a main)
- Leer AGENTS.md antes de escribir código (Next.js 16 tiene breaking changes)
- Usar **lazy initialization** para clientes externos: `getStripe()`, `getResend()`, `getSupabase()`
- Todo texto visible debe usar traducciones (next-intl, archivos en /messages/)
- Paleta: Background #FFF8F0, Primary #8B7EC8 (violeta), Accent #FBBF8E (dorado)
- Fuentes: Nunito (headings), Quicksand (body)
- Comunicación en español
