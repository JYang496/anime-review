// Discovery only: search results never authorize publication.
import {readFile,writeFile,mkdir,rename} from 'node:fs/promises';
const tags=['二次元','抽卡','手游'];
const path='scripts/game-candidates.json';
let previous;
try{previous=JSON.parse(await readFile(path,'utf8'));}catch(error){if(error.code!=='ENOENT')throw error;}
const found=new Map((previous?.items||[]).map(item=>[item.id,item]));
const searches=[];
for(const tag of tags){
  let offset=0,total=0;
  do{
    let page;
    for(let attempt=0;attempt<3;attempt++){
      try{
        const res=await fetch(`https://api.bgm.tv/v0/search/subjects?limit=20&offset=${offset}`,{
          method:'POST',headers:{'Content-Type':'application/json','User-Agent':'AnimeReview/1.0 (https://github.com/JYang496/anime-review)'},
          body:JSON.stringify({keyword:'',sort:'heat',filter:{type:[4],tag:[tag],nsfw:false}}),signal:AbortSignal.timeout(25000)});
        if(!res.ok)throw new Error(`HTTP ${res.status}`);
        page=await res.json();if(!Array.isArray(page.data))throw new Error('Invalid search response');break;
      }catch(error){if(attempt===2)throw error;await new Promise(r=>setTimeout(r,1000*(attempt+1)));}
    }
    total=page.total;
    for(const item of page.data){
      if(item.type!==4||item.nsfw)continue;
      const old=found.get(item.id);
      found.set(item.id,{id:item.id,title:item.name_cn||item.name,original:item.name,
        sourceUrl:`https://bgm.tv/subject/${item.id}`,discoveredBy:[...new Set([...(old?.discoveredBy||[]),tag])]});
    }
    if(!page.data.length)break;
    offset+=page.data.length;
    await new Promise(r=>setTimeout(r,350));
  }while(offset<total&&offset<200);
  searches.push({tag,total,fetched:offset,truncated:offset<total});
  console.log(`${tag}: ${offset}/${total}`);
}
await mkdir('scripts',{recursive:true});
await writeFile(path+'.tmp',JSON.stringify({discoveredAt:new Date().toISOString(),searches,items:[...found.values()]},null,2)+'\n');
await rename(path+'.tmp',path);
console.log(`${found.size} candidates saved. Review CN service status before adding to game-seeds.json.`);
