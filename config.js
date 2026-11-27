// Configuración.
//
// googleKey: clave de Google Maps Platform. Queda pública en esta página, por eso
// en Google Cloud está restringida a https://jjrixcode.github.io/* (y localhost
// para pruebas), solo a las 5 APIs que usa la app y con límites diarios.
//
// ciudad: zona donde se buscan primero las direcciones y donde arranca el mapa.
window.CONFIG = {
  googleKey: "AIzaSyDvEwLVUBoHsp4ddu4Fh17ZFcbY67TATrA",
  ciudad: {
    nombre: "Medellín",
    centro: [6.2442, -75.5812],
    zoom: 13,
    radio: 30000 // metros alrededor del centro para sugerir lugares
  }
};
