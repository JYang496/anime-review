import {filterItems,sortItems,restoreSelection} from './catalog.js';
import {renderPosters} from './poster.js';
import {isGames,mode,restoreGames} from './modes.js';
const $=s=>document.querySelector(s);
const storageKey=mode.key;
let items=[],selected=new Set(),year='all',quarter='all',limit=40,posterUrls=[],generating=false;
let clearedSelection=null;
const el=(tag,className,text)=>{const e=document.createElement(tag);if(className)e.className=className;if(text!==undefined)e.textContent=text;return e;};
function safeRead(key){try{return localStorage.getItem(key)}catch{return null}}
function save(){try{localStorage.setItem(storageKey,JSON.stringify([...selected]));localStorage.setItem('anime-review:nickname',$('#nickname').value);$('#save-status').textContent='已保存至此浏览器。'}catch{$('#save-status').textContent='浏览器未允许保存，请在离开前下载清单。'}}
function coverImage(a){const img=el('img');img.src=a.cover;img.alt=a.title;img.loading='lazy';img.decoding='async';img.addEventListener('error',()=>img.replaceWith(el('span','fallback',a.title)),{once:true});return img;}
function toggle(id){const activeId=document.activeElement?.dataset.id;selected.has(id)?selected.delete(id):selected.add(id);save();render();renderCollection();if(activeId)($(`[data-id="${activeId}"]`)||$('#selected-only')).focus({preventScroll:true});}
function renderCollection(){
  const count=items.filter(a=>selected.has(a.id)).length;
  $('#count').textContent=count;
  $('#generate').disabled=!count;
  const mini=$('#mini-covers');mini.replaceChildren();
  const chosen=items.filter(a=>selected.has(a.id));
  if(!chosen.length){const e=el('div','collection-empty',`点击封面选择${mode.noun}`);mini.append(e);return;}
  chosen.slice(0,7).forEach(a=>{const b=el('button');b.title=`移除《${a.title}》`;b.setAttribute('aria-label',b.title);b.append(a.cover?coverImage(a):el('span','',a.title));b.onclick=()=>toggle(a.id);mini.append(b)});
  if(chosen.length>7){const b=el('button','',`+${chosen.length-7}`);b.setAttribute('aria-label',`编辑所有已选${mode.noun}`);b.onclick=openEditor;mini.append(b)}
}
function renderEditor(){
  const chosen=items.filter(a=>selected.has(a.id));
  $('#editor-count').textContent=`共 ${chosen.length} ${mode.unit} · 点击封面移除，修改自动保存`;
  $('#clear-selection').disabled=!selected.size;
  $('#undo-clear').hidden=!clearedSelection;
  $('#editor-empty').hidden=!!chosen.length;
  const fragment=document.createDocumentFragment();
  chosen.forEach((a,index)=>{
    const b=el('button','anime-card editor-card');b.setAttribute('aria-label',`移除《${a.title}》`);
    const cover=el('div','cover');cover.append(a.cover?coverImage(a):el('span','fallback',a.title),el('span','remove-badge','移除 ×'));
    b.append(cover,el('span','anime-title',a.title));
    b.onclick=()=>{
      selected.delete(a.id);save();render();renderCollection();renderEditor();
      const buttons=$('#editor-grid').querySelectorAll('button');
      (buttons[Math.min(index,buttons.length-1)]||$('#close-editor')).focus({preventScroll:true});
    };
    fragment.append(b);
  });
  $('#editor-grid').replaceChildren(fragment);
}
function openEditor(){renderEditor();$('#collection-dialog').showModal();}
function render(){
  document.querySelectorAll('[data-year]').forEach(b=>{const active=b.dataset.year===year;b.classList.toggle('active',active);b.setAttribute('aria-pressed',active)});
  document.querySelectorAll('[data-quarter]').forEach(b=>{const active=b.dataset.quarter===quarter;b.classList.toggle('active',active);b.setAttribute('aria-pressed',active)});
  const matches=filterItems(items,{year,quarter,type:$('#type').value,query:$('#search').value,selectedOnly:$('#selected-only').checked,selected});
  const filtered=isGames ? ($('#sort').value==='title' ? [...matches].sort((a,b)=>a.title.localeCompare(b.title,'zh-CN')) : matches) : sortItems(matches,$('#sort').value);
  const seasons=['','冬季','春季','夏季','秋季'];
  $('#catalog-title').textContent=$('#selected-only').checked?mode.collection:isGames?'二游目录':`${year==='all'?'近三年':year+' 年'}${quarter==='all'?'动画':seasons[quarter]+'动画'}`;
  $('#result-count').textContent=`共 ${filtered.length} ${mode.unit}`;
  const grid=$('#grid');const fragment=document.createDocumentFragment();
  filtered.slice(0,limit).forEach(a=>{
    const b=el('button','anime-card');b.dataset.id=a.id;b.setAttribute('aria-pressed',selected.has(a.id));b.setAttribute('aria-label',`${a.title}，${selected.has(a.id)?`已${mode.verb}，点击取消`:`标记为${mode.verb}`}`);
    const cover=el('div','cover');cover.append(a.cover?coverImage(a):el('span','fallback',a.title),el('span','check','✓'),el('span','type-badge',a.type));
    const meta=el('div','anime-meta');meta.append(el('span','',isGames?'点击标记玩过':`${a.year} · ${seasons[a.quarter]}`),el('span','score',!isGames&&a.score?`★ ${a.score.toFixed(1)}`:''));
    b.append(cover,el('span','anime-title',a.title),meta);b.onclick=()=>toggle(a.id);fragment.append(b);
  });grid.replaceChildren(fragment);
  $('#catalog-status').hidden=!!filtered.length;$('#catalog-status').textContent=$('#selected-only').checked?`这里还没有符合条件的已选${mode.noun}。试试清除搜索或筛选。`:`没有找到符合条件的${mode.noun}，试试其他名字或筛选条件。`;
  $('#load-more').hidden=limit>=filtered.length;$('#load-more').textContent=`加载更多 · 剩余 ${Math.max(0,filtered.length-limit)} ${mode.unit} ↓`;
}
async function load(){
  try{
    const res=await fetch(mode.catalog);if(!res.ok)throw new Error('catalog');
    const data=await res.json();if(!Array.isArray(data.items)||!data.items.length)throw new Error('empty');items=data.items;
    selected=isGames?restoreGames(safeRead(storageKey)):restoreSelection(safeRead(storageKey),items);$('#nickname').value=(safeRead('anime-review:nickname')||'').slice(0,20);$('#nickname').disabled=false;
    const years=$('#years');years.replaceChildren();
    (isGames?[]:['all',...Array.from(new Set(items.map(a=>String(a.year)))).sort().reverse()]).forEach(y=>{const b=el('button','',y==='all'?'近三年':y);b.dataset.year=y;b.onclick=()=>{year=y;limit=40;render()};years.append(b)});
    if(isGames){const types=[...new Set(items.map(a=>a.type))];$('#type').replaceChildren(new Option('全部类型','all'),...types.map(t=>new Option(t,t)));}
    $('#updated').textContent=`目录更新于 ${data.updatedAt}`;render();renderCollection();$('#edit-collection').disabled=false;
  }catch{$('#catalog-status').hidden=false;$('#catalog-status').replaceChildren(el('p','',`${mode.noun}目录暂时无法加载，请检查网络后重试。`));const retry=el('button','','重新加载');retry.onclick=load;$('#catalog-status').append(retry);}
}
document.querySelectorAll('[data-quarter]').forEach(b=>b.onclick=()=>{quarter=b.dataset.quarter;limit=40;render()});
['#search','#type','#sort','#selected-only'].forEach(s=>$(s).addEventListener(s==='#search'?'input':'change',()=>{limit=40;render()}));
$('#edit-collection').onclick=openEditor;
$('#close-editor').onclick=()=>$('#collection-dialog').close();
$('#done-editing').onclick=()=>$('#collection-dialog').close();
$('#clear-selection').onclick=()=>{
  clearedSelection=new Set(selected);selected.clear();save();render();renderCollection();renderEditor();$('#undo-clear').focus();
};
$('#undo-clear').onclick=()=>{
  if(!clearedSelection)return;
  clearedSelection.forEach(id=>selected.add(id));clearedSelection=null;save();render();renderCollection();renderEditor();$('#clear-selection').focus();
};
$('#load-more').onclick=()=>{limit+=40;render()};$('#nickname').oninput=save;
async function generate(){
  if(generating||!items.some(a=>selected.has(a.id)))return;
  generating=true;$('#poster-dialog').showModal();$('#poster-preview').replaceChildren();$('#download-links').replaceChildren();
  posterUrls.forEach(u=>URL.revokeObjectURL(u));posterUrls=[];
  try{
    await Promise.race([document.fonts.ready,new Promise(r=>setTimeout(r,4000))]);
    const blobs=await renderPosters(items.filter(a=>selected.has(a.id)),$('#nickname').value,()=>$('#poster-status').textContent='正在生成完整长图…',{games:isGames});
    blobs.forEach((blob,i)=>{const url=URL.createObjectURL(blob);posterUrls.push(url);const img=el('img');img.src=url;img.alt=mode.title+'长图';$('#poster-preview').append(img);const a=el('a','download','下载完整长图 ↓');a.href=url;a.download=`番迹-${mode.title}.png`;$('#download-links').append(a)});
    $('#poster-status').textContent=`共 ${items.filter(a=>selected.has(a.id)).length} ${mode.unit}，已生成一张完整长图。下载 PNG，或在手机上长按图片保存。`;
  }catch(e){$('#poster-status').textContent=`生成失败：${e.message}。请返回后重试。`;}
  finally{generating=false;}
}
$('#generate').onclick=generate;
$('#close-dialog').onclick=()=>$('#poster-dialog').close();$('#back').onclick=()=>$('#poster-dialog').close();
// Reserve the actual fixed-bar heights, including wrapped controls and font changes.
const fixedBars=new ResizeObserver(()=>{
  document.documentElement.style.setProperty('--filter-height',document.querySelector('.filters').getBoundingClientRect().height+'px');
  document.documentElement.style.setProperty('--collection-height',document.querySelector('.collection').getBoundingClientRect().height+'px');
});
fixedBars.observe(document.querySelector('.filters'));
fixedBars.observe(document.querySelector('.collection'));
function configureMode(){
  document.body.classList.toggle('games-mode',isGames);
  document.querySelectorAll('[data-mode]').forEach(a=>{if(a.dataset.mode===(isGames?'games':'anime'))a.setAttribute('aria-current','page')});
  document.title='番迹 · '+mode.title;
  $('.fixed-heading h1').textContent=mode.title;
  $('.fixed-heading p').textContent=`勾选${mode.verb}的${mode.noun}，生成清单图片。`;
  $('.collection-top h2').textContent=mode.collection;
  $('.collection-count span').textContent=`${mode.unit}已选${mode.noun}`;
  $('#generate').textContent=`生成我的${mode.noun}清单 ↗`;
  $('#editor-title').textContent=isGames?'编辑游玩清单':'编辑观看清单';
  $('#editor-empty').textContent=`清单里还没有${mode.noun}，返回目录点击封面添加。`;
  $('#catalog-title').textContent=`${mode.noun}目录`;
  $('.catalog').setAttribute('aria-label',mode.noun+'目录');
  $('#catalog-status').textContent=`正在加载${mode.noun}目录…`;
  $('#result-count').textContent='';
  $('#search').setAttribute('aria-label','搜索'+mode.noun+'名称');
  $('#type').setAttribute('aria-label',mode.noun+'类型');
  $('.collection-empty').textContent=`点击封面选择${mode.noun}`;
  $('#edit-collection').disabled=true;
  $('#nickname').disabled=true;
  if(isGames){
    $('#years').hidden=true;$('#quarters').hidden=true;
    $('#search').placeholder='搜索游戏名 / 简称';
    $('#sort').replaceChildren(new Option('目录顺序','catalog'),new Option('名称顺序','title'));
    $('#type').replaceChildren(new Option('全部类型','all'));
    $('.catalog-footer p').textContent='精选二游目录，非完整榜单；玩过由你定义，不代表仍在游玩。封面版权归原权利人所有。';
  }
}
configureMode();
await load();
