# Ruta a pie en Street View

Página web para explicar cómo llegar caminando a una dirección. Pones de dónde sales y a dónde vas, y la app genera un **video caminando por Google Street View** con un mapita, los giros y la distancia que falta. El video se descarga en MP4 o se comparte directo a WhatsApp desde el celular.

Todo corre en el navegador, sin servidor propio ni base de datos, y está publicada en GitHub Pages:
**https://jjrixcode.github.io/StreetMap-Sofi/**

> Hubo una versión gratis con fotos de Mapillary y mapas de OpenStreetMap. Está en el historial de git (commits de noviembre de 2026) por si se necesita otra vez.

## Qué hace

- Mientras escribes, **sugiere lugares y direcciones** (Google Places), como en Google Maps. Entiende abreviaturas como «Cra 70 # 44-20» o «Cl 10 # 43A-20». También puedes marcar los puntos tocando el mapa.
- Al elegir origen y destino, calcula sola la ruta a pie.
- Si conoces otro camino, **toca el mapa** para que la ruta pase por ahí. Los puntos se pueden arrastrar y, si tocas uno, se quita.
- Baja las fotos de Street View a lo largo de la ruta, con la cámara mirando hacia donde vas. En las esquinas gira y avisa «Gira a la derecha» o «Gira a la izquierda».
- Graba el video en horizontal (16:9) o vertical (9:16, para WhatsApp e historias).
- Funciona en computador y en celular.

## Google Cloud

Proyecto **StreetMap Sofi** (`streetmap-sofi`) con facturación activa. La clave está en `config.js`, así que nadie tiene que pegarla.

**APIs que usa** (la clave solo puede usar estas 5):

| API | Para qué |
|---|---|
| Maps JavaScript API | El mapa |
| Places API (New) | Sugerencias de lugares y direcciones |
| Geocoding API | Nombre de un punto tocado en el mapa |
| Routes API | La ruta a pie |
| Street View Static API | Las fotos del video |

**Protecciones para no pagar:**

- La clave solo funciona desde `https://jjrixcode.github.io/*` (y `http://localhost:8000/*` para pruebas).
- Límites diarios, cerca del cupo gratis mensual de Google (unos 10.000 usos por API al mes):

| Cuota | Límite al día |
|---|---|
| Street View Static: fotos | 330 |
| Maps JavaScript: cargas del mapa | 300 |
| Places: sugerencias / ubicación de un lugar | 300 / 300 |
| Geocoding | 300 |
| Routes: rutas | 300 |

Una ruta de 1 km usa unas 110 a 130 fotos, así que alcanzan **2 o 3 videos al día**. Si se llega al límite, la app deja de funcionar ese día en vez de cobrar. Para más videos se sube el límite en *Google Maps Platform → Cuotas* (lo que pase del cupo gratis se cobra).

## Uso

1. Escribe **Desde** y **Hasta** y elige de la lista, o toca **Mapa** y marca el punto.
2. Revisa la ruta. Si quieres otro camino, toca el mapa para agregar puntos.
3. Elige formato y velocidad, y dale **Preparar recorrido**.
4. **▶ Ver** para revisarlo y **⬇ Descargar video** para grabarlo. En el celular aparece **Compartir** para mandarlo directo por WhatsApp.

Mientras graba, deja la página abierta: el video se graba en tiempo real.

## Probarla en tu computador

```bash
python3 -m http.server 8000
```

y abre `http://localhost:8000`.

## Publicar cambios

En `index.html`, el CSS y los JS llevan un número de versión (`?v=2`). Cada vez que cambies uno de esos archivos, **sube el número en todas las líneas** (`?v=3`, `?v=4`…). Así el navegador baja los archivos nuevos juntos y no mezcla versiones viejas guardadas con las nuevas, que es lo que puede dejar el mapa sin cargar justo después de publicar.

## Navegadores

- **Chrome, Edge o Safari actualizados** (computador, Android o iPhone): el video sale en MP4.
- **Firefox**: el video sale en WebM. Funciona, pero WhatsApp a veces no lo acepta.

## Archivos

```
index.html          Página principal
config.js           Clave de Google y ciudad
css/estilos.css     Diseño (computador y celular)
js/utilidades.js    Cálculos de distancias y rumbos
js/servicios.js     Google: sugerencias, ruta a pie y Street View
js/mapa.js          Mapa, puntos y ruta
js/sugerencias.js   Lista de sugerencias mientras escribes
js/recorrido.js     Busca y baja las fotos de Street View
js/video.js         Dibuja, reproduce y graba el video
js/inicio.js        Arranque de la app
iconos/icono.svg    Ícono de la pestaña
```

## Nota sobre las imágenes

Las fotos son de Google Street View y el video siempre lleva la marca «Imágenes © Google», como pide Google. La app no guarda las fotos: se usan solo mientras la página está abierta.
