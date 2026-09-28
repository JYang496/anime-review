import {readFile,writeFile,mkdir,rename,access} from 'node:fs/promises';
import {approvedForCatalog,catalogSeeds} from './game-policy.mjs';

const seeds=JSON.parse(await readFile(new URL('./game-seeds.json',import.meta.url),'utf8'));
const reviews=JSON.parse(await readFile(new URL('./game-reviews.json',import.meta.url),'utf8'));
if(new Set(seeds.map(s=>s.id)).size!==seeds.length)throw new Error('Duplicate seed IDs');
if(new Set(reviews.map(r=>r.id)).size!==reviews.length)throw new Error('Duplicate review IDs');
const reviewById=new Map(reviews.map(r=>[r.id,r]));
const headers={'User-Agent':'AnimeReview/1.0 (https://github.com/JYang496/anime-review)'};
const today=new Date().toISOString().slice(0,10);
const delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function request(url,options={}){
  for(let attempt=0;attempt<3;attempt++){
    try{const res=await fetch(url,{...options,headers:{...headers,...options.headers},signal:AbortSignal.timeout(25000)});if(!res.ok)throw new Error(`HTTP ${res.status}`);return res;}
    catch(error){if(attempt===2)throw error;await delay(1000*(attempt+1));}
  }
}
await mkdir('dist/covers/games',{recursive:true});
await mkdir('dist/data',{recursive:true});
const items=[];
const tagged=[];
let offset=0,total=0;
do{
  const page=await (await request(`https://api.bgm.tv/v0/search/subjects?limit=20&offset=${offset}`,{
    method:'POST',headers:{'Content-Type':'application/json'},
    body:JSON.stringify({keyword:'',sort:'heat',filter:{type:[4],tag:['二次元'],nsfw:false}})
  })).json();
  if(!Array.isArray(page.data)||!Number.isInteger(page.total))throw new Error('Invalid tag search response');
  total=page.total;
  if(!page.data.length&&offset<total)throw new Error('Incomplete tag search; preserving catalogue');
  for(const item of page.data){if(item.type!==4||item.nsfw)throw new Error('Unexpected tag result');tagged.push({id:item.id,title:item.name_cn||item.name});}
  offset+=page.data.length;
  if(offset>=1000&&offset<total)throw new Error('Tag search exceeds API cap; preserving catalogue');
  await delay(350);
}while(offset<total);
if(!tagged.length||new Set(tagged.map(i=>i.id)).size!==tagged.length)throw new Error('Empty or duplicate tag results; retry before publishing');
const tagIds=new Set(tagged.map(i=>i.id));
console.log(`Fetched all ${tagged.length} games tagged 二次元`);
for(const seed of catalogSeeds(seeds,reviews,tagged,today)){
  const review=reviewById.get(seed.id);
  const reviewed=approvedForCatalog(review,today);
  const taggedGame=tagIds.has(seed.id);
  const data=await (await request(`https://api.bgm.tv/v0/subjects/${seed.id}`)).json();
  if(data.type!==4||data.nsfw)throw new Error(`Invalid game: ${seed.id}`);
  const image=data.images?.large||data.images?.common||'';
  let cover='';
  if(image){
    const path=`covers/games/${seed.id}.jpg`;
    try{
      try{await access(`dist/${path}`);}catch{
        const res=await request(image);
        if(!res.headers.get('content-type')?.startsWith('image/'))throw new Error('Not an image');
        await writeFile(`dist/${path}.tmp`,new Uint8Array(await res.arrayBuffer()));
        await rename(`dist/${path}.tmp`,`dist/${path}`);
      }
      cover=path;
    }catch(error){console.warn(`Cover unavailable: ${seed.title}: ${error.message}`);}
  }
  const aliases=(data.infobox||[]).filter(x=>x.key==='别名').flatMap(x=>Array.isArray(x.value)?x.value.map(v=>v.v):[x.value]).filter(x=>typeof x==='string');
  items.push({id:`bgm-${seed.id}`,title:seed.title,original:data.name||seed.title,
    aliases:[...new Set([...seed.aliases,...aliases,data.name_cn||seed.title])],type:seed.type,cover,
    sourceUrl:`https://bgm.tv/subject/${seed.id}`,coverSource:image,
    inclusion:taggedGame?'tag:二次元':'review:cn',
    region:reviewed?'CN':'unknown',serviceStatus:reviewed?review.serviceStatus:'unknown',
    reviewedAt:reviewed?review.reviewedAt:null,
    serviceNote:reviewed?(review.displayNote||'国服 · 点击标记玩过'):(data.date&&data.date>today?'尚未发售 · 二次元标签':'二次元标签 · 点击标记玩过'),
    serviceSources:reviewed?review.evidence.map(s=>s.url):[]});
  console.log(`Synced ${seed.title}`);
  await delay(350);
}
if(!items.length)throw new Error('Empty game catalogue; preserving previous data');
const catalog={schemaVersion:3,updatedAt:today,source:'Bangumi',curated:true,scope:'anime-tag-and-reviewed',tag:'二次元',taggedIds:[...tagIds],taggedCount:tagged.length,items};
await writeFile('dist/data/games.json.tmp',JSON.stringify(catalog));
await rename('dist/data/games.json.tmp','dist/data/games.json');
console.log(`Saved ${items.length} games.`);
