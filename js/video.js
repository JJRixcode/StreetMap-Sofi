/* ---------- Renderer ---------- */
const cv=$("player"), ctx=cv.getContext("2d");
function sizeCanvas(){
  if($("format").value==="v"){cv.width=720;cv.height=1280}else{cv.width=1280;cv.height=720}
  if(!state.frames)drawIdle();
}
function drawIdle(){
  const W=cv.width,H=cv.height,u=Math.min(W,H)/720,cx=W/2,cy=H/2-30*u;
  ctx.fillStyle="#fff";ctx.fillRect(0,0,W,H);
  ctx.fillStyle="#e8f0fe";ctx.beginPath();ctx.arc(cx,cy,56*u,0,7);ctx.fill();
  ctx.fillStyle="#1a73e8";ctx.beginPath();
  ctx.moveTo(cx-15*u,cy-28*u);ctx.lineTo(cx+26*u,cy);ctx.lineTo(cx-15*u,cy+28*u);ctx.closePath();ctx.fill();
  ctx.fillStyle="#5f6368";ctx.textAlign="center";ctx.textBaseline="middle";
  ctx.font=`500 ${Math.round(30*u)}px Roboto,system-ui,sans-serif`;
  ctx.fillText("Aquí aparecerá el recorrido",cx,H/2+70*u);
}
let timeline=null;
const INTRO=1400, OUTRO=2600;
function buildTimeline(){
  const base=+$("speed").value, list=state.frames.list;
  let t=INTRO;const segs=[];
  list.forEach((f,i)=>{
    const dur=f.turn?base*0.6:base;
    segs.push({f,start:t,dur,i});t+=dur;
  });
  timeline={segs,total:t+OUTRO,end:t};
}
function drawImg(img,zoom,alpha){
  const W=cv.width,H=cv.height, s=Math.max(W/img.width,H/img.height)*zoom;
  const w=img.width*s,h=img.height*s;
  ctx.globalAlpha=alpha;
  ctx.drawImage(img,(W-w)/2,(H-h)/2-(zoom-1)*H*0.08,w,h);
  ctx.globalAlpha=1;
}
function rr(x,y,w,h,r){ctx.beginPath();ctx.moveTo(x+r,y);ctx.arcTo(x+w,y,x+w,y+h,r);ctx.arcTo(x+w,y+h,x,y+h,r);ctx.arcTo(x,y+h,x,y,r);ctx.arcTo(x,y,x+w,y,r);ctx.closePath()}
function chip(text,x,y,size,opts={}){
  ctx.font=`${opts.weight||600} ${size}px system-ui,-apple-system,"Segoe UI",Roboto,sans-serif`;
  const pad=size*0.6, w=Math.min(ctx.measureText(text).width+pad*2,opts.maxW||1e9), h=size*1.9;
  const X=opts.right?x-w:x;
  ctx.fillStyle=opts.bg||"rgba(0,0,0,.6)";rr(X,y,w,h,h/2);ctx.fill();
  ctx.fillStyle=opts.color||"#fff";ctx.textAlign="left";ctx.textBaseline="middle";
  ctx.save();ctx.beginPath();ctx.rect(X+pad*0.6,y,w-pad*1.2,h);ctx.clip();
  ctx.fillText(text,X+pad,y+h/2+1);ctx.restore();
  return h;
}
function miniMap(d,u){
  const path=state.frames.path, size=Math.round(210*u), x=Math.round(24*u), y=cv.height-size-Math.round(24*u);
  ctx.fillStyle="rgba(255,255,255,.9)";rr(x,y,size,size,14*u);ctx.fill();
  let mnLa=Infinity,mxLa=-Infinity,mnLn=Infinity,mxLn=-Infinity;
  path.pts.forEach(p=>{mnLa=Math.min(mnLa,p[0]);mxLa=Math.max(mxLa,p[0]);mnLn=Math.min(mnLn,p[1]);mxLn=Math.max(mxLn,p[1])});
  const k=Math.cos(rad((mnLa+mxLa)/2)), spanX=(mxLn-mnLn)*k||1e-6, spanY=(mxLa-mnLa)||1e-6;
  const inner=size-28*u, sc=inner/Math.max(spanX,spanY);
  const ox=x+(size-spanX*sc)/2, oy=y+(size-spanY*sc)/2;
  const P=p=>[ox+(p[1]-mnLn)*k*sc, oy+(mxLa-p[0])*sc];
  ctx.lineCap=ctx.lineJoin="round";
  ctx.strokeStyle="#9ec1f7";ctx.lineWidth=6*u;ctx.beginPath();
  path.pts.forEach((p,i)=>{const q=P(p);i?ctx.lineTo(q[0],q[1]):ctx.moveTo(q[0],q[1])});ctx.stroke();
  ctx.strokeStyle="#1a73e8";ctx.beginPath();
  let started=false;
  for(let i=0;i<path.pts.length&&path.cum[i]<=d;i++){const q=P(path.pts[i]);started?ctx.lineTo(q[0],q[1]):ctx.moveTo(q[0],q[1]);started=true}
  const cur=P(path.at(d));if(started){ctx.lineTo(cur[0],cur[1]);ctx.stroke()}
  const end=P(path.pts[path.pts.length-1]);
  ctx.fillStyle="#d93025";ctx.beginPath();ctx.arc(end[0],end[1],7*u,0,7);ctx.fill();
  ctx.fillStyle="#fff";ctx.beginPath();ctx.arc(cur[0],cur[1],9*u,0,7);ctx.fill();
  ctx.fillStyle="#1a73e8";ctx.beginPath();ctx.arc(cur[0],cur[1],6*u,0,7);ctx.fill();
}
function renderAt(t){
  const F=state.frames, W=cv.width,H=cv.height, u=Math.min(W,H)/720, segs=timeline.segs;
  t=Math.max(0,Math.min(timeline.total,t));
  let i=segs.length-1;
  if(t<segs[0].start)i=0;else for(let k=0;k<segs.length;k++){if(t<segs[k].start+segs[k].dur){i=k;break}}
  const s=segs[i], p=Math.max(0,Math.min(1,(t-s.start)/s.dur));
  const next=segs[i+1], walking=next&&!next.f.turn&&next.f.id!==s.f.id;
  const zoom=1+(walking?0.14*p:0);
  ctx.fillStyle="#000";ctx.fillRect(0,0,W,H);
  drawImg(s.f.img,zoom,1);
  const fade=Math.min(320,s.dur*0.45), into=t-(s.start+s.dur-fade);
  if(next&&into>0)drawImg(next.f.img,1,Math.min(1,into/fade));
  // progreso
  const d=t>=timeline.end?F.path.length:(next?s.f.d+(next.f.d-s.f.d)*p:F.path.length);
  // textos
  const m=Math.round(24*u);
  const hh=chip("📍 "+(F.title||"Destino"),m,m,Math.round(30*u),{maxW:W-2*m});
  const left=Math.max(0,F.path.length-d);
  if(t<timeline.end)chip(left<8?"Ya casi llegas":"Faltan "+fmtDist(left)+" · "+fmtTime(left),m,m+hh+10*u,Math.round(22*u),{weight:500,bg:"rgba(0,0,0,.45)"});
  const turnSeg=s.f.turn?s:(next&&next.f.turn&&into>0?next:null);
  if(turnSeg&&t<timeline.end){
    const right=turnSeg.f.turn>0;
    const txt=(right?"Gira a la derecha  ↱":"↰  Gira a la izquierda");
    ctx.font=`700 ${Math.round(34*u)}px system-ui,sans-serif`;
    const tw=ctx.measureText(txt).width+48*u, th=66*u, tx=(W-tw)/2, ty=H*0.62;
    ctx.fillStyle="rgba(26,115,232,.92)";rr(tx,ty,tw,th,th/2);ctx.fill();
    ctx.fillStyle="#fff";ctx.textAlign="center";ctx.textBaseline="middle";ctx.fillText(txt,W/2,ty+th/2+1);
  }
  miniMap(d,u);
  ctx.font=`500 ${Math.round(17*u)}px system-ui,sans-serif`;ctx.textAlign="right";ctx.textBaseline="bottom";
  const credit="Imágenes © Google";
  ctx.lineWidth=3*u;ctx.strokeStyle="rgba(0,0,0,.6)";ctx.strokeText(credit,W-m,H-m*0.8);
  ctx.fillStyle="#fff";ctx.fillText(credit,W-m,H-m*0.8);
  // intro / final
  if(t<INTRO){
    const a=t<INTRO-500?1:(INTRO-t)/500;
    banner("Cómo llegar a pie",F.title,a,u);
  }else if(t>timeline.end){
    const a=Math.min(1,(t-timeline.end)/500);
    banner("¡Llegaste! 🎉",F.title,a,u);
  }
}
function banner(top,main,a,u){
  const W=cv.width,H=cv.height;
  ctx.globalAlpha=a*0.55;ctx.fillStyle="#000";ctx.fillRect(0,0,W,H);ctx.globalAlpha=a;
  ctx.fillStyle="#fff";ctx.textAlign="center";ctx.textBaseline="middle";
  ctx.font=`500 ${Math.round(30*u)}px system-ui,sans-serif`;ctx.fillText(top,W/2,H/2-40*u);
  ctx.font=`700 ${Math.round(48*u)}px system-ui,sans-serif`;
  wrap(main||"",W/2,H/2+24*u,W*0.86,56*u);
  ctx.globalAlpha=1;
}
function wrap(text,x,y,maxW,lh){
  const words=text.split(" ");let line="",lines=[];
  words.forEach(w=>{const t=line?line+" "+w:w;if(ctx.measureText(t).width>maxW&&line){lines.push(line);line=w}else line=t});
  if(line)lines.push(line);lines=lines.slice(0,3);
  lines.forEach((l,i)=>ctx.fillText(l,x,y+i*lh));
}

