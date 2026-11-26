"use strict";
const $ = id => document.getElementById(id);
const store = {
  get(k){try{return localStorage.getItem(k)}catch(e){return null}},
  set(k,v){try{localStorage.setItem(k,v)}catch(e){}}
};

/* ---------- Geo helpers ---------- */
const R_EARTH = 6371000, rad = d => d*Math.PI/180, deg = r => r*180/Math.PI;
function dist(a,b){
  const dLat=rad(b[0]-a[0]), dLng=rad(b[1]-a[1]);
  const h=Math.sin(dLat/2)**2+Math.cos(rad(a[0]))*Math.cos(rad(b[0]))*Math.sin(dLng/2)**2;
  return 2*R_EARTH*Math.asin(Math.sqrt(h));
}
function bearing(a,b){
  const y=Math.sin(rad(b[1]-a[1]))*Math.cos(rad(b[0]));
  const x=Math.cos(rad(a[0]))*Math.sin(rad(b[0]))-Math.sin(rad(a[0]))*Math.cos(rad(b[0]))*Math.cos(rad(b[1]-a[1]));
  return (deg(Math.atan2(y,x))+360)%360;
}
const angDiff = (a,b) => ((b-a+540)%360)-180;
function decodePolyline(str){
  let i=0,lat=0,lng=0;const out=[];
  while(i<str.length){
    for(const k of [0,1]){
      let b,s=0,r=0;
      do{b=str.charCodeAt(i++)-63;r|=(b&31)<<s;s+=5}while(b>=32);
      const v=(r&1)?~(r>>1):(r>>1);
      if(k===0)lat+=v;else lng+=v;
    }
    out.push([lat/1e5,lng/1e5]);
  }
  return out;
}
class Path{
  constructor(pts){
    this.pts=pts;this.cum=[0];
    for(let i=1;i<pts.length;i++)this.cum.push(this.cum[i-1]+dist(pts[i-1],pts[i]));
    this.length=this.cum[this.cum.length-1];
  }
  at(d){
    d=Math.max(0,Math.min(this.length,d));
    let lo=0,hi=this.cum.length-1;
    while(hi-lo>1){const m=(lo+hi)>>1;if(this.cum[m]<=d)lo=m;else hi=m;}
    const seg=this.cum[hi]-this.cum[lo]||1, t=(d-this.cum[lo])/seg;
    const a=this.pts[lo],b=this.pts[hi];
    return [a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t];
  }
}
async function pool(items,n,fn,onDone){
  let i=0,done=0;const out=new Array(items.length);
  async function worker(){while(i<items.length){const k=i++;out[k]=await fn(items[k],k);onDone&&onDone(++done)}}
  await Promise.all(Array.from({length:Math.min(n,items.length)},worker));
  return out;
}
const fmtDist = m => m<1000?Math.round(m)+" m":(m/1000).toFixed(1).replace(".",",")+" km";
const fmtTime = m => {const min=Math.max(1,Math.round(m/80));return min<60?min+" min":Math.floor(min/60)+" h "+(min%60)+" min"};
const isPhone = () => matchMedia("(max-width:860px)").matches;
function setMsg(el,text,kind){el.textContent=text||"";el.className="msg"+(kind?" "+kind:"")}
const sleep = ms => new Promise(r=>setTimeout(r,ms));
