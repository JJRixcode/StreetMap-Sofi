/* ---------- Arranque ---------- */
loadMap();
sizeCanvas();
// Vuelve a dibujar el reproductor vacío cuando llega la letra Roboto
if(document.fonts)document.fonts.ready.then(()=>{if(!state.frames)drawIdle()});
