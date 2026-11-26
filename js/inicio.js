/* ---------- Init ---------- */
if(CONFIG_KEY){
  $("keyCard").hidden=true;
}else{
  $("apiKey").value=store.get("svKey")||"";
}
$("saveKey").onclick=()=>{
  store.set("svKey",key());
  if(map&&key()){setMsg($("keyMsg"),"Clave guardada. Recarga la página para usar la nueva clave.","ok");return}
  setMsg($("keyMsg"),key()?"Clave guardada en este navegador.":"Clave borrada.","ok");
  if(key())loadMap();
};
if(key())loadMap();
$("apiKey").addEventListener("change",()=>store.set("svKey",key()));
if(isPhone())$("format").value="v";
sizeCanvas();
