/* ---------- Building the walk ---------- */
function invalidateFrames(){
  state.frames=null;stopPlayback();
  $("playBtn").disabled=$("recBtn").disabled=true;
  $("dl").style.display="none";
  setMsg($("prepMsg"),"");
}
["format","step","turns"].forEach(id=>$(id).addEventListener("change",()=>{
  if(state.frames){invalidateFrames();setMsg($("prepMsg"),"Cambiaste opciones: vuelve a preparar el recorrido.")}
  if(id==="format")sizeCanvas();
  if(id==="step"&&state.path)setMsg($("routeMsg"),"El video usará aprox. "+(Math.ceil(state.path.length/+$("step").value)+1)+" fotos de Street View.","ok");
}));
function progress(f){const b=$("bar");b.style.display=f==null?"none":"block";b.firstChild.style.width=((f||0)*100)+"%"}

$("prepBtn").onclick=async()=>{
  try{needKey()}catch(e){return}
  const path=state.path;if(!path)return;
  const step=+$("step").value, fmt=$("format").value, turns=$("turns").value==="1";
  const n=Math.ceil(path.length/step);
  if(n>700&&!confirm("Esta ruta necesita unas "+n+" fotos. ¿Seguir?"))return;
  $("prepBtn").disabled=true;stopPlayback();
  try{
    // 1) Buscar panorámicas a lo largo de la ruta (gratis)
    setMsg($("prepMsg"),"Buscando panorámicas de Street View en la ruta…");progress(0);
    const samples=[];for(let d=0;d<path.length;d+=step)samples.push(d);samples.push(path.length);
    const metas=await pool(samples,8,async d=>{
      const p=path.at(d);
      return (await svMeta(p,20))||(await svMeta(p,45));
    },k=>progress(k/samples.length*0.35));
    // 2) Quedarse con una por lugar, sin devolverse
    const used=new Set(), stops=[];
    metas.forEach((m,i)=>{
      if(!m||used.has(m.pano))return;
      const d=samples[i];
      if(stops.length&&dist(stops[stops.length-1].pos,m.pos)<2.5)return;
      used.add(m.pano);stops.push({pano:m.pano,pos:m.pos,d});
    });
    if(stops.length<2)throw new Error("Casi no hay Street View en esta ruta. Prueba otra ruta o agrega puntos por calles principales.");
    // 3) Hacia dónde mira la cámara en cada punto
    stops.forEach((s,i)=>{
      let look=path.at(Math.min(path.length,s.d+18));
      if(dist(s.pos,look)<5)look=path.at(Math.min(path.length,s.d+35));
      if(dist(s.pos,look)<3&&i>0)s.heading=stops[i-1].heading;
      else s.heading=bearing(s.pos,look);
    });
    const shots=[];
    stops.forEach((s,i)=>{
      if(i>0&&turns){
        const prev=stops[i-1], delta=angDiff(prev.heading,s.heading);
        if(Math.abs(delta)>38){
          const k=Math.min(3,Math.ceil(Math.abs(delta)/40));
          for(let j=1;j<k;j++)shots.push({pano:prev.pano,pos:prev.pos,d:prev.d,heading:(prev.heading+delta*j/k+360)%360,turn:delta});
          shots.push({pano:prev.pano,pos:prev.pos,d:prev.d,heading:s.heading,turn:delta});
        }
      }
      shots.push({...s,turn:0});
    });
    // 4) Descargar las fotos
    setMsg($("prepMsg"),"Descargando "+shots.length+" fotos…");
    const imgs=await pool(shots,6,s=>svImage(s.pano,s.heading,fmt),k=>progress(0.35+k/shots.length*0.65));
    const frames=shots.map((s,i)=>({...s,img:imgs[i]})).filter(f=>f.img);
    if(frames.length<2)throw new Error("No se pudieron descargar las fotos de Street View.");
    state.frames={list:frames,fmt,path,title:$("title").value.trim()||shortName(state.to.name)};
    buildTimeline();
    progress(null);
    const secs=Math.round(timeline.total/1000);
    setMsg($("prepMsg"),"Listo: "+frames.length+" fotos, video de "+secs+" s.","ok");
    $("playBtn").disabled=$("recBtn").disabled=false;
    renderAt(0);
    if(isPhone())document.querySelector(".stage").scrollIntoView({behavior:"smooth",block:"center"});
  }catch(e){progress(null);setMsg($("prepMsg"),explain(e),"err")}
  $("prepBtn").disabled=false;
};
$("speed").addEventListener("change",()=>{if(state.frames){buildTimeline();renderAt(0)}});
$("title").addEventListener("input",()=>{if(state.frames){state.frames.title=$("title").value.trim();if(!playing)renderAt(0)}});
