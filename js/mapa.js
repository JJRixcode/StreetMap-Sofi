/* ---------- Mapa y edición de la ruta (Leaflet + OpenStreetMap) ---------- */
let map=null, coverage=null;
function loadMap(){
  if(map)return map;
  map=L.map("map",{zoomControl:true}).setView(CIUDAD.centro,CIUDAD.zoom);
  L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png",{maxZoom:19,
    attribution:'© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> · Fotos <a href="https://www.mapillary.com" target="_blank" rel="noopener">Mapillary</a>'}).addTo(map);
  map.on("click",e=>onMapClick([e.latlng.lat,e.latlng.lng]));
  showCoverage();
  return map;
}
/* Calles con fotos de Mapillary, en verde. */
function showCoverage(){
  if(!map)return;
  if(coverage){map.removeLayer(coverage);coverage=null}
  if(!key()||!L.vectorGrid)return;
  coverage=L.vectorGrid.protobuf("https://tiles.mapillary.com/maps/vtp/mly1_public/2/{z}/{x}/{y}?access_token="+encodeURIComponent(key()),{
    maxNativeZoom:14,minZoom:6,interactive:false,pane:"overlayPane",
    vectorTileLayerStyles:{
      // Mapillary solo da teselas hasta zoom 14: al acercar se agrandan, por eso la línea es fina
      sequence:{color:"#05cb63",weight:.8,opacity:.6},
      image:[],overview:[]
    }
  }).addTo(map);
}
const LL=p=>L.latLng(p[0],p[1]);
const endIcon=(color,text)=>L.divIcon({className:"pin",iconSize:[30,30],iconAnchor:[15,15],
  html:`<span style="background:${color}">${text}</span>`});
const wpIcon=()=>L.divIcon({className:"wp",iconSize:[18,18],iconAnchor:[9,9],html:"<span></span>"});

const state={from:null,to:null,waypoints:[],path:null,frames:null,pick:null};
let routeLine=null, fromMarker=null, toMarker=null, wpMarkers=[];

function placeEnd(which,pos,name){
  state[which]={pos,name};
  if(!map)return;
  let m=which==="from"?fromMarker:toMarker;
  if(m){m.setLatLng(LL(pos));return}
  m=L.marker(LL(pos),{draggable:true,zIndexOffset:1000,
    icon:endIcon(which==="from"?"#188038":"#d93025",which==="from"?"A":"B")}).addTo(map);
  m.on("dragend",async()=>{
    const ll=m.getLatLng(), p=[ll.lat,ll.lng];
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
  wpMarkers.forEach(m=>m.remove());wpMarkers=[];
  if(!map)return;
  state.waypoints.forEach((p,i)=>{
    const m=L.marker(LL(p),{draggable:true,icon:wpIcon(),title:"Tócalo para quitarlo",zIndexOffset:500}).addTo(map);
    m.on("dragend",()=>{const ll=m.getLatLng();state.waypoints[i]=[ll.lat,ll.lng];route()});
    m.on("click",()=>{state.waypoints.splice(i,1);drawWaypoints();route()});
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
  $("map").classList.toggle("picking",!!which);
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
      if(routeLine)routeLine.remove();
      routeLine=L.polyline(pts,{color:"#1a73e8",weight:6,opacity:.85}).addTo(map);
      b=routeLine.getBounds();
    }
    $("stDist").textContent=fmtDist(state.path.length);
    $("stTime").textContent=fmtTime(state.path.length);
    $("routeStats").hidden=false;$("routeHint").hidden=false;
    if(state.path.length>15000){
      setMsg($("routeMsg"),"La ruta mide "+fmtDist(state.path.length)+". Revisa que los puntos A y B quedaron donde querías (puedes arrastrarlos).","err");
      $("prepBtn").disabled=true;
      return b||true;
    }
    setMsg($("routeMsg"),"Listo. Ahora prepara el recorrido para ver qué fotos hay.","ok");
    $("prepBtn").disabled=false;
    return b||true;
  }catch(e){
    if(my!==routeSeq)return;
    setMsg($("routeMsg"),explain(e),"err");
  }
}
$("routeBtn").onclick=async()=>{
  loadMap();
  const f=$("from").value.trim(),t=$("to").value.trim();
  if(!f||!t){setMsg($("routeMsg"),"Escribe las dos direcciones (o elígelas en el mapa).","err");return}
  setMsg($("routeMsg"),"Buscando direcciones…");
  try{
    if(!state.from||state.from.name!==f){const g=await geocode(f);placeEnd("from",g.pos,g.name);$("from").value=g.name}
    if(!state.to||state.to.name!==t){const g=await geocode(t);placeEnd("to",g.pos,g.name);$("to").value=g.name;$("title").value=shortName(g.name)}
    state.waypoints=[];drawWaypoints();
    const b=await route();
    if(b&&b!==true)map.fitBounds(b,{padding:[30,30]});
    if(b&&isPhone())$("map").scrollIntoView({behavior:"smooth",block:"start"});
  }catch(e){setMsg($("routeMsg"),explain(e),"err")}
};
["from","to"].forEach(id=>$(id).addEventListener("keydown",e=>{if(e.key==="Enter")$("routeBtn").click()}));
