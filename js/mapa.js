/* ---------- Mapa y edición de la ruta (Google Maps) ---------- */
let map=null, gm=null, mapLoading=null;
function loadMap(){
  if(mapLoading)return mapLoading;
  mapLoading=new Promise((resolve,reject)=>{
    window.__svInit=()=>{
      gm=google.maps;
      map=new gm.Map($("map"),{center:{lat:CIUDAD.centro[0],lng:CIUDAD.centro[1]},zoom:CIUDAD.zoom,clickableIcons:false,
        streetViewControl:false,mapTypeControl:false,fullscreenControl:false,gestureHandling:isPhone()?"cooperative":"greedy"});
      map.addListener("click",e=>onMapClick([e.latLng.lat(),e.latLng.lng()]));
      resolve();
    };
    window.gm_authFailure=()=>setMsg($("routeMsg"),"Google rechazó la clave para el mapa. La clave solo funciona en la página publicada.","err");
    const sc=document.createElement("script");
    sc.src="https://maps.googleapis.com/maps/api/js?"+new URLSearchParams({key:key(),v:"weekly",language:"es",region:"CO",callback:"__svInit"});
    sc.async=true;sc.onerror=()=>{mapLoading=null;reject(new Error("No se pudo cargar el mapa de Google. Revisa tu conexión."))};
    document.head.appendChild(sc);
  });
  mapLoading.catch(e=>setMsg($("routeMsg"),e.message,"err"));
  return mapLoading;
}
const LL=p=>({lat:p[0],lng:p[1]});
function focusMap(pos){if(map){map.panTo(LL(pos));if(map.getZoom()<16)map.setZoom(16)}}
function fitRoute(b){if(map&&b&&b!==true)map.fitBounds(b,30)}
/* Capibara pequeña con la letra A o B; el punto exacto queda en el centro del cuerpo */
function endIcon(which){return {url:"iconos/capi-"+(which==="from"?"a":"b")+".svg?v=2",scaledSize:new gm.Size(42,37),anchor:new gm.Point(18,22)}}
const wpIcon=()=>({path:gm.SymbolPath.CIRCLE,scale:7,fillColor:"#fff",fillOpacity:1,strokeColor:"#1a73e8",strokeWeight:4});

const state={from:null,to:null,waypoints:[],path:null,frames:null,pick:null};
let routeLine=null, fromMarker=null, toMarker=null, wpMarkers=[];

function placeEnd(which,pos,name){
  state[which]={pos,name};
  if(!map)return;
  let m=which==="from"?fromMarker:toMarker;
  if(m){m.setPosition(LL(pos));return}
  m=new gm.Marker({map,position:LL(pos),draggable:true,zIndex:10,icon:endIcon(which),
    title:which==="from"?"A · Desde (arrástrala para moverla)":"B · Hasta (arrástrala para moverla)"});
  m.addListener("dragend",async()=>{
    const p=[m.getPosition().lat(),m.getPosition().lng()];
    state[which].pos=p;
    $(which).value="Buscando dirección…";
    state[which].name=await reverseGeocode(p);
    $(which).value=state[which].name;
    if(which==="to")$("title").value=shortName(state.to.name);
    if(state.from&&state.to)route();
  });
  if(which==="from")fromMarker=m;else toMarker=m;
}
function shortName(n){return (n||"").split(",").slice(0,1).join(",").trim()}
function drawWaypoints(){
  wpMarkers.forEach(m=>m.setMap(null));wpMarkers=[];
  if(!map)return;
  state.waypoints.forEach((p,i)=>{
    const m=new gm.Marker({map,position:LL(p),draggable:true,icon:wpIcon(),title:"Tócalo para quitarlo",zIndex:5});
    m.addListener("dragend",()=>{state.waypoints[i]=[m.getPosition().lat(),m.getPosition().lng()];route()});
    m.addListener("click",()=>{state.waypoints.splice(i,1);drawWaypoints();route()});
    wpMarkers.push(m);
  });
}
function insertWaypoint(p){
  const seq=[state.from.pos,...state.waypoints,state.to.pos];
  let best=0,bestCost=Infinity;
  for(let i=0;i<seq.length-1;i++){
    const c=dist(seq[i],p)+dist(p,seq[i+1])-dist(seq[i],seq[i+1]);
    if(c<bestCost){bestCost=c;best=i}
  }
  state.waypoints.splice(best,0,p);
}
async function onMapClick(p){
  if(state.pick){
    const which=state.pick;setPick(null);
    placeEnd(which,p,"…");
    $(which).value="Buscando dirección…";
    state[which].name=await reverseGeocode(p);
    $(which).value=state[which].name;
    if(which==="to")$("title").value=shortName(state.to.name);
    if(state.from&&state.to)route();
    return;
  }
  if(state.path&&state.waypoints.length<10){insertWaypoint(p);drawWaypoints();route()}
}
function setPick(which){
  state.pick=which;
  document.querySelectorAll(".pick").forEach(b=>b.classList.toggle("on",b.dataset.pick===which));
  if(map)map.setOptions({draggableCursor:which?"crosshair":null});
  if(which){
    setMsg($("routeMsg"),"Toca el mapa en el punto de "+(which==="from"?"salida":"llegada")+".");
    if(isPhone())$("map").scrollIntoView({behavior:"smooth",block:"start"});
  }
}
document.querySelectorAll(".pick").forEach(b=>b.onclick=()=>setPick(state.pick===b.dataset.pick?null:b.dataset.pick));

