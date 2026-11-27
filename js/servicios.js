/* ---------- Servicios gratis: OpenStreetMap (búsqueda y rutas) y Mapillary (fotos) ---------- */
const CFG = window.CONFIG || {};
const CIUDAD = CFG.ciudad || {nombre:"Medellín",centro:[6.2442,-75.5812],zoom:13,caja:[-75.72,6.45,-75.33,5.98]};
const CONFIG_KEY = (CFG.mapillaryToken || "").trim();
const key = () => CONFIG_KEY || $("apiKey").value.trim();
function needKey(){
  if(!key()){setMsg($("keyMsg"),"Primero pega tu token de Mapillary.","err");$("apiKey").focus();throw new Error("sin token")}
}
function explain(err){
  const m=String(err&&err.message||err);
  if(/OAuth|invalid.*token|token.*invalid|Invalid OAuth|code 190|401/i.test(m))return "Mapillary rechazó el token. Revisa que copiaste el «Client Token» completo (empieza por MLY|).";
  if(/Failed to fetch|NetworkError|Load failed/i.test(m))return "No hubo conexión con el servicio. Revisa tu internet e intenta otra vez.";
  if(/429|Too Many/i.test(m))return "El servicio está recibiendo muchas consultas. Espera un minuto e intenta otra vez.";
  return m;
}

/* Nominatim pide máximo 1 consulta por segundo: se ponen en fila. */
let nomQueue=Promise.resolve(), nomLast=0;
function nominatim(path,params){
  const run=async()=>{
    const wait=nomLast+1100-Date.now();if(wait>0)await sleep(wait);
    nomLast=Date.now();
    const res=await fetch("https://nominatim.openstreetmap.org/"+path+"?"+new URLSearchParams({format:"jsonv2","accept-language":"es",...params}));
    if(!res.ok)throw new Error("Error "+res.status+" buscando la dirección");
    return res.json();
  };
  const p=nomQueue.then(run,run);nomQueue=p.catch(()=>{});
  return p;
}
/* ---------- Buscar lugares y direcciones ----------
   suggest(q) devuelve varias opciones [{pos,name,detail}] para la lista de sugerencias.
   Si config.js tiene tomtomKey se usa TomTom (mejores direcciones en Colombia);
   si no, Photon (OpenStreetMap). */
const sugCache=new Map();
const VIAS={calle:"Calle",cl:"Calle",cll:"Calle",clle:"Calle",carrera:"Carrera",cra:"Carrera",cr:"Carrera",kr:"Carrera",kra:"Carrera",crr:"Carrera",
  avenida:"Avenida",av:"Avenida",avda:"Avenida",circular:"Circular",cq:"Circular",cir:"Circular",transversal:"Transversal",tv:"Transversal",tr:"Transversal",
  diagonal:"Diagonal",dg:"Diagonal"};
