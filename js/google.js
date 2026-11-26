/* ---------- Google APIs ---------- */
const CONFIG_KEY = ((window.CONFIG && window.CONFIG.apiKey) || "").trim();
const key = () => CONFIG_KEY || $("apiKey").value.trim();
function needKey(){
  if(!key()){setMsg($("keyMsg"),"Primero pega tu clave de Google.","err");$("apiKey").focus();throw new Error("sin clave")}
}
function explain(err){
  const m=String(err&&err.message||err);
  if(/Routes API has not been used|routes\.googleapis\.com.*disabled|SERVICE_DISABLED.*routes/i.test(m))return "La Routes API no está activada en tu proyecto. Actívala en Google Cloud y espera un par de minutos.";
  if(/not authorized to use this API|REQUEST_DENIED/i.test(m))return "Google rechazó la clave para esta API. Revisa que estén activadas Maps JavaScript, Geocoding, Routes y Street View Static y que la clave no las esté bloqueando.\n\nDetalle: "+m;
  if(/API key not valid|API_KEY_INVALID/i.test(m))return "La clave no es válida. Cópiala de nuevo desde Google Cloud.";
  if(/billing/i.test(m))return "Google pide activar la facturación del proyecto para usar la API (no cobra dentro del cupo gratis).";
  return m;
}
async function geocode(q){
  const ll=q.match(/^\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*$/);
  if(ll)return {pos:[+ll[1],+ll[2]],name:q.trim()};
  const gmUrl=q.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
  if(gmUrl)return {pos:[+gmUrl[1],+gmUrl[2]],name:"Punto del mapa"};
  needKey();
  await loadMap();
  const req={address:q,language:"es"};
  if(lastBounds)req.bounds=lastBounds;
  let r;
  try{r=await new gm.Geocoder().geocode(req)}
  catch(e){
    if(/ZERO_RESULTS/.test(String(e&&(e.code||e.message))))throw new Error("No encontré «"+q+"». Prueba agregando la ciudad, o elige el punto en el mapa.");
    throw e;
  }
  if(!r.results||!r.results.length)throw new Error("No encontré «"+q+"». Prueba agregando la ciudad, o elige el punto en el mapa.");
  const g0=r.results[0];
  return {pos:[g0.geometry.location.lat(),g0.geometry.location.lng()],name:g0.formatted_address};
}
async function reverseGeocode(pos){
  try{
    await loadMap();
    const r=await new gm.Geocoder().geocode({location:{lat:pos[0],lng:pos[1]},language:"es"});
    if(r.results&&r.results.length)return r.results[0].formatted_address;
  }catch(e){}
  return pos[0].toFixed(6)+", "+pos[1].toFixed(6);
}
async function computeRoute(points){
  needKey();
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
  if(!res.ok){if(res.status===403)throw new Error(await res.text());return null}
  const bmp=await createImageBitmap(await res.blob());
  imgCache.set(url,bmp);
  return bmp;
}
