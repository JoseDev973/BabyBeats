# BabyBeats - Documentacion del Proyecto

> Plataforma de canciones personalizadas para bebes con IA.
> URL: https://babybeats.art | Repo: github.com/JoseDev973/BabyBeats

---

## Indice

1. [Stack Tecnologico](#stack-tecnologico)
2. [Arquitectura](#arquitectura)
3. [Base de Datos](#base-de-datos)
4. [API Routes](#api-routes)
5. [Flujos de Usuario](#flujos-de-usuario)
6. [Sistema de Pagos](#sistema-de-pagos)
7. [Sistema de Emails](#sistema-de-emails)
8. [Internacionalizacion (i18n)](#internacionalizacion-i18n)
9. [Seguridad](#seguridad)
10. [Variables de Entorno](#variables-de-entorno)
11. [Git Workflow](#git-workflow)
12. [Testing](#testing)
13. [Pendientes para Go-Live](#pendientes-para-go-live)
14. [Equipo](#equipo)

---

## Stack Tecnologico

| Tecnologia | Version | Uso |
|---|---|---|
| Next.js | 16.2.1 | Framework (App Router, Turbopack) |
| React | 19.2.4 | UI |
| TypeScript | 5.x | Tipado |
| Tailwind CSS | 4.x | Estilos |
| Supabase | 2.101.0 | Auth, PostgreSQL, RLS |
| Stripe | 21.0.1 | Pagos (tarjeta internacional) |
| Mercado Pago | 2.12.0 | Pagos (LATAM) |
| Anthropic Claude | claude-sonnet-4-20250514 | Generacion de letras |
| Suno API | sunoapi.org | Generacion de audio |
| Resend | 6.10.0 | Emails transaccionales |
| next-intl | 4.8.3 | i18n (4 idiomas) |
| Playwright | 1.59.1 | E2E testing |
| Vercel | - | Hosting + CI/CD |
| Namecheap | - | Dominio (babybeats.art) |

**Fuentes:** Nunito (headings), Quicksand (body)
**Paleta:** Background #FFF8F0, Primary #8B7EC8 (violeta), Accent #FBBF8E (dorado), Gold #F5D394

---

## Arquitectura

```
src/
├── app/
│   ├── [locale]/              # Paginas con i18n (es, en, pt, fr)
│   │   ├── page.tsx           # Home
│   │   ├── layout.tsx         # Layout principal (fonts, metadata, analytics)
│   │   ├── auth/login/        # Login (email + Google OAuth)
│   │   ├── auth/signup/       # Registro
│   │   ├── create/            # Wizard de creacion (cancion individual + album)
│   │   ├── songs/             # Catalogo publico (10 canciones demo)
│   │   ├── my-songs/          # Canciones del usuario
│   │   ├── pricing/           # Packs de creditos
│   │   ├── checkout/[pack]/   # Pagina de checkout (Stripe + MP)
│   │   ├── profile/           # Perfil del usuario
│   │   ├── gift/              # Landing de packs de regalo
│   │   ├── gift/create/[id]/  # Wizard de personalizacion del gift
│   │   ├── gift/redeem/       # Canjear codigo de regalo
│   │   ├── terms/             # Terminos y condiciones
│   │   └── privacy/           # Politica de privacidad
│   ├── api/                   # API Routes (ver seccion abajo)
│   ├── auth/callback/         # OAuth callback (fuera de [locale])
│   ├── share/[token]/         # Pagina publica de cancion compartida
│   ├── gift/deliver/[token]/  # Pagina publica de entrega de regalo
│   └── globals.css            # Paleta, fuentes, variables CSS
├── components/
│   ├── layout/Navbar.tsx      # Navbar con toggle ES|EN, links, glassmorphism
│   ├── layout/Footer.tsx      # Footer
│   ├── songs/SongCard.tsx     # Card de cancion
│   ├── songs/SongCover.tsx    # Cover con gradiente tematico
│   ├── player/AudioPlayer.tsx # Reproductor de audio
│   └── pricing/PricingPacks.tsx # Grid de packs
├── hooks/usePlayer.tsx        # Hook para estado del reproductor
├── lib/
│   ├── supabase/client.ts     # Cliente browser
│   ├── supabase/server.ts     # Cliente server-side
│   ├── supabase/middleware.ts  # Refresh de session
│   ├── stripe/config.ts       # Lazy init de Stripe (getStripe())
│   ├── stripe/credit-packs.ts # Definicion de packs
│   ├── mercado-pago/config.ts # Config MP
│   ├── emails/welcome.tsx     # Template email bienvenida
│   ├── emails/song-ready.tsx  # Template cancion lista
│   ├── emails/gift-ready.tsx  # Template regalo listo
│   ├── resend.ts              # Lazy init de Resend (getResend())
│   ├── rate-limit.ts          # Rate limiter in-memory
│   └── utils.ts               # Utilidades generales
├── types/database.ts          # Tipos TypeScript del schema
├── i18n/routing.ts            # Config de rutas i18n
├── i18n/request.ts            # Config por request
└── middleware.ts              # Middleware: i18n + Supabase session
```

**Patron importante:** Todos los clientes externos (Supabase admin, Stripe, Resend) usan **lazy initialization** (`getStripe()`, `getResend()`, `getSupabase()`) para evitar errores de build en Vercel cuando las env vars no estan disponibles en build time.

---

## Base de Datos

### Tablas principales

| Tabla | Descripcion |
|---|---|
| `profiles` | Extiende auth.users. Tiene credits, total_songs_generated, subscription_tier |
| `songs` | Catalogo publico de canciones demo |
| `categories` | Lullabies, Educational, Fun & Play |
| `generated_songs` | Canciones personalizadas por usuario |
| `gifts` | Regalos (album de canciones) |
| `gift_songs` | Canciones individuales de cada regalo |
| `credit_transactions` | Log de compras, usos y bonos de creditos |
| `coupons` | Cupones de descuento (BABYSHOWER20, WELCOME50, FRIEND10) |
| `referrals` | Sistema de referidos |
| `favorites` | Canciones favoritas del usuario |
| `playlists` / `playlist_songs` | Playlists del usuario |
| `play_history` | Historial de reproduccion |
| `subscriptions` | Suscripciones Stripe (sync) |

### Schema de tablas clave

**profiles:**
```sql
id UUID PK (references auth.users)
display_name TEXT
preferred_language TEXT DEFAULT 'es'
subscription_tier TEXT DEFAULT 'free' -- 'free' | 'premium'
stripe_customer_id TEXT
credits INT DEFAULT 1  -- 1 credito gratis al registrarse
total_songs_generated INT DEFAULT 0
```

**generated_songs:**
```sql
id UUID PK
user_id UUID FK → profiles
child_name TEXT NOT NULL
theme TEXT -- 'lullaby' | 'educational' | 'fun'
music_style TEXT DEFAULT 'gentle'
language TEXT DEFAULT 'es'
custom_prompt TEXT
lyrics TEXT
audio_url TEXT          -- Track A (principal)
audio_url_b TEXT        -- Track B (alternativa)
cover_image_url TEXT
duration_seconds INT
share_token TEXT UNIQUE -- Para compartir publicamente
is_public BOOLEAN
suno_task_id TEXT       -- ID de tarea en Suno API
status TEXT -- 'draft' → 'lyrics_ready' → 'generating' → 'completed' | 'failed'
```

**gifts:**
```sql
id UUID PK
buyer_id UUID FK → auth.users
recipient_name TEXT
recipient_email TEXT
child_name TEXT NOT NULL
pack_type TEXT -- 'first_album' | 'sweet_dreams' | 'learning' | 'custom'
total_songs INT
language TEXT DEFAULT 'es'
delivery_mode TEXT -- 'link' | 'redeem'
delivery_token TEXT UNIQUE -- Token para pagina de entrega
status TEXT -- 'draft' → 'personalizing' → 'generating' → 'ready' → 'delivered' → 'redeemed'
stripe_payment_id TEXT
```

**gift_songs:**
```sql
id UUID PK
gift_id UUID FK → gifts
position INT
theme TEXT -- 'lullaby' | 'educational' | 'fun'
music_style TEXT
language TEXT
custom_prompt TEXT
lyrics TEXT
audio_url TEXT
cover_image_url TEXT
duration_seconds INT
status TEXT -- 'pending' → 'generating' → 'completed' | 'failed'
suno_task_id TEXT
```

### Migraciones

```
supabase/migrations/
├── 001_initial.sql                      # profiles, songs, categories, favorites, playlists, subscriptions, RLS
├── 002_generated_songs_and_credits.sql  # generated_songs, credit_transactions, credits en profiles
├── 003_mercado_pago.sql                 # mp_payment_id en credit_transactions
├── 004_mp_unique_constraint.sql         # Unique index en mp_payment_id
├── 005_gifts_tables.sql                 # gifts, gift_songs con RLS
└── 20260401000000_add_coupons_and_referrals.sql  # coupons, referrals
```

### RLS (Row Level Security)

- **profiles:** Solo lectura/escritura del propio usuario
- **songs/categories:** Lectura publica
- **generated_songs:** El usuario ve las suyas + las publicas (is_public = true)
- **gifts:** El comprador ve las suyas. Cualquiera ve las que estan en status ready/delivered/redeemed
- **gift_songs:** Acceso via el gift del comprador, o si el gift es ready/delivered/redeemed
- **credit_transactions:** Solo el propio usuario

### Trigger importante
`handle_new_user()` se ejecuta al crear un usuario en auth.users y crea automaticamente un registro en profiles con display_name y avatar_url del OAuth provider.

---

## API Routes

### Generacion de canciones

| Ruta | Metodo | Auth | Descripcion |
|---|---|---|---|
| `/api/generate/lyrics` | POST | Si | Genera letras con Claude. Valida theme, language, childName (max 100), customPrompt (max 500). Rate limited. |
| `/api/generate/audio` | POST | Si | Envia a Suno API. Incremento atomico de total_songs_generated con optimistic locking. Rate limited. |
| `/api/generate/status` | GET | Si | Consulta status de generacion |

### Pagos

| Ruta | Metodo | Auth | Descripcion |
|---|---|---|---|
| `/api/checkout` | POST | Si | Crea Stripe checkout session. Valida priceId contra allowlist. |
| `/api/checkout-mp` | POST | Si | Crea preferencia de Mercado Pago. |
| `/api/coupons/validate` | POST | Si | Valida codigo de cupon |

### Webhooks

| Ruta | Metodo | Auth | Descripcion |
|---|---|---|---|
| `/api/webhooks/stripe` | POST | Signature | Maneja checkout.session.completed, subscription updates |
| `/api/webhooks/mercado-pago` | POST | HMAC | Verifica firma HMAC. Maneja pagos aprobados. Unique constraint en mp_payment_id. |
| `/api/webhooks/suno` | POST | Bearer | SUNO_WEBHOOK_SECRET obligatorio. Actualiza generated_songs Y gift_songs. Envia email cuando completa. |

### Gifts

| Ruta | Metodo | Auth | Descripcion |
|---|---|---|---|
| `/api/gift/generate` | POST | Si | Genera letras + audio para cada cancion del gift. Solo el comprador. |
| `/api/gift/redeem` | POST | Si | Canjea regalo. Verifica expiracion (90 dias). Agrega creditos atomicamente. |

### Otros

| Ruta | Metodo | Auth | Descripcion |
|---|---|---|---|
| `/api/emails/send` | POST | INTERNAL_API_KEY | Envia emails (welcome, etc.) |
| `/api/referrals` | GET | Si | Info de referidos del usuario |
| `/auth/callback` | GET | - | OAuth callback (Google). Fuera de middleware i18n. |

---

## Flujos de Usuario

### 1. Crear cancion individual
```
Home → "Create Song" → Login (si no autenticado) → CreateWizard:
  1. Nombre del bebe
  2. Tema (lullaby/educational/fun)
  3. Estilo musical
  4. Idioma (es/en/pt/fr/de/it)
  5. Prompt personalizado (opcional)
  6. → POST /api/generate/lyrics (Claude)
  7. → POST /api/generate/audio (Suno)
  8. → Redirect a /generating/[songId] (polling cada 5s)
  9. → Webhook de Suno actualiza status a "completed"
  10. → Email "song ready" al usuario
  11. → Pagina con audio player + letras + download MP3 + share link
```

### 2. Crear album (multiples canciones)
```
CreateWizard → Modo "Album":
  1. Nombre del bebe
  2. Cantidad (3/5/10 canciones)
  3. Modo rapido (auto-config) o custom (config por cancion)
  4. Si custom: tema + estilo + prompt por cancion
  5. Requiere creditos suficientes (verificacion al seleccionar modo album)
  6. → Genera cada cancion secuencialmente
```

### 3. Regalar album
```
/gift → Seleccionar pack:
  - First Album (3 canciones - $4.99)
  - Sweet Dreams (5 canciones - $7.99)
  - Learning Pack (10 canciones - $14.99)
→ Crea gift en DB (status: draft)
→ [PENDIENTE: Checkout Stripe/MP]
→ /gift/create/[giftId] → Wizard de personalizacion:
  1. Nombre del bebe + nombre del destinatario
  2. Modo rapido o custom
  3. Si custom: config por cancion
  4. → POST /api/gift/generate
  5. → Spinner animado + polling cada 5s
  6. → Webhook Suno actualiza cada gift_song
  7. → Cuando todas completan: gift status → "ready"
  8. → Email "gift ready" al comprador con delivery link
→ /gift/deliver/[token] → Pagina publica con todas las canciones
```

### 4. Compartir cancion
```
Cancion completada → share_token generado automaticamente
→ /share/[token] → Pagina publica con:
  - Audio player
  - Letras
  - Boton download MP3
  - Branding BabyBeats
  - OG tags para preview en redes sociales
```

### 5. Comprar creditos
```
/pricing → 3 packs:
  - Starter: 3 creditos por $4.99 ($1.66/cancion)
  - Family Pack: 10 creditos por $9.99 ($1.00/cancion) [popular]
  - Mega Pack: 25 creditos por $19.99 ($0.80/cancion)
→ /checkout/[pack] → Seleccion de metodo de pago:
  - Stripe (tarjeta internacional)
  - Mercado Pago (LATAM)
→ Webhook confirma pago → creditos sumados a profiles.credits
```

---

## Sistema de Pagos

### Stripe
- **Modo:** Payment (one-time), no subscription
- **Webhook:** `checkout.session.completed` → suma creditos
- **Precio IDs:** Configurados via env vars (`STRIPE_STARTER_PACK_PRICE_ID`, etc.)
- **Validacion:** priceId se verifica contra allowlist de IDs reales

### Mercado Pago
- **Integracion:** Checkout Pro (redirect)
- **Webhook:** Verificacion HMAC de firma
- **Idempotencia:** Unique constraint en `credit_transactions.mp_payment_id`
- **Moneda:** ARS/COP/etc segun pais

### Sistema de creditos
- **Registro:** 1 credito gratis
- **Primera cancion:** Logica `isFirstSong` (total_songs_generated === 0) da acceso sin credito
- **Consumo:** 1 credito por cancion generada
- **Incremento atomico:** `total_songs_generated` se incrementa ANTES de llamar a Suno (optimistic locking)
- **Log:** Toda transaccion queda en `credit_transactions`

---

## Sistema de Emails

**Proveedor:** Resend
**Dominio:** hola@babybeats.art (verificado en Resend)
**Templates bilingues (es/en):**

| Email | Trigger | Contenido |
|---|---|---|
| Welcome | Registro de usuario | Bienvenida + CTA crear primera cancion |
| Song Ready | Webhook Suno (cancion completada) | Link a la cancion + CTA escuchar |
| Gift Ready | Todas las canciones del gift completadas | Link de entrega + total de canciones |

**Lazy init:** `getResend()` evita crash en build time si `RESEND_API_KEY` no esta.

---

## Internacionalizacion (i18n)

**Libreria:** next-intl v4.8.3
**Locales:** es (default), en, pt, fr
**Archivos:** `messages/{es,en,pt,fr}.json`

**Secciones de traduccion:**
- `common` - Botones, labels generales
- `home` - Hero, categorias, CTA
- `songs` - Catalogo, reproductor
- `auth` - Login, signup, forgot password
- `pricing` - Packs, precios
- `player` - Controles de audio
- `create` - Wizard de creacion
- `generating` - Pantalla de espera
- `platforms` - Proximas plataformas (Spotify, Apple Music)
- `mySongs` - Mis canciones
- `share` - Pagina de compartir
- `gift` - Todo el flujo de regalos

**Middleware:** `src/middleware.ts` combina i18n routing con Supabase session refresh. Excluye `/auth/callback`, `/share/`, `/gift/deliver/` del prefijo de locale.

**Toggle:** Pill ES|EN en el Navbar (no banderas, no Globe icon).

---

## Seguridad

### Headers HTTP (next.config.ts)
- `X-Frame-Options: DENY` (anti-clickjacking)
- `X-Content-Type-Options: nosniff`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Strict-Transport-Security: max-age=63072000` (HSTS 2 anos)
- `Permissions-Policy: camera=(), microphone=(), geolocation=()`

### Validacion de input
- **childName:** Max 100 chars, sanitizado con `.replace(/[<>"'&]/g, '')`
- **customPrompt:** Max 500 chars, strip de keywords de inyeccion (ignore/previous/instructions/system/prompt)
- **theme:** Allowlist `['lullaby', 'educational', 'fun']`
- **language:** Allowlist `['es', 'en', 'pt', 'fr', 'de', 'it']`
- **priceId (Stripe):** Validado contra env vars reales

### Webhooks
- **Stripe:** Verificacion de firma con `stripe.webhooks.constructEvent`
- **Mercado Pago:** HMAC signature verification
- **Suno:** Bearer token obligatorio (SUNO_WEBHOOK_SECRET), retorna 503 si no configurado

### Rate Limiting
- In-memory Map, 60 req/min por IP
- Aplicado a `/api/generate/lyrics` y `/api/generate/audio`
- **Limitacion conocida:** No persiste entre invocaciones serverless en Vercel

### RLS (Row Level Security)
- Habilitado en TODAS las tablas
- Cada usuario solo ve/modifica sus propios datos
- Excepciones controladas: songs publicos, gifts en status ready

### Otros
- Service role key solo en webhooks server-side (nunca expuesta al cliente)
- OAuth callback excluido de i18n middleware para evitar redirect loops
- Paginas publicas (`/share/`, `/gift/deliver/`) sanitizan output

---

## Variables de Entorno

### Requeridas para funcionar

| Variable | Donde | Descripcion |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Vercel + local | URL del proyecto Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Vercel + local | Anon key (publica, usada en browser) |
| `SUPABASE_SERVICE_ROLE_KEY` | Vercel | Service role (solo server-side, webhooks) |
| `ANTHROPIC_API_KEY` | Vercel | API key de Claude para generar letras |
| `SUNO_API_KEY` | Vercel | API key de sunoapi.org para generar audio |
| `SUNO_WEBHOOK_SECRET` | Vercel | Secret para verificar webhooks de Suno |
| `NEXT_PUBLIC_APP_URL` | Vercel | `https://babybeats.art` |

### Pagos

| Variable | Donde | Descripcion |
|---|---|---|
| `STRIPE_SECRET_KEY` | Vercel | sk_live_xxx o sk_test_xxx |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Vercel | pk_live_xxx o pk_test_xxx |
| `STRIPE_WEBHOOK_SECRET` | Vercel | whsec_xxx (de Stripe dashboard) |
| `STRIPE_STARTER_PACK_PRICE_ID` | Vercel | price_xxx para Starter (3 creditos, $4.99) |
| `STRIPE_FAMILY_PACK_PRICE_ID` | Vercel | price_xxx para Family Pack (10 creditos, $9.99) |
| `STRIPE_MEGA_PACK_PRICE_ID` | Vercel | price_xxx para Mega Pack (25 creditos, $19.99) |
| `MP_ACCESS_TOKEN` | Vercel | Token de Mercado Pago |
| `MP_WEBHOOK_SECRET` | Vercel | Secret de webhook de MP |

### Emails

| Variable | Donde | Descripcion |
|---|---|---|
| `RESEND_API_KEY` | Vercel | API key de Resend |
| `INTERNAL_API_KEY` | Vercel | Para endpoint /api/emails/send |

### Opcionales

| Variable | Donde | Descripcion |
|---|---|---|
| `NEXT_PUBLIC_SENTRY_DSN` | Vercel | Error tracking (Sentry) |

---

## Git Workflow

- **Repo:** github.com/JoseDev973/BabyBeats (publico)
- **main:** Produccion (protegida, requiere PR + 1 approval)
- **dev:** Desarrollo (preview deploy en Vercel)
- **Merge:** Squash merge only, auto-delete branches
- **Deploy:** Vercel auto-deploy en push (main = prod, dev = preview)
- **Convenciones de commit:**
  - `feat:` Nueva funcionalidad
  - `fix:` Bug fix
  - `test:` Tests
  - `docs:` Documentacion

---

## Testing

**Framework:** Playwright
**Tests:** 27 tests en 6 archivos
**URL target:** https://babybeats.art (produccion)

| Archivo | Tests | Que cubre |
|---|---|---|
| `e2e/home.spec.ts` | Home page, hero, navbar, footer |
| `e2e/songs.spec.ts` | Catalogo de canciones, filtros |
| `e2e/auth.spec.ts` | Login, signup, validaciones |
| `e2e/create.spec.ts` | Wizard de creacion |
| `e2e/gift.spec.ts` | Flujo de regalos |
| `e2e/legal.spec.ts` | Terminos, privacidad |

**Ejecutar:**
```bash
npm run test:e2e        # Headless
npm run test:e2e:ui     # Con UI de Playwright
```

---

## Pendientes para Go-Live

### CRITICOS (bloqueantes)

| # | Issue | Que hacer | Quien |
|---|---|---|---|
| #19 | Stripe checkout retorna 500 | Crear 3 productos en Stripe Dashboard con precios $4.99/$9.99/$19.99. Copiar los price_xxx IDs y actualizar `STRIPE_STARTER_PACK_PRICE_ID`, `STRIPE_FAMILY_PACK_PRICE_ID`, `STRIPE_MEGA_PACK_PRICE_ID` en Vercel Environment Variables. | Jose/Julian |
| #21 | Gift genera canciones sin pago | Agregar gate de pago en el flujo de gift. Despues de personalizar, redirigir a checkout (Stripe/MP). Solo permitir `/api/gift/generate` si `stripe_payment_id` esta presente. Bloqueado por Stripe (#19). | Dev team |

### IMPORTANTES (no bloqueantes pero necesarios)

| Tarea | Descripcion |
|---|---|
| Rotar API keys | Las keys de Resend y MP fueron compartidas en chat. Regenerar en dashboards respectivos y actualizar en Vercel. |
| Rate limiter a Redis | El rate limiter in-memory no funciona en Vercel serverless. Migrar a Upstash Redis o Vercel KV. |

### NICE TO HAVE

| Tarea | Descripcion |
|---|---|
| Dark mode | Julian y Juan Felipe estan trabajando en esto |
| Cover art con IA | Generar cover art personalizado en vez de gradientes |
| Spotify/Apple Music | Links de streaming (ya hay traducciones `platforms.*`) |
| Analytics avanzados | Dashboard de uso, canciones mas populares |
| Redis sessions | Para auth mas robusta en serverless |

---

## Equipo

| Nombre | GitHub | Rol |
|---|---|---|
| Jose Castro | @JoseDev973 | Owner, full-stack |
| Julian Nunez | @juliannunezbarrero | Frontend, i18n, metadata |
| Juan Felipe | @Juanfrozo | Auth, forms, accesibilidad |

---

## Pasos para crear los productos en Stripe

1. Ir a https://dashboard.stripe.com/products
2. Crear 3 productos:

**Producto 1: Starter Pack**
- Nombre: "Starter Pack - 3 Credits"
- Precio: $4.99 USD (one-time)
- Copiar el `price_xxx` ID

**Producto 2: Family Pack**
- Nombre: "Family Pack - 10 Credits"
- Precio: $9.99 USD (one-time)
- Copiar el `price_xxx` ID

**Producto 3: Mega Pack**
- Nombre: "Mega Pack - 25 Credits"
- Precio: $19.99 USD (one-time)
- Copiar el `price_xxx` ID

3. En Vercel → Settings → Environment Variables:
```
STRIPE_STARTER_PACK_PRICE_ID=price_xxx  (el del Starter)
STRIPE_FAMILY_PACK_PRICE_ID=price_xxx   (el del Family)
STRIPE_MEGA_PACK_PRICE_ID=price_xxx     (el del Mega)
```

4. Configurar webhook en Stripe → Developers → Webhooks:
   - URL: `https://babybeats.art/api/webhooks/stripe`
   - Eventos: `checkout.session.completed`
   - Copiar el signing secret a `STRIPE_WEBHOOK_SECRET` en Vercel

5. Redeploy en Vercel (los env vars requieren redeploy)

---

*Ultima actualizacion: 2026-04-03*
*Commit actual: be6efa2 (dev & main)*
