/* ---------- Arranque ---------- */
if(CONFIG_KEY){
  $("keyCard").hidden=true;
}else{
  $("apiKey").value=store.get("mlyToken")||"";
}
$("saveKey").onclick=()=>{
  store.set("mlyToken",key());
  setMsg($("keyMsg"),key()?"Token guardado en este navegador.":"Token borrado.","ok");
  showCoverage();
};
$("apiKey").addEventListener("change",()=>store.set("mlyToken",key()));
loadMap();
if(isPhone())$("format").value="v";
sizeCanvas();
