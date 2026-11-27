/* ---------- Servicios de Google: búsqueda, ruta a pie y Street View ---------- */
const CFG = window.CONFIG || {};
const CIUDAD = CFG.ciudad || {nombre:"Medellín",centro:[6.2442,-75.5812],zoom:13,radio:30000};
const key = () => (CFG.googleKey||"").trim();
function explain(err){
  const m=String(err&&err.message||err);
  if(/RefererNotAllowed|referer|API_KEY_HTTP_REFERRER_BLOCKED/i.test(m))return "Google rechazó la clave desde esta dirección. La clave solo funciona en la página publicada.";
  if(/quota|RESOURCE_EXHAUSTED|OVER_QUERY_LIMIT|429/i.test(m))return "Se llegó al límite diario gratis de Google. Vuelve a intentar mañana.";
  if(/not authorized to use this API|REQUEST_DENIED|PERMISSION_DENIED|SERVICE_DISABLED/i.test(m))return "Google rechazó la clave para esta función.\n\nDetalle: "+m;
  if(/API key not valid|API_KEY_INVALID/i.test(m))return "La clave de Google no es válida.";
  if(/Failed to fetch|NetworkError|Load failed/i.test(m))return "No hubo conexión. Revisa tu internet e intenta otra vez.";
  return m;
}

/* ---------- Sugerencias: Places API (New) ---------- */
let placesSession=null;
const newSession=()=>placesSession=(crypto.randomUUID?crypto.randomUUID():String(Math.random()).slice(2));
const sugCache=new Map();
/* "Cra 70 # 44-20" → "Carrera 70 # 44-20": Google confunde las abreviaturas (lee "Cra" como "Calle"). */
const VIAS=[[/^(cra|crr|cr|kra|kr|k)\.?\s*(?=\d)/i,"Carrera "],[/^(cll|clle|cl)\.?\s*(?=\d)/i,"Calle "],[/^(av|avda)\.?\s*(?=\d)/i,"Avenida "],
  [/^(dg|diag)\.?\s*(?=\d)/i,"Diagonal "],[/^(tv|tr|transv)\.?\s*(?=\d)/i,"Transversal "],[/^(cq|cir|circ)\.?\s*(?=\d)/i,"Circular "]];
function expandir(q){for(const [re,full] of VIAS)if(re.test(q))return q.replace(re,full);return q}
async function suggest(q,limit=5){
  q=expandir(q.trim());if(q.length<3)return [];
  if(sugCache.has(q))return sugCache.get(q);
  if(!placesSession)newSession();
  const res=await fetch("https://places.googleapis.com/v1/places:autocomplete",{method:"POST",
    headers:{"Content-Type":"application/json","X-Goog-Api-Key":key()},
    body:JSON.stringify({input:q,languageCode:"es",regionCode:"co",includedRegionCodes:["co"],sessionToken:placesSession,
      locationBias:{circle:{center:{latitude:CIUDAD.centro[0],longitude:CIUDAD.centro[1]},radius:CIUDAD.radio}}})});
  const j=await res.json();
  if(!res.ok)throw new Error(j.error?j.error.message:"Error "+res.status);
  let out=(j.suggestions||[]).filter(s=>s.placePrediction).map(s=>{
    const p=s.placePrediction, f=p.structuredFormat||{};
    return {placeId:p.placeId,name:(f.mainText&&f.mainText.text)||p.text.text,detail:(f.secondaryText&&f.secondaryText.text)||""};
  });
  // si escribió "Carrera ...", primero las carreras (Google a veces pone antes "Calle ...")
  const via=(q.match(/^(Carrera|Calle|Avenida|Diagonal|Transversal|Circular)\s/)||[])[1];
  if(via){const ok=r=>expandir(r.name).toLowerCase().startsWith(via.toLowerCase())?0:1;out=out.map((r,i)=>[r,i]).sort((a,b)=>ok(a[0])-ok(b[0])||a[1]-b[1]).map(x=>x[0])}
  out=out.slice(0,limit);
  sugCache.set(q,out);
  return out;
}
/* Ubicación de una sugerencia (cierra la sesión de búsqueda: así Google la cobra como una sola). */
async function placeLocation(s){
  if(s.pos)return s;
  const res=await fetch("https://places.googleapis.com/v1/places/"+encodeURIComponent(s.placeId)+"?"+new URLSearchParams({
    sessionToken:placesSession||"",languageCode:"es"}),{headers:{"X-Goog-Api-Key":key(),"X-Goog-FieldMask":"location"}});
  const j=await res.json();
  placesSession=null;
  if(!res.ok||!j.location)throw new Error(j.error?j.error.message:"No pude ubicar ese lugar.");
  return {...s,pos:[j.location.latitude,j.location.longitude]};
}
async function geocode(q){
  const ll=q.match(/^\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*$/);
  if(ll)return {pos:[+ll[1],+ll[2]],name:q.trim()};
  const gmUrl=q.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
  if(gmUrl)return {pos:[+gmUrl[1],+gmUrl[2]],name:"Punto del mapa"};
  const s=await suggest(q,1);
  if(!s.length)throw new Error("No encontré «"+q+"». Escribe y elige de la lista, o marca el punto en el mapa.");
  return placeLocation(s[0]);
}
async function reverseGeocode(pos){
  try{
    await loadMap();
    const r=await new gm.Geocoder().geocode({location:{lat:pos[0],lng:pos[1]},language:"es"});
    if(r.results&&r.results.length)return r.results[0].formatted_address.replace(/, Colombia$/,"");
  }catch(e){}
  return pos[0].toFixed(6)+", "+pos[1].toFixed(6);
}

