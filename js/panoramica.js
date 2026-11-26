/* ---------- Convertir fotos en cuadros del video ----------
   Las panorámicas 360° de Mapillary vienen "aplanadas" (equirectangulares):
   el centro de la imagen mira hacia compass_angle. Aquí se recorta una vista
   normal (como una cámara) mirando hacia `heading`. */
const VIEW = {h:{w:640,h:360,fov:90}, v:{w:360,h:640,fov:62}};
const rayCache = {};
function rays(fmt){
  if(rayCache[fmt])return rayCache[fmt];
  const {w,h,fov}=VIEW[fmt], f=(w/2)/Math.tan(rad(fov)/2);
  const lon=new Float32Array(w*h), lat=new Float32Array(w*h);
  for(let j=0;j<h;j++)for(let i=0;i<w;i++){
    const x=i-w/2+.5, y=j-h/2+.5, k=j*w+i;
    lon[k]=Math.atan2(x,f);
    lat[k]=Math.atan2(-y,Math.hypot(x,f));
  }
  return rayCache[fmt]={w,h,lon,lat};
}
function pixelsOf(bmp){
  const c=document.createElement("canvas");c.width=bmp.width;c.height=bmp.height;
  const g=c.getContext("2d",{willReadFrequently:true});g.drawImage(bmp,0,0);
  return g.getImageData(0,0,c.width,c.height);
}
/* src = getImageData de la panorámica. Devuelve un ImageBitmap del tamaño del formato. */
async function panoView(src,compass,heading,fmt){
  const {w,h,lon,lat}=rays(fmt), W=src.width, H=src.height, S=src.data;
  const out=new ImageData(w,h), D=out.data;
  const yaw=rad(angDiff(compass,heading)), TWO=2*Math.PI;
  for(let k=0;k<w*h;k++){
    let u=((lon[k]+yaw)/TWO+0.5)*W-0.5; u=((u%W)+W)%W;
    let v=(0.5-lat[k]/Math.PI)*H-0.5; v=Math.max(0,Math.min(H-1.001,v));
    const x0=u|0, y0=v|0, x1=(x0+1)%W, y1=y0+1, fx=u-x0, fy=v-y0;
    const a=(y0*W+x0)*4, b=(y0*W+x1)*4, c=(y1*W+x0)*4, d=(y1*W+x1)*4, o=k*4;
    for(let ch=0;ch<3;ch++){
      const top=S[a+ch]+(S[b+ch]-S[a+ch])*fx, bot=S[c+ch]+(S[d+ch]-S[c+ch])*fx;
      D[o+ch]=top+(bot-top)*fy;
    }
    D[o+3]=255;
  }
  return createImageBitmap(out);
}
/* Fotos normales: se recortan para llenar el formato (como "cover"). */
async function flatView(bmp,fmt){
  const {w,h}=VIEW[fmt], c=document.createElement("canvas");c.width=w;c.height=h;
  const g=c.getContext("2d"), s=Math.max(w/bmp.width,h/bmp.height);
  g.drawImage(bmp,(w-bmp.width*s)/2,(h-bmp.height*s)/2,bmp.width*s,bmp.height*s);
  return createImageBitmap(c);
}
