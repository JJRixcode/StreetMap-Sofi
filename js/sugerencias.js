/* ---------- Sugerencias mientras escribes (Desde / Hasta) ---------- */
function setupSuggest(which){
  const input=$(which), row=input.closest(".row");
  const list=document.createElement("ul");
  list.className="sugg";list.id="sugg-"+which;list.setAttribute("role","listbox");list.hidden=true;
  row.appendChild(list);
  input.setAttribute("role","combobox");input.setAttribute("aria-autocomplete","list");
  input.setAttribute("aria-controls",list.id);input.setAttribute("aria-expanded","false");
  input.setAttribute("autocomplete","off");
  let items=[], active=-1, timer=0, seq=0;

  const close=()=>{list.hidden=true;input.setAttribute("aria-expanded","false");active=-1};
  const highlight=i=>{
    active=i;
    [...list.children].forEach((li,k)=>li.setAttribute("aria-selected",k===i?"true":"false"));
    if(i>=0&&list.children[i])list.children[i].scrollIntoView({block:"nearest"});
  };
  function render(msg){
    list.innerHTML="";
    if(msg){
      const li=document.createElement("li");li.className="empty";li.textContent=msg;list.appendChild(li);
    }
    items.forEach((it,i)=>{
      const li=document.createElement("li");li.setAttribute("role","option");li.id=list.id+"-"+i;
      const b=document.createElement("b");b.textContent=it.name;li.appendChild(b);
      if(it.detail){const s=document.createElement("span");s.textContent=it.detail;li.appendChild(s)}
      // pointerdown: elige antes de que el campo pierda el foco
      li.addEventListener("pointerdown",e=>{e.preventDefault();choose(i)});
      list.appendChild(li);
    });
    list.hidden=!items.length&&!msg;
    input.setAttribute("aria-expanded",list.hidden?"false":"true");
    active=-1;
  }
  function choose(i){
    const it=items[i];if(!it)return;
    close();
    input.value=it.name;
    placeEnd(which,it.pos,it.name);
    if(which==="to")$("title").value=shortName(it.name);
    if(map)map.setView(LL(it.pos),Math.max(map.getZoom(),16));
    if(state.from&&state.to){
      state.waypoints=[];drawWaypoints();
      route().then(b=>{if(b&&b!==true)map.fitBounds(b,{padding:[30,30]})});
    }else{
      setMsg($("routeMsg"),which==="from"?"Ahora escribe a dónde vas.":"Ahora escribe de dónde sales.");
      $(which==="from"?"to":"from").focus();
    }
  }
  input.addEventListener("input",()=>{
    clearTimeout(timer);
    const q=input.value.trim();
    // si cambió el texto, el punto elegido ya no corresponde
    if(state[which]&&state[which].name!==input.value)state[which]=null;
    if(q.length<3){items=[];render();return}
    timer=setTimeout(async()=>{
      const my=++seq;
      try{
        const r=await suggest(q);
        if(my!==seq||input.value.trim()!==q)return;
        items=r;render(r.length?"":"Sin resultados. Prueba con otro nombre o marca el punto en el mapa.");
      }catch(e){if(my===seq){items=[];render("No se pudo buscar. Revisa tu conexión.")}}
    },250);
  });
  input.addEventListener("keydown",e=>{
    if(list.hidden||!items.length)return;
    if(e.key==="ArrowDown"){e.preventDefault();highlight((active+1)%items.length)}
    else if(e.key==="ArrowUp"){e.preventDefault();highlight((active-1+items.length)%items.length)}
    else if(e.key==="Enter"){e.preventDefault();e.stopImmediatePropagation();choose(active<0?0:active)}
    else if(e.key==="Escape"){close()}
  });
  input.addEventListener("blur",()=>setTimeout(close,120));
  input.addEventListener("focus",()=>{if(items.length&&!state[which])render()});
}
["from","to"].forEach(setupSuggest);