/* ---------- Ruta a pie: Routes API ---------- */
async function computeRoute(points){
  const L=p=>({location:{latLng:{latitude:p[0],longitude:p[1]}}});
  const body={origin:L(points[0]),destination:L(points[points.length-1]),
    intermediates:points.slice(1,-1).map(L),travelMode:"WALK",languageCode:"es"};
  const res=await fetch("https://routes.googleapis.com/directions/v2:computeRoutes",{method:"POST",
    headers:{"Content-Type":"application/json","X-Goog-Api-Key":key(),
      "X-Goog-FieldMask":"routes.distanceMeters,routes.duration,routes.polyline.encodedPolyline"},
    body:JSON.stringify(body)});
  const j=await res.json();
  if(!res.ok)throw new Error(j.error?j.error.message:("Error "+res.status));
  if(!j.routes||!j.routes.length)throw new Error("Google no encontró una ruta a pie entre esos puntos.");
  return decodePolyline(j.routes[0].polyline.encodedPolyline);
}

/* ---------- Street View Static API ---------- */
/* La consulta de metadatos es gratis: sirve para saber si hay foto y dónde. */
async function svMeta(pos,radius){
  const p=new URLSearchParams({location:pos.join(","),radius:String(radius),source:"outdoor",key:key()});
  const r=await (await fetch("https://maps.googleapis.com/maps/api/streetview/metadata?"+p)).json();
  if(r.status==="OK")return {pano:r.pano_id,pos:[r.location.lat,r.location.lng]};
  if(r.status==="ZERO_RESULTS"||r.status==="NOT_FOUND")return null;
  throw new Error(r.error_message||r.status);
}
const imgCache=new Map();
async function svImage(pano,heading,fmt){
  const [w,h,fov]=fmt==="v"?[360,640,62]:[640,360,90];
  const p=new URLSearchParams({size:w+"x"+h,pano,heading:heading.toFixed(1),pitch:"0",fov:String(fov),
    return_error_code:"true",key:key()});
  const url="https://maps.googleapis.com/maps/api/streetview?"+p;
  if(imgCache.has(url))return imgCache.get(url);
  const res=await fetch(url);
  if(!res.ok){if(res.status===403||res.status===429)throw new Error(await res.text()||("Error "+res.status));return null}
  const bmp=await createImageBitmap(await res.blob());
  imgCache.set(url,bmp);
  return bmp;
}
