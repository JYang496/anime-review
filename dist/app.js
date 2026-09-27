import {filterItems,restoreSelection} from './catalog.js';
import {renderPosters} from './poster.js';
const $=s=>document.querySelector(s);
const storageKey='anime-review:selected:v1';
let items=[],selected=new Set(),year='all',quarter='all',limit=40,posterUrls=[],generating=false;
const el=(tag,className,text)=>{const e=document.createElement(tag);if(className)e.className=className;if(text!==undefined)e.textContent=text;return e;};
function safeRead(key){try{return localStorage.getItem(key)}catch{return null}}
function save(){try{localStorage.setItem(storageKey,JSON.stringify([...selected]));localStorage.setItem('anime-review:nickname',$('#nickname').value);$('#save-status').textContent='已保存至此浏览器。'}catch{$('#save-status').textContent='浏览器未允许保存，请在离开前下载清单。'}}
function coverImage(a){const img=el('img');img.src=a.cover;img.alt=a.title;img.loading='lazy';img.decoding='async';img.addEventListener('error',()=>img.replaceWith(el('span','fallback',a.title)),{once:true});return img;}
function toggle(id){const activeId=document.activeElement?.dataset.id;selected.has(id)?selected.delete(id):selected.add(id);save();render();renderCollection();if(activeId)($(`[data-id="${activeId}"]`)||$('#selected-only')).focus({preventScroll:true});}
function renderCollection(){
  $('#count').textContent=selected.size;$('#mobile-count').textContent=selected.size;
  $('#generate').disabled=!selected.size;$('#mobile-generate').disabled=!selected.size;
  const mini=$('#mini-covers');mini.replaceChildren();
  const chosen=items.filter(a=>selected.has(a.id));
  if(!chosen.length){const e=el('div','collection-empty','点击封面选择动画');mini.append(e);return;}
  chosen.slice(0,7).forEach(a=>{const b=el('button');b.title=`移除《${a.title}》`;b.setAttribute('aria-label',b.title);b.append(a.cover?coverImage(a):el('span','',a.title));b.onclick=()=>toggle(a.id);mini.append(b)});
  if(chosen.length>7){const b=el('button','',`+${chosen.length-7}`);b.setAttribute('aria-label','查看所有已选动画');b.onclick=()=>{$('#selected-only').checked=true;year='all';quarter='all';$('#search').value='';$('#type').value='all';limit=40;render();$('#catalog-title').scrollIntoView({behavior:'smooth',block:'start'})};mini.append(b)}
}
function render(){
  document.querySelectorAll('[data-year]').forEach(b=>{const active=b.dataset.year===year;b.classList.toggle('active',active);b.setAttribute('aria-pressed',active)});
  document.querySelectorAll('[data-quarter]').forEach(b=>{const active=b.dataset.quarter===quarter;b.classList.toggle('active',active);b.setAttribute('aria-pressed',active)});
  const filtered=filterItems(items,{year,quarter,type:$('#type').value,query:$('#search').value,selectedOnly:$('#selected-only').checked,selected});
  const seasons=['','冬季','春季','夏季','秋季'];
  $('#catalog-title').textContent=$('#selected-only').checked?'我的观看清单':`${year==='all'?'近三年':year+' 年'}${quarter==='all'?'动画':seasons[quarter]+'动画'}`;
  $('#result-count').textContent=`共 ${filtered.length} 部`;
  const grid=$('#grid');const fragment=document.createDocumentFragment();
  filtered.slice(0,limit).forEach(a=>{
    const b=el('button','anime-card');b.dataset.id=a.id;b.setAttribute('aria-pressed',selected.has(a.id));b.setAttribute('aria-label',`${a.title}，${selected.has(a.id)?'已看过，点击取消':'标记为看过'}`);
    const cover=el('div','cover');cover.append(a.cover?coverImage(a):el('span','fallback',a.title),el('span','check','✓'),el('span','type-badge',a.type));
    const meta=el('div','anime-meta');meta.append(el('span','',`${a.year} · ${seasons[a.quarter]}`),el('span','score',a.score?`★ ${a.score.toFixed(1)}`:''));
    b.append(cover,el('span','anime-title',a.title),meta);b.onclick=()=>toggle(a.id);fragment.append(b);
  });grid.replaceChildren(fragment);
  $('#catalog-status').hidden=!!filtered.length;$('#catalog-status').textContent=$('#selected-only').checked?'这里还没有符合条件的已选动画。试试切换年份或清除搜索。':'没有找到符合条件的动画，试试其他名字或筛选条件。';
  $('#load-more').hidden=limit>=filtered.length;$('#load-more').textContent=`加载更多 · 剩余 ${Math.max(0,filtered.length-limit)} 部 ↓`;
}
async function load(){
  try{
    const res=await fetch('data/catalog.json');if(!res.ok)throw new Error('catalog');
    const data=await res.json();if(!Array.isArray(data.items)||!data.items.length)throw new Error('empty');items=data.items;
    selected=restoreSelection(safeRead(storageKey),items);$('#nickname').value=(safeRead('anime-review:nickname')||'').slice(0,20);
    const years=$('#years');years.replaceChildren();
    ['all',...Array.from(new Set(items.map(a=>String(a.year)))).sort().reverse()].forEach(y=>{const b=el('button','',y==='all'?'近三年':y);b.dataset.year=y;b.onclick=()=>{year=y;limit=40;render()};years.append(b)});
    $('#updated').textContent=`目录更新于 ${data.updatedAt}`;render();renderCollection();
  }catch{$('#catalog-status').hidden=false;$('#catalog-status').replaceChildren(el('p','','动画目录暂时无法加载，请检查网络后重试。'));const retry=el('button','','重新加载');retry.onclick=load;$('#catalog-status').append(retry);}
}
document.querySelectorAll('[data-quarter]').forEach(b=>b.onclick=()=>{quarter=b.dataset.quarter;limit=40;render()});
['#search','#type','#selected-only'].forEach(s=>$(s).addEventListener(s==='#search'?'input':'change',()=>{limit=40;render()}));
$('#load-more').onclick=()=>{limit+=40;render()};$('#nickname').oninput=save;
async function generate(){
  if(generating||!selected.size)return;
  generating=true;$('#poster-dialog').showModal();$('#poster-preview').replaceChildren();$('#download-links').replaceChildren();
  posterUrls.forEach(u=>URL.revokeObjectURL(u));posterUrls=[];
  try{
    await Promise.race([document.fonts.ready,new Promise(r=>setTimeout(r,4000))]);
    const blobs=await renderPosters(items.filter(a=>selected.has(a.id)),$('#nickname').value,(p,total)=>$('#poster-status').textContent=`正在生成图片 ${p} / ${total}…`);
    blobs.forEach((blob,i)=>{const url=URL.createObjectURL(blob);posterUrls.push(url);const img=el('img');img.src=url;img.alt=`动画观看清单，第 ${i+1} 张`;$('#poster-preview').append(img);const a=el('a','download',blobs.length===1?'下载高清图片 ↓':`下载第 ${i+1} 张 ↓`);a.href=url;a.download=`番迹-动画观看清单-${i+1}.png`;$('#download-links').append(a)});
    $('#poster-status').textContent=blobs.length>1?`共 ${selected.size} 部，已拆分为 ${blobs.length} 张高清图片。手机也可以长按图片保存。`:'清单已生成。下载高清 PNG，或在手机上长按图片保存。';
  }catch(e){$('#poster-status').textContent=`生成失败：${e.message}。请返回后重试。`;}
  finally{generating=false;}
}
$('#generate').onclick=generate;$('#mobile-generate').onclick=generate;
$('#close-dialog').onclick=()=>$('#poster-dialog').close();$('#back').onclick=()=>$('#poster-dialog').close();
await load();
