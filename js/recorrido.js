/* ---------- Armar el recorrido con fotos de Mapillary ---------- */
function invalidateFrames(){
  state.frames=null;stopPlayback();
  $("playBtn").disabled=$("recBtn").disabled=true;
  $("dl").style.display="none";
  setMsg($("prepMsg"),"");
}
["format","step","turns"].forEach(id=>$(id).addEventListener("change",()=>{
  if(state.frames){invalidateFrames();setMsg($("prepMsg"),"Cambiaste opciones: vuelve a preparar el recorrido.")}
  if(id==="format")sizeCanvas();
}));
function progress(f){const b=$("bar");b.style.display=f==null?"none":"block";b.firstChild.style.width=((f||0)*100)+"%"}

/* Rejilla para encontrar rápido las fotos cercanas a un punto (~33 m por celda). */
function makeGrid(items){
  const C=0.0003, g=new Map(), keyOf=(a,b)=>a+","+b;
  items.forEach(it=>{const k=keyOf(Math.floor(it.pos[0]/C),Math.floor(it.pos[1]/C));(g.get(k)||g.set(k,[]).get(k)).push(it)});
  return p=>{
    const a=Math.floor(p[0]/C), b=Math.floor(p[1]/C), out=[];
    for(let i=-1;i<=1;i++)for(let j=-1;j<=1;j++){const c=g.get(keyOf(a+i,b+j));if(c)out.push(...c)}
    return out;
  };
}
/* Elige una foto por tramo: cerca de la ruta, mirando hacia donde vas,
   reciente y, si se puede, de la misma secuencia que la anterior (se ve más continuo). */
function pickStops(path,images,step){
  const near=makeGrid(images), used=new Set(), stops=[], now=Date.now();
  const samples=[];for(let d=0;d<path.length;d+=step)samples.push(d);samples.push(path.length);
  let prev=null;
  for(const d of samples){
    const p=path.at(d), head=bearing(path.at(Math.max(0,d-8)),path.at(Math.min(path.length,d+12)));
    let best=null,bs=Infinity;
    for(const c of near(p)){
      if(used.has(c.id))continue;
      const dd=dist(c.pos,p);if(dd>22)continue;
      if(!c.pano&&Math.abs(angDiff(c.compass,head))>50)continue;
      const years=Math.min(10,Math.max(0,(now-c.time)/3.156e10));
      const s=dd+(dd>12?8:0)+(c.pano?0:6)+years*1.5+(prev&&c.seq===prev.seq?0:10);
      if(s<bs){bs=s;best=c}
    }
    if(!best)continue;
    if(prev&&dist(prev.pos,best.pos)<2.5)continue;
    used.add(best.id);stops.push({...best,d});prev=best;
  }
  return stops;
}
function gapMeters(stops,path,step){
  let gap=0;const ds=[0,...stops.map(s=>s.d),path.length];
  for(let i=1;i<ds.length;i++){const g=ds[i]-ds[i-1];if(g>step*3)gap+=g-step}
  return gap;
}

$("prepBtn").onclick=async()=>{
  try{needKey()}catch(e){return}
  const path=state.path;if(!path)return;
  const step=+$("step").value, fmt=$("format").value, turns=$("turns").value==="1";
  $("prepBtn").disabled=true;stopPlayback();
  try{
    // 1) Fotos de Mapillary alrededor de la ruta
    setMsg($("prepMsg"),"Buscando fotos de Mapillary en la ruta…");progress(0);
    const images=await mlyImagesAlong(path,f=>progress(f*0.3));
    const stops=pickStops(path,images,step);
    if(stops.length<2)throw new Error("Casi no hay fotos en esta ruta. Toca el mapa sobre calles en verde para que la ruta pase por ahí.");
    // 2) Hacia dónde mira la cámara en cada punto
    stops.forEach((s,i)=>{
      let look=path.at(Math.min(path.length,s.d+18));
      if(dist(s.pos,look)<5)look=path.at(Math.min(path.length,s.d+35));
      s.look=(dist(s.pos,look)<3&&i>0)?stops[i-1].look:bearing(s.pos,look);
      s.heading=s.pano?s.look:s.compass; // las fotos normales solo miran hacia donde se tomaron
    });
    // 3) Esquinas: con panorámicas se gira la cámara; con fotos normales, corte directo
    const shots=[];
    stops.forEach((s,i)=>{
      if(i>0){
        const prev=stops[i-1], delta=angDiff(prev.look,s.look);
        if(Math.abs(delta)>38){
          if(turns&&prev.pano){
            const k=Math.min(3,Math.ceil(Math.abs(delta)/40));
            for(let j=1;j<k;j++)shots.push({...prev,heading:(prev.look+delta*j/k+360)%360,turn:delta});
            shots.push({...prev,heading:s.look,turn:delta});
          }else{shots.push({...s,turn:delta});return}
        }
      }
      shots.push({...s,turn:0});
    });
    // 4) Descargar y recortar las fotos
    const ids=[...new Set(shots.map(s=>s.id))];
    setMsg($("prepMsg"),"Descargando "+ids.length+" fotos…");
    const byId=new Map();shots.forEach(s=>(byId.get(s.id)||byId.set(s.id,[]).get(s.id)).push(s));
    await pool(ids,4,async id=>{
      const group=byId.get(id), first=group[0];
      let bmp=null;
      try{bmp=await mlyBitmap(id,first.pano)}catch(e){if(/OAuth/.test(e.message))throw e;return}
      if(!bmp)return;
      if(first.pano){
        const px=pixelsOf(bmp);
        for(const s of group)s.img=await panoView(px,s.compass,s.heading,fmt);
      }else{
        const v=await flatView(bmp,fmt);
        for(const s of group)s.img=v;
      }
      bmp.close&&bmp.close();
    },k=>progress(0.3+k/ids.length*0.7));
    const frames=shots.filter(f=>f.img);
    if(frames.length<2)throw new Error("No se pudieron descargar las fotos de Mapillary.");
    state.frames={list:frames,fmt,path,title:$("title").value.trim()||shortName(state.to.name)};
    buildTimeline();
    progress(null);
    const secs=Math.round(timeline.total/1000), gap=gapMeters(stops,path,step);
    let msg="Listo: "+frames.length+" fotos, video de "+secs+" s.";
    if(gap>path.length*0.15)msg+="\nOjo: "+fmtDist(gap)+" de la ruta no tienen fotos y el video salta esos tramos. Puedes mover la ruta hacia calles en verde.";
    setMsg($("prepMsg"),msg,"ok");
    $("playBtn").disabled=$("recBtn").disabled=false;
    renderAt(0);
    if(isPhone())document.querySelector(".stage").scrollIntoView({behavior:"smooth",block:"center"});
  }catch(e){progress(null);setMsg($("prepMsg"),explain(e),"err")}
  $("prepBtn").disabled=false;
};
$("speed").addEventListener("change",()=>{if(state.frames){buildTimeline();renderAt(0)}});
$("title").addEventListener("input",()=>{if(state.frames){state.frames.title=$("title").value.trim();if(!playing)renderAt(0)}});
