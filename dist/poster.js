import {posterPages} from './catalog.js';
function wrap(ctx,text,x,y,width,lineHeight,maxLines=2) {
  const chars=Array.from(text);let line='',row=0;
  for(let i=0;i<chars.length;i++) {
    const char=chars[i];
    if(ctx.measureText(line+char).width>width && line) {
      if(row===maxLines-1) { while(ctx.measureText(line+'…').width>width) line=line.slice(0,-1);ctx.fillText(line+'…',x,y+row*lineHeight);return; }
      ctx.fillText(line,x,y+row*lineHeight);row++;line=char;
    } else line+=char;
  }
  ctx.fillText(line,x,y+row*lineHeight);
}
async function loadImage(path) {
  if(!path)return null;
  return new Promise(resolve=>{const img=new Image();const timer=setTimeout(()=>resolve(null),12000);img.onload=()=>{clearTimeout(timer);resolve(img)};img.onerror=()=>{clearTimeout(timer);resolve(null)};img.src=path;});
}
function drawCover(ctx,img,x,y,w,h) {
  if(!img)return;
  const scale=Math.max(w/img.width,h/img.height),sw=w/scale,sh=h/scale;
  ctx.drawImage(img,(img.width-sw)/2,(img.height-sh)/2,sw,sh,x,y,w,h);
}
export async function renderPosters(items,nickname,onProgress=()=>{}) {
  const pages=posterPages(items),results=[];
  const years=[...new Set(items.map(a=>a.year))].sort();
  const range=years.length===1?String(years[0]):`${years[0]}—${years.at(-1)}`;
  for(let p=0;p<pages.length;p++) {
    onProgress(p+1,pages.length);
    const page=pages[p];const groups=[...new Set(page.map(a=>a.year))].map(year=>({year,items:page.filter(a=>a.year===year)}));
    const height=300+groups.reduce((h,g)=>h+80+Math.ceil(g.items.length/5)*320,0)+100;
    const canvas=document.createElement('canvas');canvas.width=1200;canvas.height=height;
    const ctx=canvas.getContext('2d');
    if(!ctx)throw new Error('当前浏览器不支持图片生成');
    ctx.fillStyle='#f5f6fb';ctx.fillRect(0,0,1200,height);
    ctx.fillStyle='#425ce8';ctx.fillRect(0,0,1200,12);
    ctx.font='bold 20px "Noto Sans SC", sans-serif';ctx.fillText('番迹  /  ANIME REVIEW',60,75);
    ctx.fillStyle='#222632';ctx.font='bold 48px "Noto Sans SC", sans-serif';
    wrap(ctx,`${nickname.trim()||'我'}的动画观看清单`,60,155,1080,55,2);
    ctx.fillStyle='#747e93';ctx.font='23px "Noto Sans SC", sans-serif';ctx.fillText(`收录 ${range} 年播出的作品  ·  共 ${items.length} 部`,60,257);
    let y=300;
    for(const group of groups) {
      ctx.fillStyle='#425ce8';ctx.font='bold 30px "Noto Sans SC", sans-serif';ctx.fillText(`${group.year}`,60,y+40);
      ctx.fillStyle='#959db0';ctx.font='18px sans-serif';ctx.fillText('那些陪你度过的好时光',165,y+37);y+=80;
      const images=await Promise.all(group.items.map(a=>loadImage(a.cover)));
      group.items.forEach((a,i)=>{
        const x=60+(i%5)*220,top=y+Math.floor(i/5)*320;
        ctx.fillStyle='#e1e6f2';ctx.fillRect(x,top,200,250);
        if(images[i])drawCover(ctx,images[i],x,top,200,250);
        else {ctx.fillStyle='#7382a2';ctx.font='24px "Noto Sans SC", sans-serif';wrap(ctx,a.title,x+15,top+90,170,38,3);}
        ctx.fillStyle='#303849';ctx.font='500 20px "Noto Sans SC", sans-serif';wrap(ctx,a.title,x,top+279,200,27,2);
      });
      y+=Math.ceil(group.items.length/5)*320;
    }
    ctx.strokeStyle='#dce1ed';ctx.beginPath();ctx.moveTo(60,height-85);ctx.lineTo(1140,height-85);ctx.stroke();
    ctx.fillStyle='#8992a5';ctx.font='17px "Noto Sans SC", sans-serif';ctx.fillText('每一部，都有你的回忆。  ·  资料来源 Bangumi',60,height-43);
    ctx.textAlign='right';ctx.fillText(`${p+1} / ${pages.length}`,1140,height-43);
    const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/png'));
    if(!blob)throw new Error('图片生成失败，请减少作品数量后重试');
    results.push(blob);canvas.width=1;canvas.height=1;
  }
  return results;
}