/* ---------- Play & record ---------- */
let playing=false, raf=0, recorder=null;
function play(onEnd){
  stopPlayback();playing=true;
  const t0=performance.now();
  const tick=()=>{
    if(!playing)return;
    const t=performance.now()-t0;
    renderAt(t);
    if(t>=timeline.total){playing=false;onEnd&&onEnd();return}
    raf=requestAnimationFrame(tick);
  };
  raf=requestAnimationFrame(tick);
}
function stopPlayback(){playing=false;cancelAnimationFrame(raf);$("playBtn").textContent="▶ Ver"}
$("playBtn").onclick=()=>{
  if(playing){stopPlayback();return}
  $("playBtn").textContent="■ Detener";
  play(()=>{$("playBtn").textContent="▶ Ver"});
};
function pickMime(){
  const c=["video/mp4;codecs=avc1.640028","video/mp4;codecs=avc1.42E01E","video/mp4","video/webm;codecs=vp9","video/webm;codecs=vp8","video/webm"];
  return c.find(m=>window.MediaRecorder&&MediaRecorder.isTypeSupported(m))||"";
}
$("recBtn").onclick=()=>{
  if(!window.MediaRecorder||!cv.captureStream){setMsg($("prepMsg"),"Este navegador no puede grabar video. Usa Chrome, Edge o Safari actualizados.","err");return}
  const mime=pickMime();
  const stream=cv.captureStream(30);
  recorder=new MediaRecorder(stream,mime?{mimeType:mime,videoBitsPerSecond:8e6}:{videoBitsPerSecond:8e6});
  const chunks=[];
  recorder.ondataavailable=e=>{if(e.data&&e.data.size)chunks.push(e.data)};
  recorder.onstop=()=>{
    const type=recorder.mimeType||mime||"video/webm";
    const blob=new Blob(chunks,{type});
    const ext=type.includes("mp4")?"mp4":"webm";
    const name="como-llegar-"+(state.frames.title||"destino").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g,"").replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"").slice(0,40)+"."+ext;
    const a=$("dlLink");
    if(a.href.startsWith("blob:"))URL.revokeObjectURL(a.href);
    a.href=URL.createObjectURL(blob);a.download=name;
    a.textContent="Guardar video ("+(blob.size/1048576).toFixed(1)+" MB, "+ext.toUpperCase()+")";
    $("dl").style.display="block";
    lastVideo=new File([blob],name,{type:type.split(";")[0]});
    const canShare=!!(navigator.canShare&&navigator.canShare({files:[lastVideo]}));
    $("shareBtn").hidden=!canShare;
    releaseWake();
    // En celular se ofrece Compartir/Guardar; en computador se descarga solo.
    if(!isPhone())a.click();
    $("dl").scrollIntoView({behavior:"smooth",block:"nearest"});
    setMsg($("prepMsg"),"Video listo."+(ext==="webm"?" Salió en WebM: WhatsApp a veces no lo acepta; desde Chrome o Safari actualizados sale en MP4.":""),"ok");
    $("recBtn").disabled=$("playBtn").disabled=$("prepBtn").disabled=false;
    $("recBtn").textContent="⬇ Descargar video";
  };
  $("recBtn").disabled=$("playBtn").disabled=$("prepBtn").disabled=true;
  $("recBtn").textContent="● Grabando…";
  $("dl").style.display="none";
  setMsg($("prepMsg"),"Grabando ("+Math.round(timeline.total/1000)+" s). No cambies de pestaña.");
  renderAt(0);
  holdWake();
  recorder.start(1000);
  play(()=>setTimeout(()=>recorder.state!=="inactive"&&recorder.stop(),150));
};

/* ---------- Compartir y pantalla encendida ---------- */
let lastVideo=null, wake=null;
async function holdWake(){try{wake=await navigator.wakeLock.request("screen")}catch(e){wake=null}}
function releaseWake(){try{wake&&wake.release()}catch(e){}wake=null}
$("shareBtn").onclick=async()=>{
  if(!lastVideo)return;
  try{await navigator.share({files:[lastVideo],title:"Cómo llegar a pie",text:"Así llegas a "+(state.frames.title||"el destino")})}
  catch(e){if(e&&e.name!=="AbortError")setMsg($("prepMsg"),"No se pudo compartir: usa «Guardar video».","err")}
};
document.addEventListener("visibilitychange",()=>{
  if(document.hidden&&recorder&&recorder.state==="recording")
    setMsg($("prepMsg"),"Saliste de la página mientras grababa: el video puede quedar trabado. Vuelve a grabarlo sin cambiar de app.","err");
});
