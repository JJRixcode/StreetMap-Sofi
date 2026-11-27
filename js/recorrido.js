/* ---------- Armar el recorrido con fotos de Street View ---------- */
function invalidateFrames(){
  state.frames=null;stopPlayback();
  $("playBtn").disabled=$("recBtn").disabled=true;
  $("dl").style.display="none";
  setMsg($("prepMsg"),"");setMsg($("videoMsg"),"");
  $("openBtn").hidden=true;$("prepBtn").hidden=false;
}

/* ---------- Ventana (popup) del video ---------- */
let preparing=false, focoAntes=null;
function modalState(estado,sub){
  $("videoModal").dataset.estado=estado;
  const listo=estado==="listo";
  $("mascota").src=listo?"iconos/gato.webp?v=2":"iconos/bebe.webp?v=2"; // bebé mientras prepara, gato cuando está listo
  $("readyArea").hidden=!listo;
  $("modalTitle").textContent=listo?"¡Tu recorrido está listo!":estado==="error"?"No se pudo preparar":"Preparando tu recorrido…";
  $("modalSub").textContent=sub||(estado==="preparando"?"Puedes cerrar esta ventana: sigue preparándose.":"");
}
function openModal(){
  const m=$("videoModal");if(!m.hidden)return;
  focoAntes=document.activeElement;
  m.hidden=false;document.body.classList.add("modal-abierto");
  $("modalClose").focus();
}
function closeModal(){
  if(exporting||(recorder&&recorder.state==="recording"))return; // no cerrar mientras crea el video
  stopPlayback();
  $("videoModal").hidden=true;document.body.classList.remove("modal-abierto");
  if(focoAntes&&focoAntes.focus)focoAntes.focus();
}
$("modalClose").onclick=closeModal;
document.querySelector(".modal-fondo").onclick=closeModal;
document.addEventListener("keydown",e=>{if(e.key==="Escape"&&!$("videoModal").hidden)closeModal()});
$("openBtn").onclick=()=>{openModal();if(!playing)renderAt(0)};
const fmtDur=ms=>{const s=Math.round(ms/1000);return s<60?s+" s":Math.floor(s/60)+" min"+(s%60?" "+(s%60)+" s":"")};
["format","step","turns"].forEach(id=>$(id).addEventListener("change",()=>{
  if(state.frames){invalidateFrames();setMsg($("videoMsg"),"Cambiaste opciones: vuelve a preparar el recorrido.")}
  if(id==="format")sizeCanvas();
  if(id==="step"&&state.path)setMsg($("routeMsg"),"El video usará unas "+(Math.ceil(state.path.length/+$("step").value)+1)+" fotos de Street View.","ok");
}));
function progress(f){const b=$("bar");b.style.display=f==null?"none":"block";b.firstChild.style.width=((f||0)*100)+"%"}

$("prepBtn").onclick=async()=>{
  if(preparing){openModal();return} // ya se está preparando: solo volver a mostrar la ventana
  const path=state.path;if(!path)return;
  const step=+$("step").value, fmt=$("format").value, turns=$("turns").value==="1";
  const n=Math.ceil(path.length/step);
  if(n>250&&!confirm("Esta ruta necesita unas "+n+" fotos de Street View, más de lo normal. ¿Seguir?"))return;
  preparing=true;stopPlayback();
  $("prepBtn").textContent="Preparando… (ver progreso)";
  setMsg($("videoMsg"),"");setMsg($("prepMsg"),"");
  modalState("preparando");openModal();
  try{
    // 1) Buscar panorámicas a lo largo de la ruta (esta consulta es gratis)
    setMsg($("prepMsg"),"Buscando panorámicas de Street View en la ruta…");progress(0);
    const samples=[];for(let d=0;d<path.length;d+=step)samples.push(d);samples.push(path.length);
    const metas=await pool(samples,8,async d=>{
      const p=path.at(d);
      return (await svMeta(p,20))||(await svMeta(p,45));
    },k=>progress(k/samples.length*0.35));
    // 2) Una foto por lugar, sin devolverse
    const used=new Set(), stops=[];
    metas.forEach((m,i)=>{
      if(!m||used.has(m.pano))return;
      const d=samples[i];
      if(stops.length&&dist(stops[stops.length-1].pos,m.pos)<2.5)return;
      used.add(m.pano);stops.push({id:m.pano,pos:m.pos,d});
    });
    if(stops.length<2)throw new Error("Casi no hay Street View en esta ruta. Prueba otra ruta o agrega puntos por calles principales.");
    // 3) Hacia dónde mira la cámara en cada punto
    stops.forEach((s,i)=>{
      let look=path.at(Math.min(path.length,s.d+18));
      if(dist(s.pos,look)<5)look=path.at(Math.min(path.length,s.d+35));
      s.heading=(dist(s.pos,look)<3&&i>0)?stops[i-1].heading:bearing(s.pos,look);
    });
    // 4) Esquinas: girar la cámara sobre la misma panorámica
    const shots=[];
    stops.forEach((s,i)=>{
      if(i>0&&turns){
        const prev=stops[i-1], delta=angDiff(prev.heading,s.heading);
        if(Math.abs(delta)>38){
          const k=Math.min(3,Math.ceil(Math.abs(delta)/40));
          for(let j=1;j<k;j++)shots.push({...prev,heading:(prev.heading+delta*j/k+360)%360,turn:delta});
          shots.push({...prev,heading:s.heading,turn:delta});
        }
      }
      shots.push({...s,turn:0});
    });
    // 5) Descargar las fotos
    setMsg($("prepMsg"),"Descargando "+shots.length+" fotos…");
    const imgs=await pool(shots,6,s=>svImage(s.id,s.heading,fmt),k=>progress(0.35+k/shots.length*0.65));
    if(state.path!==path)throw new Error("Cambiaste la ruta mientras se preparaba. Vuelve a preparar el recorrido.");
    const frames=shots.map((s,i)=>({...s,img:imgs[i]})).filter(f=>f.img);
    if(frames.length<2)throw new Error("No se pudieron descargar las fotos de Street View.");
    state.frames={list:frames,fmt,path,title:$("title").value.trim()||shortName(state.to.name)};
    buildTimeline();
    progress(null);
    const resumen=frames.length+" fotos · video de "+fmtDur(timeline.total);
    modalState("listo",resumen);setMsg($("prepMsg"),"");
    $("playBtn").disabled=$("recBtn").disabled=false;
    renderAt(0);
    $("prepBtn").hidden=true;$("openBtn").hidden=false;
    setMsg($("videoMsg"),"Video listo: "+resumen+".","ok");
  }catch(e){progress(null);modalState("error");setMsg($("prepMsg"),explain(e),"err");setMsg($("videoMsg"),explain(e),"err")}
  preparing=false;$("prepBtn").textContent="Preparar recorrido";
};
$("speed").addEventListener("change",()=>{if(state.frames){buildTimeline();renderAt(0)}});
$("title").addEventListener("input",()=>{if(state.frames){state.frames.title=$("title").value.trim();if(!playing)renderAt(0)}});
