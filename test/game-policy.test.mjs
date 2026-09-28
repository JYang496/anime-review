import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {approvedForCatalog} from '../scripts/game-policy.mjs';
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
test('published catalogue is exactly the approved seed set and includes audit sources',async()=>{
  const read=async path=>JSON.parse(await readFile(new URL(path,import.meta.url),'utf8'));
  const [seeds,reviews,catalog]=await Promise.all([read('../scripts/game-seeds.json'),read('../scripts/game-reviews.json'),read('../dist/data/games.json')]);
  const map=new Map(reviews.map(r=>[r.id,r]));
  assert.equal(map.size,reviews.length);
  assert.equal(new Set(seeds.map(s=>s.id)).size,seeds.length);
  assert.deepEqual(catalog.items.map(i=>i.id),seeds.filter(s=>approvedForCatalog(map.get(s.id),catalog.updatedAt)).map(s=>`bgm-${s.id}`));
  for(const item of catalog.items){assert.equal(item.region,'CN');assert.ok(item.serviceSources.length);assert.ok(item.reviewedAt);}
  assert.ok(!catalog.items.some(i=>['bgm-136802','bgm-315061','bgm-378389'].includes(i.id)));
});
