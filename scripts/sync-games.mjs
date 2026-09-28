import {readFile,writeFile,mkdir,rename,access} from 'node:fs/promises';
import {approvedForCatalog} from './game-policy.mjs';

const seeds=JSON.parse(await readFile(new URL('./game-seeds.json',import.meta.url),'utf8'));
const reviews=JSON.parse(await readFile(new URL('./game-reviews.json',import.meta.url),'utf8'));
if(new Set(seeds.map(s=>s.id)).size!==seeds.length)throw new Error('Duplicate seed IDs');
if(new Set(reviews.map(r=>r.id)).size!==reviews.length)throw new Error('Duplicate review IDs');
const reviewById=new Map(reviews.map(r=>[r.id,r]));
const headers={'User-Agent':'AnimeReview/1.0 (https://github.com/JYang496/anime-review)'};
const today=new Date().toISOString().slice(0,10);
const delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function request(url){
  for(let attempt=0;attempt<3;attempt++){
    try{const res=await fetch(url,{headers,signal:AbortSignal.timeout(25000)});if(!res.ok)throw new Error(`HTTP ${res.status}`);return res;}
    catch(error){if(attempt===2)throw error;await delay(1000*(attempt+1));}
  }
}
await mkdir('dist/covers/games',{recursive:true});
await mkdir('dist/data',{recursive:true});
const items=[];
for(const seed of seeds){
  const review=reviewById.get(seed.id);
  if(!approvedForCatalog(review,today)){console.log(`Not approved for CN catalogue: ${seed.title}`);continue;}
  const data=await (await request(`https://api.bgm.tv/v0/subjects/${seed.id}`)).json();
  if(data.type!==4||data.nsfw)throw new Error(`Invalid game: ${seed.id}`);
  // Future releases should not be offered as publicly playable games.
  if(data.date&&data.date>today){console.log(`Skipping future release: ${seed.title}`);continue;}
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
    region:'CN',serviceStatus:review.serviceStatus,reviewedAt:review.reviewedAt,
    serviceNote:review.displayNote||'',serviceSources:review.evidence.map(s=>s.url)});
  console.log(`Synced ${seed.title}`);
  await delay(350);
}
if(!items.length)throw new Error('Empty game catalogue; preserving previous data');
const catalog={schemaVersion:2,updatedAt:today,source:'Bangumi',curated:true,scope:'cn-live',items};
await writeFile('dist/data/games.json.tmp',JSON.stringify(catalog));
await rename('dist/data/games.json.tmp','dist/data/games.json');
console.log(`Saved ${items.length} games.`);
