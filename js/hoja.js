/* ---------- Celular: hoja inferior que se sube y se baja (como Google Maps) ----------
   Plegada muestra el logo, el tiempo de la ruta, el botón del video y los errores (los avisos de «listo» van abajo).
   Abierta muestra también las opciones del video. En computador no hace nada. */
const hoja=$("hoja"), asa=$("hojaAsa");
let hojaAbierta=false, ignorarClick=false;

// Alto de la hoja plegada: hasta el último elemento visible de la parte de arriba
function altoPlegada(){
  let fondo=0;
  ["#hojaAsa",".top","#routeStats","#routeMsg","#prepBtn","#openBtn","#videoMsg"].forEach(sel=>{
    const el=hoja.querySelector(sel);
    if(el&&el.offsetParent!==null&&el.offsetHeight&&!el.classList.contains("ok"))fondo=Math.max(fondo,el.offsetTop+el.offsetHeight);
  });
  return Math.ceil(fondo+parseFloat(getComputedStyle(hoja).paddingBottom||0));
}
function ajustarHoja(){
  const raiz=document.documentElement.style;
  if(!isPhone()){raiz.removeProperty("--hoja-plegada");hoja.style.height="";return}
  const plegada=altoPlegada();
  raiz.setProperty("--hoja-plegada",plegada+"px");
  // abierta deja ~120 px de mapa a la vista bajo la tarjeta de direcciones (para tocarlo y cerrar)
  const libre=window.innerHeight-document.querySelector(".flotante").getBoundingClientRect().bottom-120;
  const abierta=Math.max(plegada,Math.min(hoja.scrollHeight,libre));
  hoja.style.height=(hojaAbierta?abierta:plegada)+"px";
  hoja.classList.toggle("abierta",hojaAbierta);
  asa.setAttribute("aria-expanded",String(hojaAbierta));
}
function abrirHoja(si){
  hojaAbierta=si;
  if(!si)hoja.scrollTop=0;
  ajustarHoja();
}
function plegarHoja(){if(hojaAbierta)abrirHoja(false)}

// Tocar la manija abre o cierra; deslizar hacia arriba abre y hacia abajo cierra
asa.addEventListener("click",()=>{if(ignorarClick){ignorarClick=false;return}abrirHoja(!hojaAbierta)});
let y0=null;
[asa,hoja.querySelector(".top")].forEach(el=>{
  el.addEventListener("pointerdown",e=>{
    if(!isPhone())return;
    y0=e.clientY;
    try{el.setPointerCapture(e.pointerId)}catch(_){} // que el soltar llegue aquí aunque el dedo salga de la manija
  });
  el.addEventListener("pointerup",e=>{
    if(y0===null)return;
    const dy=e.clientY-y0;y0=null;
    if(Math.abs(dy)>24){abrirHoja(dy<0);if(el===asa)ignorarClick=true}
    else if(el!==asa)abrirHoja(!hojaAbierta); // tocar el encabezado también abre/cierra
  });
  el.addEventListener("pointercancel",()=>{y0=null});
});

// Como en Google Maps: con la hoja abierta, tocar, mover o acercar el mapa la cierra
// (y ese toque no agrega un punto a la ruta)
let tragarHasta=0;
function alTocarMapa(){
  if(!isPhone()||!hojaAbierta)return;
  abrirHoja(false);
  tragarHasta=Date.now()+700;
}
function mapaClickTragado(){return Date.now()<tragarHasta}
$("map").addEventListener("pointerdown",alTocarMapa,{capture:true});
$("map").addEventListener("wheel",alTocarMapa,{capture:true,passive:true});

// Recalcular cuando cambia lo que se ve (ruta, mensajes, botones) o el tamaño de la pantalla
const vigia=new ResizeObserver(()=>requestAnimationFrame(ajustarHoja));
["#routeStats","#routeMsg","#prepBtn","#openBtn","#videoMsg",".top"].forEach(sel=>{const el=hoja.querySelector(sel);if(el)vigia.observe(el)});
vigia.observe(document.querySelector(".flotante"));
// Los mensajes cambian de lugar según su tipo (listo / error): recalcular también cuando cambia la clase
const vigiaMsg=new MutationObserver(()=>requestAnimationFrame(ajustarHoja));
["routeMsg","videoMsg"].forEach(id=>vigiaMsg.observe($(id),{attributes:true,attributeFilter:["class"],childList:true,characterData:true,subtree:true}));
window.addEventListener("resize",ajustarHoja);
ajustarHoja();
