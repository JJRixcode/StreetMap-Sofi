# Ruta a pie en Street View

Página web para explicar cómo llegar caminando a una dirección. Pones de dónde sales y a dónde vas, y la app genera un **video caminando por Google Street View** con un mapita, los giros y la distancia que falta. El video se descarga en MP4 o se comparte directo a WhatsApp desde el celular.

Todo corre en el navegador: **no necesita servidor propio ni base de datos**. Por eso se puede publicar gratis en GitHub Pages, Netlify, Cloudflare Pages o Vercel.

## Qué hace

- Busca las dos direcciones, o las marcas tocando el mapa.
- Calcula la ruta a pie con Google.
- Si conoces otro camino, **toca el mapa** para que la ruta pase por ahí. Los puntos se pueden arrastrar y, si tocas uno, se quita.
- Baja las fotos de Street View a lo largo de la ruta, con la cámara mirando hacia donde vas. En las esquinas gira y avisa "Gira a la derecha" o "Gira a la izquierda".
- Graba el video en horizontal (16:9) o vertical (9:16, para WhatsApp e historias).
- Funciona en computador y en celular.

## Publicarla gratis en GitHub Pages

1. Crea una cuenta en [github.com](https://github.com) si no tienes.
2. Crea un repositorio nuevo, **público**, por ejemplo `ruta-streetview`.
3. Sube **todo el contenido de esta carpeta**, con `index.html` en la raíz del repositorio. Desde la web: *Add file → Upload files* y arrastras los archivos y carpetas.
4. Ve a *Settings → Pages*. En *Source* elige **Deploy from a branch**, rama `main` y carpeta `/ (root)`. Guarda.
5. En uno o dos minutos queda publicada en:
   `https://TU-USUARIO.github.io/ruta-streetview/`

> El archivo `.nojekyll` debe subirse también. Le dice a GitHub que publique los archivos tal cual.

## La clave de Google (API key)

Google pide registrar una tarjeta, pero da un **cupo gratis mensual** (unas 10.000 fotos de Street View al mes según su tabla actual). Una ruta de 1 km usa unas 100 o 120 fotos.

1. Entra a [Google Maps Platform](https://console.cloud.google.com/google/maps-apis/start) y crea un proyecto.
2. Activa estas 4 APIs:
   - **Maps JavaScript API** (el mapa y la búsqueda de direcciones)
   - **Geocoding API** (convertir direcciones en puntos)
   - **Routes API** (la ruta a pie)
   - **Street View Static API** (las fotos)
3. En *APIs y servicios → Credenciales* crea una **clave de API** y edítala:
   - **Restricciones de aplicaciones → Sitios web**: agrega `https://TU-USUARIO.github.io/*`. Así nadie más puede usar tu clave desde otra página.
   - **Restricciones de API**: deja solo las 4 de arriba.
4. **Para no pagar nunca:** en *APIs y servicios → [cada API] → Cuotas* pon un límite diario. Por ejemplo, 300 fotos por día en Street View Static API y 200 consultas por día en las demás. Si se llega al límite, la app deja de funcionar ese día en vez de cobrarte.

### ¿Dónde se pone la clave?

Tienes dos opciones:

- **Pegarla en la app** (opción por defecto). Se guarda solo en el navegador de quien la usa y no queda en el código.
- **Dejarla fija en `config.js`**, para que la app no la pida en cada celular o computador. Hazlo **solo** si hiciste el paso 3 (restricción por sitio web) y el paso 4 (límites), porque ese archivo queda público en GitHub.

```js
window.CONFIG = {
  apiKey: "AIza...tu clave..."
};
```

## Uso

1. Escribe **Desde** y **Hasta**, o toca **📍 Mapa** y marca el punto.
2. **Calcular ruta a pie.** Si quieres otro camino, toca el mapa para agregar puntos.
3. Elige formato y velocidad, y dale **Preparar recorrido**.
4. **▶ Ver** para revisarlo y **⬇ Descargar video** para grabarlo. En el celular aparece **Compartir** para mandarlo directo por WhatsApp.

Mientras graba, deja la página abierta: el video se graba en tiempo real.

## Navegadores

- **Chrome, Edge o Safari actualizados** (computador, Android o iPhone): el video sale en MP4.
- **Firefox**: el video sale en WebM. Funciona, pero WhatsApp a veces no lo acepta.

## Archivos

```
index.html          Página principal
config.js           Clave opcional de Google
css/estilos.css     Diseño (computador y celular)
js/utilidades.js    Cálculos de distancias y rumbos
js/google.js        Llamadas a las APIs de Google
js/mapa.js          Mapa, puntos y ruta
js/recorrido.js     Busca y baja las fotos de Street View
js/video.js         Dibuja, reproduce y graba el video
js/inicio.js        Arranque de la app
iconos/icono.svg    Ícono de la pestaña
```

## Nota sobre las imágenes

Las fotos son de Google Street View y el video siempre lleva la marca "Imágenes © Google", como pide Google. La app no guarda las fotos: se usan solo mientras la página está abierta.
