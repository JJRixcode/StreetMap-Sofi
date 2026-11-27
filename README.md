# Ruta a pie en fotos

Página web para explicar cómo llegar caminando a una dirección. Pones de dónde sales y a dónde vas, y la app genera un **video caminando por fotos reales de la calle** con un mapita, los giros y la distancia que falta. El video se descarga en MP4 o se comparte directo a WhatsApp desde el celular.

Todo es **gratis y sin tarjeta**: usa OpenStreetMap para el mapa, la búsqueda y las rutas, y [Mapillary](https://www.mapillary.com) para las fotos. Corre en el navegador, sin servidor propio ni base de datos, y está publicada en GitHub Pages.

> La versión anterior con Google Street View está guardada en la rama `google`.

## Qué hace

- Mientras escribes, **sugiere lugares y direcciones** (como Google Maps). También puedes marcar los puntos tocando el mapa.
- Calcula la ruta a pie.
- Muestra en **verde** las calles que tienen fotos. Si la ruta va por calles sin fotos, **toca el mapa** sobre una calle verde para que pase por ahí. Los puntos se pueden arrastrar y, si tocas uno, se quita.
- Elige una foto cada pocos metros: cerca de la ruta, mirando hacia donde vas, reciente y, si se puede, de la misma secuencia que la anterior para que el video se vea continuo.
- Con fotos 360° la cámara mira hacia donde vas y gira en las esquinas ("Gira a la derecha / izquierda"). Con fotos normales hace corte directo.
- Graba el video en horizontal (16:9) o vertical (9:16, para WhatsApp e historias).
- Funciona en computador y en celular.

## Servicios que usa (todos gratis)

| Para qué | Servicio | ¿Pide registro? |
|---|---|---|
| Mapa | Teselas de [OpenStreetMap](https://www.openstreetmap.org) con [Leaflet](https://leafletjs.com) | No |
| Buscar y sugerir direcciones | [Photon](https://photon.komoot.io) y, si no encuentra, [Nominatim](https://nominatim.org). Opcional: [TomTom](https://developer.tomtom.com) | No (TomTom: clave gratis) |
| Ruta a pie | [OSRM de OpenStreetMap Alemania](https://routing.openstreetmap.de) | No |
| Fotos y calles en verde | [Mapillary](https://www.mapillary.com) | Sí: token gratis |

Los servicios de OpenStreetMap son públicos y tienen reglas de uso justo: sirven para una app como esta, no para miles de consultas por minuto.

## El token de Mapillary

1. Crea una cuenta gratis en [mapillary.com](https://www.mapillary.com/signup). No pide tarjeta.
2. Entra a [Dashboard → Developers](https://www.mapillary.com/dashboard/developers) y dale **Register application**.
3. Ponle un nombre y una descripción. En *Website* pon `https://jjrixcode.github.io/StreetMap-Sofi/` y marca el permiso **Read**.
4. Copia el **Client Token** (empieza por `MLY|`).

### ¿Dónde se pone?

Ya está puesto en `config.js`, así que la app no lo pide. Ojo: usa el **Client Token**, no el *Client Secret*. Los dos empiezan por `MLY|`, pero con el secreto el mapa carga y las fotos no aparecen.

- **En la app:** pégalo en la tarjeta «1 · Token de Mapillary» y dale *Guardar*. Se guarda solo en ese navegador.
- **Fijo en `config.js`**, para que nadie tenga que pegarlo. El *Client Token* es de solo lectura y está hecho para usarse en páginas web, así que se puede dejar en el código:

```js
window.CONFIG = {
  mapillaryToken: "MLY|...tu token...",
  ...
};
```

En `config.js` también está la ciudad donde se buscan primero las direcciones (por defecto, Medellín y el Valle de Aburrá).

### Mejores direcciones con TomTom (opcional)

Los datos gratis de OpenStreetMap encuentran bien muchos lugares (centros comerciales, estaciones, barrios), pero en Medellín tienen pocas direcciones exactas y les faltan sitios como el Parque Lleras. Si pones una clave gratis de [TomTom](https://developer.tomtom.com) (no pide tarjeta, 2.500 búsquedas al día) en `tomtomKey` de `config.js`, la app usa TomTom para las sugerencias y deja OpenStreetMap como respaldo.

## Uso

1. Escribe **Desde** y **Hasta** y elige de la lista de sugerencias, o toca **📍 Mapa** y marca el punto. Al elegir los dos, la ruta se calcula sola. Si una dirección tipo «Calle 10 # 43A-20» queda corrida, arrastra el punto.
2. **Calcular ruta a pie.** Si la ruta va por calles sin verde, toca el mapa sobre una calle verde.
3. Elige formato y velocidad, y dale **Preparar recorrido**. Si hay tramos sin fotos, la app te avisa.
4. **▶ Ver** para revisarlo y **⬇ Descargar video** para grabarlo. En el celular aparece **Compartir** para mandarlo directo por WhatsApp.

Mientras graba, deja la página abierta: el video se graba en tiempo real.

## Probarla en tu computador

```bash
python3 -m http.server 8000
```

y abre `http://localhost:8000`.

## Navegadores

- **Chrome, Edge o Safari actualizados** (computador, Android o iPhone): el video sale en MP4.
- **Firefox**: el video sale en WebM. Funciona, pero WhatsApp a veces no lo acepta.

## Archivos

```
index.html          Página principal
config.js           Token de Mapillary y ciudad
css/estilos.css     Diseño (computador y celular)
js/utilidades.js    Cálculos de distancias y rumbos
js/servicios.js     Búsqueda, rutas y consultas a Mapillary
js/sugerencias.js   Lista de sugerencias mientras escribes
js/panoramica.js    Recorta las fotos 360° hacia donde vas
js/mapa.js          Mapa, puntos, ruta y calles con fotos
js/recorrido.js     Elige y baja las fotos a lo largo de la ruta
js/video.js         Dibuja, reproduce y graba el video
js/inicio.js        Arranque de la app
iconos/icono.svg    Ícono de la pestaña
```

## Nota sobre las imágenes

Las fotos son de Mapillary, publicadas por sus autores con licencia [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/). Por eso el video siempre lleva la marca «Fotos: Mapillary (CC BY-SA)». El mapa es © colaboradores de OpenStreetMap. La app no guarda las fotos: se usan solo mientras la página está abierta.
