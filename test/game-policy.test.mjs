import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {approvedForCatalog,catalogSeeds} from '../scripts/game-policy.mjs';
const today='2026-09-27';
const valid={decision:'approved',region:'CN',serviceStatus:'active',reviewedAt:today,evidence:[{url:'https://example.com/official',note:'Official release announcement'}]};
test('discovery never bypasses CN operating-status and evidence review',()=>{
  assert.equal(approvedForCatalog(valid,today),true);
  for(const review of [undefined,{}, {...valid,decision:'pending'},{...valid,decision:'rejected'},
    {...valid,region:'JP'},{...valid,region:'Global'},{...valid,serviceStatus:'closed'},
    {...valid,serviceStatus:'unreleased'},{...valid,serviceStatus:'unknown'},
    {...valid,evidence:[]},{...valid,reviewedAt:'2027-01-01'}, {...valid,shutdownAt:today}]){
    assert.equal(approvedForCatalog(review,today),false);
  }
  assert.equal(approvedForCatalog({...valid,serviceStatus:'maintenance'},today),true);
});
test('explicit anime tag includes unreviewed, overseas, closed and unreleased games without duplicates',()=>{
  const seeds=[{id:1,title:'Existing'},{id:2,title:'Reviewed'}];
  const reviews=[{...valid,id:1,decision:'rejected',region:'JP',serviceStatus:'closed'},{...valid,id:2}];
  const tagged=[{id:1,title:'Source name'},{id:3,title:'Future title'}];
  assert.deepEqual(catalogSeeds(seeds,reviews,tagged,today).map(i=>i.id),[1,2,3]);
  assert.equal(catalogSeeds(seeds,reviews,tagged,today)[0].title,'Existing');
});
test('published catalogue covers every tag result plus approved seeds and never invents CN evidence',async()=>{
  const read=async path=>JSON.parse(await readFile(new URL(path,import.meta.url),'utf8'));
  const [seeds,reviews,catalog]=await Promise.all([read('../scripts/game-seeds.json'),read('../scripts/game-reviews.json'),read('../dist/data/games.json')]);
  const map=new Map(reviews.map(r=>[r.id,r]));
  assert.equal(map.size,reviews.length);
  assert.equal(new Set(seeds.map(s=>s.id)).size,seeds.length);
  const tagged=catalog.taggedIds.map(id=>({id,title:'Tag title'}));
  assert.equal(catalog.taggedCount,tagged.length);
  assert.equal(new Set(catalog.taggedIds).size,tagged.length);
  assert.deepEqual(catalog.items.map(i=>i.id),catalogSeeds(seeds,reviews,tagged,catalog.updatedAt).map(s=>`bgm-${s.id}`));
  for(const item of catalog.items){
    if(item.region==='CN'){assert.ok(item.serviceSources.length);assert.ok(item.reviewedAt);}
    else{assert.equal(item.inclusion,'tag:二次元');assert.equal(item.region,'unknown');assert.equal(item.reviewedAt,null);assert.deepEqual(item.serviceSources,[]);}
  }
  assert.ok(catalog.items.some(i=>i.id==='bgm-378389'));
});
