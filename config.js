// Configuración.
//
// googleKey: clave de Google Maps Platform. Queda pública en esta página, por eso
// en Google Cloud está restringida a https://jjrixcode.github.io/* (y localhost
// para pruebas), solo a las 5 APIs que usa la app y con límites diarios.
//
// contador: Google Apps Script que lleva la cuenta de las fotos de Street View del mes
// (código en apps-script/contador.gs). Antes de bajar fotos la app le pregunta si alcanzan;
// si se acaban las gratis del mes, no deja bajar más. Si se borra, no hay límite mensual.
//
// ciudad: zona donde se buscan primero las direcciones y donde arranca el mapa.
window.CONFIG = {
  googleKey: "AIzaSyDvEwLVUBoHsp4ddu4Fh17ZFcbY67TATrA",
  contador: "https://script.google.com/macros/s/AKfycbzJonA4q4rXV28erbNWIUxTqIMn4Z43wdmzD_kjiCDtL0C1lMSDYGrta5OIMnbSZrLpVQ/exec",
  ciudad: {
    nombre: "Medellín",
    centro: [6.2442, -75.5812],
    zoom: 13,
    radio: 30000 // metros alrededor del centro para sugerir lugares
  }
};