let routeSeq=0;
async function route(){
  const my=++routeSeq;
  invalidateFrames();
  setMsg($("routeMsg"),"Calculando ruta…");
  try{
    const pts=await computeRoute([state.from.pos,...state.waypoints,state.to.pos]);
    if(my!==routeSeq)return;
    state.path=new Path(pts);
    let b=null;
    if(map){
      if(routeLine)routeLine.setMap(null);
      routeLine=new gm.Polyline({map,path:pts.map(LL),strokeColor:"#1a73e8",strokeWeight:6,strokeOpacity:.85});
      routeLine.addListener("click",e=>onMapClick([e.latLng.lat(),e.latLng.lng()]));
      b=new gm.LatLngBounds();pts.forEach(p=>b.extend(LL(p)));
    }
    $("stDist").textContent=fmtDist(state.path.length);
    $("stTime").textContent=fmtTime(state.path.length);
    $("routeStats").hidden=false;$("routeHint").hidden=false;
    if(state.path.length>15000){
      setMsg($("routeMsg"),"La ruta mide "+fmtDist(state.path.length)+". Revisa que los puntos A y B quedaron donde querías (puedes arrastrarlos).","err");
      $("prepBtn").disabled=true;
      return b||true;
    }
    const est=Math.ceil(state.path.length/+$("step").value)+1;
    setMsg($("routeMsg"),"Listo. El video usará unas "+est+" fotos de Street View.","ok");
    $("prepBtn").disabled=false;
    return b||true;
  }catch(e){
    if(my!==routeSeq)return;
    setMsg($("routeMsg"),explain(e),"err");
  }
}
$("routeBtn").onclick=async()=>{
  try{await loadMap()}catch(e){return}
  const f=$("from").value.trim(),t=$("to").value.trim();
  if(!f||!t){setMsg($("routeMsg"),"Escribe las dos direcciones (o elígelas en el mapa).","err");return}
  setMsg($("routeMsg"),"Buscando direcciones…");
  try{
    if(!state.from||state.from.name!==f){const g=await geocode(f);placeEnd("from",g.pos,g.name);$("from").value=g.name}
    if(!state.to||state.to.name!==t){const g=await geocode(t);placeEnd("to",g.pos,g.name);$("to").value=g.name;$("title").value=shortName(g.name)}
    state.waypoints=[];drawWaypoints();
    const b=await route();
    fitRoute(b);
    if(b&&isPhone())$("map").scrollIntoView({behavior:"smooth",block:"start"});
  }catch(e){setMsg($("routeMsg"),explain(e),"err")}
};
/* Usar mi ubicación como punto de partida (A) */
$("myLocBtn").onclick=()=>{
  const btn=$("myLocBtn");
  if(!navigator.geolocation){setMsg($("routeMsg"),"Este navegador no puede darte tu ubicación. Marca el punto con el botón Mapa.","err");return}
  btn.disabled=true;setPick(null);
  setMsg($("routeMsg"),"Buscando tu ubicación…");
  navigator.geolocation.getCurrentPosition(async p=>{
    try{
      await loadMap();
      const pos=[p.coords.latitude,p.coords.longitude], acc=Math.round(p.coords.accuracy||0);
      placeEnd("from",pos,"Tu ubicación");
      $("from").value="Buscando dirección…";
      const name=await reverseGeocode(pos);
      state.from.name=name;$("from").value=name;
      const aviso=acc>100?" Tu ubicación es aproximada (unos "+acc+" m): si la capibara A quedó corrida, arrástrala.":"";
      if(state.to){
        const b=await route();fitRoute(b);
        if(aviso&&b)setMsg($("routeMsg"),$("routeMsg").textContent+aviso,"ok");
      }else{
        focusMap(pos);
        setMsg($("routeMsg"),"Listo, sales desde tu ubicación. Ahora escribe a dónde vas."+aviso,"ok");
        $("to").focus();
      }
    }catch(e){setMsg($("routeMsg"),explain(e),"err")}
    finally{btn.disabled=false}
  },e=>{
    btn.disabled=false;
    setMsg($("routeMsg"),e.code===1
      ?"No diste permiso para usar tu ubicación. Actívalo en el navegador (el candado junto a la dirección de la página) e intenta otra vez."
      :"No pude encontrar tu ubicación. Intenta otra vez o marca el punto con el botón Mapa.","err");
  },{enableHighAccuracy:true,timeout:15000,maximumAge:60000});
};
["from","to"].forEach(id=>$(id).addEventListener("keydown",e=>{
  if(e.key!=="Enter")return;
  const l=$("sugg-"+id);if(l&&!l.hidden)return; // Enter elige la sugerencia
  $("routeBtn").click();
}));
