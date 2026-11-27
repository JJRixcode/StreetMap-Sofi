/**
 * Contador de fotos de Street View para «Mapa para Sofia».
 *
 * La app pregunta aquí antes de bajar las fotos de un recorrido.
 * Este script NO llama a Google Maps ni guarda ninguna clave:
 * solo lleva la cuenta de las fotos del mes y dice si alcanzan o no.
 *
 * Publicar: Implementar → Nueva implementación → Tipo: Aplicación web
 *   Ejecutar como: Yo
 *   Quién tiene acceso: Cualquier usuario
 *
 * Pedidos que entiende (GET):
 *   ?accion=estado               → cuántas fotos van y cuántas quedan este mes
 *   ?accion=reservar&n=85        → si alcanzan, suma 85 al contador y responde ok:true
 *   ?accion=devolver&n=3         → resta fotos que al final no se bajaron
 */

const TOPE_MENSUAL = 9900;          // Google regala 10.000 al mes: se deja un margen
const ZONA = 'America/Los_Angeles'; // Google renueva el cupo gratis el día 1 a medianoche, hora del Pacífico
const MAX_POR_PEDIDO = 2000;        // ningún recorrido necesita más de esto

function doGet(e) {
  const p = (e && e.parameter) || {};
  const accion = p.accion || 'estado';
  const n = Math.floor(Number(p.n) || 0);
  try {
    if (accion === 'estado') return responder(estado());
    if (accion === 'reservar') return responder(conCandado(() => reservar(n)));
    if (accion === 'devolver') return responder(conCandado(() => devolver(n)));
    return responder({ ok: false, error: 'Acción desconocida' });
  } catch (err) {
    return responder({ ok: false, error: String(err) });
  }
}

// Un contador por mes: usado_2026-11, usado_2026-12, ...
function claveMes() {
  return 'usado_' + Utilities.formatDate(new Date(), ZONA, 'yyyy-MM');
}
function leerUsado() {
  return Number(PropertiesService.getScriptProperties().getProperty(claveMes())) || 0;
}
function guardarUsado(valor) {
  PropertiesService.getScriptProperties().setProperty(claveMes(), String(valor));
}

function estado() {
  const usado = leerUsado();
  return {
    ok: true,
    mes: claveMes().slice(6),
    usado: usado,
    tope: TOPE_MENSUAL,
    quedan: Math.max(0, TOPE_MENSUAL - usado)
  };
}

function reservar(n) {
  if (n < 1 || n > MAX_POR_PEDIDO) return Object.assign(estado(), { ok: false, error: 'Cantidad inválida' });
  const usado = leerUsado();
  if (usado + n > TOPE_MENSUAL) {
    return Object.assign(estado(), { ok: false, error: 'No alcanzan las fotos gratis de este mes' });
  }
  guardarUsado(usado + n);
  return Object.assign(estado(), { ok: true, reservadas: n });
}

function devolver(n) {
  if (n < 1 || n > MAX_POR_PEDIDO) return Object.assign(estado(), { ok: false, error: 'Cantidad inválida' });
  guardarUsado(Math.max(0, leerUsado() - n));
  return Object.assign(estado(), { ok: true, devueltas: n });
}

// Candado: si llegan dos pedidos al mismo tiempo, se atienden de a uno y no se cuenta mal
function conCandado(fn) {
  const candado = LockService.getScriptLock();
  candado.waitLock(10000);
  try {
    return fn();
  } finally {
    candado.releaseLock();
  }
}

function responder(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

/**
 * Para igualar el contador con lo que ya contó Google este mes.
 * Cambia el número y dale «Ejecutar» a esta función desde el editor (no hace falta volver a publicar).
 */
function fijarUsadoEsteMes() {
  const FOTOS_YA_USADAS = 0; // ← pon aquí las fotos de Street View que Google ya contó este mes
  guardarUsado(FOTOS_YA_USADAS);
  Logger.log(JSON.stringify(estado()));
}
