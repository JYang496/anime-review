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
    const columns=Math.min(4,Math.max(...groups.map(g=>g.items.length)));
    const padding=28,gap=20;
    const width=1080;
    const coverWidth=(width-padding*2-(columns-1)*gap)/columns;
    const coverHeight=Math.round(coverWidth*1.4),rowHeight=coverHeight+80;
    const headerHeight=190,groupHeading=54,footerHeight=70;
    const height=headerHeight+groups.reduce((h,g)=>h+groupHeading+Math.ceil(g.items.length/columns)*rowHeight,0)+footerHeight;
    // Keep one complete image; scale very large lists instead of splitting them.
    const scale=Math.min(1,16000/height,Math.sqrt(8000000/(width*height)));
    const canvas=document.createElement('canvas');canvas.width=Math.floor(width*scale);canvas.height=Math.floor(height*scale);
    const ctx=canvas.getContext('2d');
    if(!ctx)throw new Error('当前浏览器不支持图片生成');
    ctx.scale(scale,scale);
    ctx.fillStyle='#f5f6fb';ctx.fillRect(0,0,width,height);
    ctx.fillStyle='#425ce8';ctx.fillRect(0,0,width,6);
    const title=`${nickname.trim()||'我'}的动画观看清单`;
    let titleSize=42;
    do {ctx.font=`bold ${titleSize}px "Noto Sans SC", sans-serif`;if(ctx.measureText(title).width<=width-padding*2||titleSize<=28)break;titleSize-=2;}while(true);
    const titleLines=ctx.measureText(title).width>width-padding*2?2:1;
    wrap(ctx,title,padding,64,width-padding*2,46,2);
    ctx.fillStyle='#747e93';ctx.font='26px "Noto Sans SC", sans-serif';ctx.fillText(`收录 ${range} 年作品 · 共 ${items.length} 部`,padding,64+titleLines*46);
    // Short titles reclaim the unused second line instead of leaving a blank band.
    const headerOffset=titleLines===1?46:0;
    let y=headerHeight-headerOffset;
    for(const group of groups) {
      ctx.fillStyle='#425ce8';ctx.font='bold 30px "Noto Sans SC", sans-serif';ctx.fillText(`${group.year}`,padding,y+34);
      ctx.fillStyle='#959db0';ctx.font='24px sans-serif';ctx.fillText(`${group.items.length} 部`,padding+100,y+32);y+=groupHeading;
      for(let start=0;start<group.items.length;start+=columns) {
      const row=group.items.slice(start,start+columns);
      const images=await Promise.all(row.map(a=>loadImage(a.cover)));
      row.forEach((a,j)=>{
        const i=start+j;
        const x=padding+(i%columns)*(coverWidth+gap),top=y+Math.floor(i/columns)*rowHeight;
        ctx.fillStyle='#e1e6f2';ctx.fillRect(x,top,coverWidth,coverHeight);
        if(images[j])drawCover(ctx,images[j],x,top,coverWidth,coverHeight);
        else {ctx.fillStyle='#7382a2';ctx.font='28px "Noto Sans SC", sans-serif';wrap(ctx,a.title,x+12,top+coverHeight/3,coverWidth-24,38,3);}
        ctx.fillStyle='#303849';ctx.font='500 26px "Noto Sans SC", sans-serif';wrap(ctx,a.title,x,top+coverHeight+32,coverWidth,32,2);
      });
      }
      y+=Math.ceil(group.items.length/columns)*rowHeight;
    }
    ctx.strokeStyle='#dce1ed';ctx.beginPath();ctx.moveTo(padding,y+8);ctx.lineTo(width-padding,y+8);ctx.stroke();
    ctx.fillStyle='#8992a5';ctx.font='24px "Noto Sans SC", sans-serif';ctx.fillText('资料来源 Bangumi',padding,y+44);
    const output=document.createElement('canvas');output.width=canvas.width;output.height=Math.floor((height-headerOffset)*scale);
    output.getContext('2d').drawImage(canvas,0,0);
    const blob=await new Promise(resolve=>output.toBlob(resolve,'image/png'));
    if(!blob)throw new Error('图片生成失败，请减少作品数量后重试');
    results.push(blob);canvas.width=1;canvas.height=1;output.width=1;output.height=1;
  }
  return results;
}