const normTxt=s=>(s||"").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/\s+/g," ").trim();
/* "Cra 70 #44-20" → {via:"Carrera 70", texto:"Carrera 70 44-20"} */
function parseDireccion(q){
  const m=q.trim().match(/^([a-záéíóú]+)\.?\s*(\d+\s*[a-z]?(?:\s*bis)?(?:\s*sur)?)\s*(?:#|n[°º]|no\.?|numero|número)?\s*(\d+\s*[a-z]?(?:\s*bis)?)\s*-\s*(\d+)\s*(sur)?\b(.*)$/i);
  if(!m)return null;
  const tipo=VIAS[normTxt(m[1])];if(!tipo)return null;
  const via=tipo+" "+m[2].replace(/\s+/g,"").toUpperCase().replace("BIS"," Bis").replace("SUR"," Sur");
  const cruce=m[3].replace(/\s+/g,"").toUpperCase();
  return {via,cruce,texto:via+" "+cruce+"-"+m[4]+(m[5]?" Sur":"")+(m[6]||"")};
}
async function suggest(q,limit=6){
  q=q.trim();if(q.length<3)return [];
  const k=q+"|"+limit;if(sugCache.has(k))return sugCache.get(k);
  const dir=parseDireccion(q);
  let out=[];
  if(CFG.tomtomKey){try{out=await tomtom(dir?dir.texto:q,limit)}catch(e){out=[]}}
  if(!out.length){
    out=await photonSearch(dir?dir.texto:q.replace(/\s*(#|n[°º]|no\.)\s*/gi," "),limit);
    if(dir){
      // primero las que quedan sobre la misma vía y cerca de la calle que cruza
      const v=normTxt(dir.via), c=normTxt(dir.cruce);
      const score=r=>{
        const hn=normTxt(r.housenumber).replace(/[#\s]/g,""), nm=normTxt(r.name);
        let s=normTxt(r.street)===v?0:3;
        s+=(hn===c||hn.startsWith(c+"-"))?0:hn.startsWith(c)?0.5:1.5;   // 44-20 mejor que 44B-13
        // "Calle 44 x Carrera 70" = la esquina: el nombre trae la vía y la calle que cruza
        if(nm.includes(v)&&new RegExp("(calle|carrera|avenida|circular|transversal|diagonal) "+c+"\\b").test(nm.replace(v,"")))s-=2;
        return s;
      };
      out.sort((a,b)=>score(a)-score(b));
    }
  }
  sugCache.set(k,out);
  return out;
}
async function geocode(q){
  const ll=q.match(/^\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*$/);
  if(ll)return {pos:[+ll[1],+ll[2]],name:q.trim()};
  const gmUrl=q.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
  if(gmUrl)return {pos:[+gmUrl[1],+gmUrl[2]],name:"Punto del mapa"};
  let r=await suggest(q,1);
  if(!r.length){
    const n=await nominatim("search",{q:q.replace(/\s*(#|n[°º]|no\.)\s*/gi," "),countrycodes:"co",limit:"1",addressdetails:"1",viewbox:CIUDAD.caja.join(","),bounded:"1"});
    if(n.length)r=[{pos:[+n[0].lat,+n[0].lon],name:shortPlace(n[0])}];
  }
  if(!r.length)throw new Error("No encontré «"+q+"» en "+CIUDAD.nombre+". Escribe más despacio y elige de la lista, o marca el punto en el mapa.");
  return r[0];
}
const [W_,N_,E_,S_]=CIUDAD.caja;
async function photonSearch(q,limit){
  const res=await fetch("https://photon.komoot.io/api/?"+new URLSearchParams({q,limit:String(limit+2),
    bbox:[W_,S_,E_,N_].join(","),lat:CIUDAD.centro[0],lon:CIUDAD.centro[1]}));
  if(!res.ok)return [];
  const seen=new Set(), out=[];
  for(const f of (await res.json()).features||[]){
    const p=f.properties, c=f.geometry.coordinates;
    const name=p.name||(p.street?(p.street+(p.housenumber?" "+p.housenumber:"")):"");
    if(!name)continue;
    const key=normTxt(name)+"|"+c[1].toFixed(3)+"|"+c[0].toFixed(3);
    if(seen.has(key))continue;seen.add(key);
    const street=p.street&&p.name?(p.street+(p.housenumber?" "+p.housenumber:"")):"";
    out.push({pos:[c[1],c[0]],name,detail:[street,p.district||p.locality,p.city].filter(Boolean).join(", "),
      street:p.street||(p.osm_key==="highway"?p.name:""),housenumber:p.housenumber||""});
    if(out.length>=limit)break;
  }
  return out;
}
async function tomtom(q,limit){
  const res=await fetch("https://api.tomtom.com/search/2/search/"+encodeURIComponent(q)+".json?"+new URLSearchParams({
    key:CFG.tomtomKey,typeahead:"true",limit:String(limit),countrySet:"CO",language:"es-419",
    lat:CIUDAD.centro[0],lon:CIUDAD.centro[1],radius:"40000"}));
  if(!res.ok)throw new Error("TomTom "+res.status);
  return ((await res.json()).results||[]).map(r=>{
    const a=r.address||{}, calle=a.streetName?(a.streetName+(a.streetNumber?" # "+a.streetNumber:"")):"";
    const name=r.poi?r.poi.name:(calle||a.freeformAddress);
    return {pos:[r.position.lat,r.position.lon],name,
      detail:[r.poi?calle:"",a.municipalitySubdivision,a.municipality].filter(Boolean).join(", ")};
  });
}
function photonName(p){
  const street=p.street?(p.street+(p.housenumber?" "+p.housenumber:"")):"";
  const parts=[p.name&&p.name!==p.street?p.name:"",street,p.district||p.locality||""].filter(Boolean);
  return [...new Set(parts)].slice(0,2).join(", ")+(p.city?", "+p.city:"");
}
function shortPlace(r){
  const a=r.address||{}, n=r.name;
  const street=a.road?(a.road+(a.house_number?" "+a.house_number:"")):"";
  const zone=a.neighbourhood||a.suburb||a.quarter||a.city_district||"";
  const parts=[n&&n!==a.road?n:"",street,zone].filter(Boolean);
  if(parts.length)return [...new Set(parts)].slice(0,2).join(", ")+(a.city?", "+a.city:"");
  return r.display_name.split(",").slice(0,3).join(",");
}
async function reverseGeocode(pos){
  try{
    const res=await fetch("https://photon.komoot.io/reverse?"+new URLSearchParams({lat:pos[0],lon:pos[1],limit:"1"}));
    const f=res.ok?((await res.json()).features||[]):[];
    if(f.length)return photonName(f[0].properties);
  }catch(e){}
  try{
    const r=await nominatim("reverse",{lat:pos[0],lon:pos[1],zoom:"18",addressdetails:"1"});
    if(r&&r.display_name)return shortPlace(r);
  }catch(e){}
  return pos[0].toFixed(6)+", "+pos[1].toFixed(6);
}

/* Ruta a pie: servidor OSRM público de OpenStreetMap Alemania (FOSSGIS). */
async function computeRoute(points){
  const coords=points.map(p=>p[1].toFixed(6)+","+p[0].toFixed(6)).join(";");
  const res=await fetch("https://routing.openstreetmap.de/routed-foot/route/v1/foot/"+coords+"?overview=full&geometries=polyline");
  if(!res.ok)throw new Error(res.status===429?"429":"Error "+res.status+" calculando la ruta");
  const j=await res.json();
  if(j.code!=="Ok"||!j.routes||!j.routes.length)throw new Error("No encontré una ruta a pie entre esos puntos.");
  return decodePolyline(j.routes[0].geometry);
}

/* ---------- Mapillary ---------- */
const MLY="https://graph.mapillary.com/";
async function mly(path,params){
  const res=await fetch(MLY+path+"?"+new URLSearchParams({access_token:key(),...params}));
  let j=null;try{j=await res.json()}catch(e){}
  if(!res.ok){
    const m=j&&j.error&&j.error.message||("Error "+res.status+" en Mapillary");
    throw new Error(res.status===401||res.status===403?"OAuth: "+m:m);
  }
  return j;
}
/* Todas las fotos en una franja de ~25 m a lado y lado de la ruta. */
async function mlyImagesAlong(path,onProgress){
  const CHUNK=60, PAD=25, boxes=[]; // cajas pequeñas: en zonas con muchas fotos Mapillary devuelve máximo 2000
  for(let s=0;s<path.length;s+=CHUNK){
    let w=180,e=-180,n=-90,so=90;
    for(let d=s;d<=Math.min(path.length,s+CHUNK);d+=10){
      const p=path.at(d);
      w=Math.min(w,p[1]);e=Math.max(e,p[1]);n=Math.max(n,p[0]);so=Math.min(so,p[0]);
    }
    const p=path.at(Math.min(path.length,s+CHUNK));
    w=Math.min(w,p[1]);e=Math.max(e,p[1]);n=Math.max(n,p[0]);so=Math.min(so,p[0]);
    const dLat=PAD/111320, dLng=PAD/(111320*Math.cos(rad(n)));
    boxes.push([w-dLng,so-dLat,e+dLng,n+dLat].map(v=>v.toFixed(6)).join(","));
  }
  const all=new Map();
  await pool(boxes,4,async bbox=>{
    const j=await mly("images",{bbox,limit:"2000",
      fields:"id,computed_geometry,geometry,computed_compass_angle,compass_angle,captured_at,is_pano,sequence"});
    (j.data||[]).forEach(im=>{
      const g=im.computed_geometry||im.geometry;if(!g)return;
      const compass=im.computed_compass_angle!=null?im.computed_compass_angle:im.compass_angle;
      if(compass==null&&!im.is_pano)return;
      all.set(im.id,{id:im.id,pos:[g.coordinates[1],g.coordinates[0]],compass:compass||0,
        pano:!!im.is_pano,seq:im.sequence,time:im.captured_at||0});
    });
  },k=>onProgress&&onProgress(k/boxes.length));
  return [...all.values()];
}
async function mlyBitmap(id,pano){
  const j=await mly(id,{fields:"thumb_2048_url,thumb_1024_url"});
  const url=pano?(j.thumb_2048_url||j.thumb_1024_url):(j.thumb_1024_url||j.thumb_2048_url);
  if(!url)return null;
  const res=await fetch(url);
  if(!res.ok)return null;
  return createImageBitmap(await res.blob());
}
