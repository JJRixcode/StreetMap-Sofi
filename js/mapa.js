/* ---------- Map & route editing (Google Maps) ---------- */
let map=null, gm=null, mapLoading=null;
function loadMap(){
  if(map||mapLoading)return mapLoading;
  if(!key())return null;
  mapLoading=new Promise((resolve,reject)=>{
    window.__svInit=()=>{
      gm=google.maps;
      map=new gm.Map($("map"),{center:{lat:4.65,lng:-74.06},zoom:13,clickableIcons:false,
        streetViewControl:false,mapTypeControl:false,fullscreenControl:false,gestureHandling:isPhone()?"cooperative":"greedy"});
      map.addListener("click",e=>onMapClick([e.latLng.lat(),e.latLng.lng()]));
      resolve();
    };
    window.gm_authFailure=()=>setMsg($("keyMsg"),"Google rechazó la clave para el mapa. Revisa que la «Maps JavaScript API» esté activada y que la clave permita este sitio.","err");
    const sc=document.createElement("script");
    sc.src="https://maps.googleapis.com/maps/api/js?"+new URLSearchParams({key:key(),v:"weekly",language:"es",callback:"__svInit"});
    sc.async=true;sc.onerror=()=>{mapLoading=null;reject(new Error("No se pudo cargar el mapa de Google. Revisa tu conexión."))};
    document.head.appendChild(sc);
  });
  mapLoading.catch(e=>setMsg($("keyMsg"),e.message,"err"));
  return mapLoading;
}
const LL=p=>({lat:p[0],lng:p[1]});
function endIcon(color){return {path:gm.SymbolPath.CIRCLE,scale:13,fillColor:color,fillOpacity:1,strokeColor:"#fff",strokeWeight:3}}
const wpIcon=()=>({path:gm.SymbolPath.CIRCLE,scale:7,fillColor:"#fff",fillOpacity:1,strokeColor:"#1a73e8",strokeWeight:4});

const state={from:null,to:null,waypoints:[],path:null,frames:null,pick:null};
let lastBounds=null, routeLine=null, fromMarker=null, toMarker=null, wpMarkers=[];

function placeEnd(which,pos,name){
  state[which]={pos,name};
  if(!map)return;
  let m=which==="from"?fromMarker:toMarker;
  if(m)m.setPosition(LL(pos));else{
    m=new gm.Marker({map,position:LL(pos),draggable:true,zIndex:10,icon:endIcon(which==="from"?"#188038":"#d93025"),
      label:{text:which==="from"?"A":"B",color:"#fff",fontWeight:"700",fontSize:"12px"}});
    m.addListener("dragend",async()=>{
      const p=[m.getPosition().lat(),m.getPosition().lng()];
      state[which].pos=p;state[which].name=await reverseGeocode(p);
      $(which).value=state[which].name;
      if(which==="to")$("title").value=shortName(state.to.name);
      route();
    });
    if(which==="from")fromMarker=m;else toMarker=m;
  }
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
  if(which)setMsg($("routeMsg"),"Toca el mapa en el punto de "+(which==="from"?"salida":"llegada")+".");
}
document.querySelectorAll(".pick").forEach(b=>b.onclick=()=>{
  if(!key()||!map){needKeySafe();loadMap();return}
  setPick(state.pick===b.dataset.pick?null:b.dataset.pick)});
function needKeySafe(){try{needKey()}catch(e){}}

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
      lastBounds=b;
    }
    $("stDist").textContent=fmtDist(state.path.length);
    $("stTime").textContent=fmtTime(state.path.length);
    $("routeStats").hidden=false;$("routeHint").hidden=false;
    const est=Math.ceil(state.path.length/+$("step").value)+1;
    setMsg($("routeMsg"),"Listo. El video usará aprox. "+est+" fotos de Street View.","ok");
    $("prepBtn").disabled=false;
    return b||true;
  }catch(e){
    if(my!==routeSeq)return;
    setMsg($("routeMsg"),explain(e),"err");
  }
}
$("routeBtn").onclick=async()=>{
  try{needKey()}catch(e){return}
  try{await loadMap()}catch(e){return}
  const f=$("from").value.trim(),t=$("to").value.trim();
  if(!f||!t){setMsg($("routeMsg"),"Escribe las dos direcciones (o elígelas en el mapa).","err");return}
  setMsg($("routeMsg"),"Buscando direcciones…");
  try{
    if(!state.from||state.from.name!==f){const g=await geocode(f);placeEnd("from",g.pos,g.name);$("from").value=g.name}
    if(!state.to||state.to.name!==t){const g=await geocode(t);placeEnd("to",g.pos,g.name);$("to").value=g.name;$("title").value=shortName(g.name)}
    state.waypoints=[];drawWaypoints();
    const b=await route();
    if(b&&b!==true)map.fitBounds(b,30);
    if(b&&isPhone())$("map").scrollIntoView({behavior:"smooth",block:"start"});
  }catch(e){setMsg($("routeMsg"),explain(e),"err")}
};
["from","to"].forEach(id=>$(id).addEventListener("keydown",e=>{if(e.key==="Enter")$("routeBtn").click()}));
