# Diseño — web nueva (vista previa en /new)

Dirección: un cancionero ilustrado con la voz de BabyBeats. Títulos en Nunito 900 (la fuente de la marca), texto en Quicksand, papel crema que coincide con las ilustraciones, tinta ciruela `#2E2350`, el violeta como acción llena y un pastel por tipo de canción (tarjetas, no franjas). Toma de Tonadia el método de ilustración, no su tipografía ni su composición. Es una landing de venta: CTA en el hero, en cada tarjeta, después de "Así de fácil", en regalos, "Comprar" en cada pack, cierre, y una barra fija en el celular que aparece al pasar el hero.

Código: `src/app/[locale]/new/` (página y `new.module.css`), `src/components/new-web/DemoPlayer.tsx`. `ChromeGate` esconde la barra y el footer actuales solo en `/new`. La página no se indexa (`robots: noindex`).

## Ilustraciones (Gemini Pro)

Se generan en gemini.google.com con la cuenta Pro, se descargan a `design/ilustraciones/gemini/` y se recortan a PNG transparentes con el script `separar.py` de Mente Abierta (`~/menteabierta/instagram/canva/separar.py`, cambiando `ASSETS` a `design/ilustraciones/recortes`). Para la web se reducen a WebP de ~520 px en `public/new-web/`.

Reglas del estilo: gouache con textura de crayón y lápiz, como libro infantil premium; **solo objetos** (sin personas, bebés, caras ni manos); sin texto, letras ni números; fondo crema liso `#FBF4EA` para poder recortar.

Paleta para pedirle a Gemini: contornos ciruela `#2E2350`, lavanda `#B9AEE6`, durazno `#FBBF8E`, mantequilla `#F6D98B`, salvia `#B7CDB0`, rosa `#E8A9C4`.

Prompt de la hoja de objetos (`01-objetos-musica.jpeg`, recortes: caja-musical, luna, xilofono, ukulele, regalo, audifonos):

> Create an image, landscape 3:2. Hand-painted illustration in gouache with visible crayon and pencil texture, warm and premium, like a high-end children's picture book (not clip-art, not 3D, not photorealistic). A sheet of SIX separate objects about music for babies, arranged in a loose 3 by 2 grid with generous empty space between them so each one can be cut out on its own: [objetos]. Palette: [paleta]. Objects slightly imperfect and charming. NO people, NO babies, NO faces, NO hands, NO text, NO letters, NO numbers, NO logos. Plain flat warm cream background #FBF4EA, no shadows on the background, no frame.

Prompt del hero (`02-hero-melodia.jpeg`): el mismo estilo, 16:9, "a long soft lavender ribbon waves gently from left to right like a melody", caja de música a la izquierda, luna sobre nube a la derecha, juguetes abajo, la esquina superior izquierda vacía. Un prompt más largo (21:9, con cuna y ventana) devolvió respuestas vacías dos veces: prompts cortos funcionan mejor.

## Demos de audio

`public/new-web/demos/`: tres canciones de "Sofía" (y tres de "Emma" para `/en`) generadas con los prompts nuevos de Suno (los que ganaron la prueba a ciegas). Los demos del catálogo actual (`songs.audio_url`) apuntan a URLs temporales de Suno que ya caducaron.
