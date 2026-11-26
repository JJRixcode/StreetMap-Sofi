// Configuración.
//
// mapillaryToken: el "Client Token" de tu app en Mapillary (empieza por "MLY|").
// Es un token de solo lectura pensado para usarse en páginas web, así que se
// puede dejar aquí aunque el repositorio sea público. Si lo dejas vacío, la app
// le pide el token a cada persona (y lo guarda solo en su navegador).
//
// ciudad: zona donde se buscan primero las direcciones y donde arranca el mapa.
window.CONFIG = {
  mapillaryToken: "",
  ciudad: {
    nombre: "Medellín",
    centro: [6.2442, -75.5812],
    zoom: 13,
    // oeste, norte, este, sur (Valle de Aburrá)
    caja: [-75.72, 6.45, -75.33, 5.98]
  }
};
