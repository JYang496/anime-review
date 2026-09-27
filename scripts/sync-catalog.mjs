import { mkdir, writeFile, access, rename } from 'node:fs/promises';
const today = new Date().toISOString().slice(0,10);
const year = Number(today.slice(0,4));
const startYear = Number(process.env.START_YEAR || year-2);
const headers = {'User-Agent':'AnimeReview/1.0 (https://github.com/JYang496/anime-review)', 'Content-Type':'application/json'};
const delay = ms => new Promise(r=>setTimeout(r,ms));
async function request(url, options={}) {
  for(let attempt=0; attempt<4; attempt++) {
    try { const res = await fetch(url, {...options, signal:AbortSignal.timeout(25000)}); if(!res.ok) throw new Error(`HTTP ${res.status}`); return res; }
    catch(e) { if(attempt===3) throw e; await delay(1500*(attempt+1)); }
  }
}
await mkdir('dist/data', {recursive:true}); await mkdir('dist/covers', {recursive:true});
const found = new Map();
for(let y=startYear;y<=year;y++) for(let q=0;q<4;q++) {
  const start = `${y}-${String(q*3+1).padStart(2,'0')}-01`;
  if(start>today) continue;
  const end = q===3 ? `${y+1}-01-01` : `${y}-${String(q*3+4).padStart(2,'0')}-01`;
  let offset=0;
  while(true) {
    const res = await request(`https://api.bgm.tv/v0/search/subjects?limit=100&offset=${offset}`, {method:'POST',headers,body:JSON.stringify({keyword:'',sort:'heat',filter:{type:[2],air_date:[`>=${start}`,`<${end}`],nsfw:false}})});
    const page = await res.json();
    if(!Array.isArray(page.data)) throw new Error('Invalid API response');
    for(const item of page.data) {
      if(!item.date || item.date>today || item.date<start || item.date>=end || item.nsfw || !['TV','WEB','剧场版','OVA'].includes(item.platform)) continue;
      const aliases = (item.infobox||[]).filter(x=>x.key==='别名').flatMap(x=>Array.isArray(x.value)?x.value.map(a=>a.v):[x.value]).filter(x=>typeof x==='string');
      found.set(item.id, {id:item.id,title:item.name_cn||item.name,original:item.name,aliases,date:item.date,year:y,quarter:q+1,type:item.platform,score:item.rating?.score||0,popularity:Object.values(item.collection||{}).reduce((a,b)=>a+b,0),coverSource:item.images?.common||item.image||'',cover:''});
    }
    offset+=page.data.length;
    if(!page.data.length || offset>=page.total) break;
    if(offset>=1000) throw new Error(`Quarter ${start} exceeds search cap; split date window before syncing`);
    await delay(350);
  }
  console.log(`${y} Q${q+1}: ${found.size} titles`);
  await delay(400);
}
const items=[...found.values()].sort((a,b)=>b.popularity-a.popularity);
if(!items.length) throw new Error('No titles returned; preserving previous catalogue');
let cursor=0, missing=0;
await Promise.all(Array.from({length:5},async()=>{
  while(cursor<items.length) {
    const item=items[cursor++];
    const file=`dist/covers/${item.id}.jpg`;
    if(!item.coverSource) { missing++;continue; }
    try {
      try { await access(file); } catch {
        const res=await request(item.coverSource,{headers:{'User-Agent':headers['User-Agent']}});
        if(!res.headers.get('content-type')?.startsWith('image/')) throw new Error('Not an image');
        await writeFile(file,new Uint8Array(await res.arrayBuffer()));
      }
      item.cover=`covers/${item.id}.jpg`;
    } catch { missing++; }
  }
}));
const catalog={updatedAt:today,startYear,endYear:year,source:'Bangumi',items};
await writeFile('dist/data/catalog.json.tmp',JSON.stringify(catalog));
await rename('dist/data/catalog.json.tmp','dist/data/catalog.json');
console.log(`Saved ${items.length} titles, ${missing} missing covers (text fallback enabled).`);
