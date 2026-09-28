import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile,access} from 'node:fs/promises';
import {filterItems,restoreSelection} from '../dist/catalog.js';
import {restoreGames,gamePosterCells} from '../dist/modes.js';

const catalog=JSON.parse(await readFile(new URL('../dist/data/games.json',import.meta.url),'utf8'));
test('curated games have unique stable ids, searchable metadata and available local covers',async()=>{
  assert.ok(catalog.items.length>=20);
  assert.equal(new Set(catalog.items.map(a=>a.id)).size,catalog.items.length);
  for(const a of catalog.items){
    assert.match(a.id,/^bgm-\d+$/);assert.ok(a.title&&a.original&&a.type);assert.ok(Array.isArray(a.aliases));
    if(a.cover){assert.match(a.cover,/^covers\/games\/\d+\.jpg$/);await access(new URL('../dist/'+a.cover,import.meta.url));}
  }
});
test('game filters combine type, normalized alias and selected state',()=>{
  const selected=new Set(['bgm-360097','bgm-284157']);
  assert.deepEqual(filterItems(catalog.items,{query:' 星铁 ',type:'回合制',selectedOnly:true,selected}).map(a=>a.id),['bgm-360097']);
  assert.equal(filterItems(catalog.items,{query:'ｚｚｚ'})[0].id,'bgm-380974');
  assert.equal(filterItems(catalog.items,{query:'星铁',type:'动作'}).length,0);
  assert.equal(selected.size,2);
});
test('game storage ignores malformed values, preserves temporarily absent games and never accepts anime ids',()=>{
  assert.deepEqual([...restoreGames('invalid')],[]);
  assert.deepEqual([...restoreGames('{}')],[]);
  assert.deepEqual([...restoreGames('[284157,"bgm-284157","bgm-284157","bgm-999999","other",null]')],['bgm-284157','bgm-999999']);
  assert.deepEqual([...restoreSelection('["bgm-284157",284157]',[{id:284157}])],[284157]);
});
test('game poster keeps every selected game in catalogue order without year cards',()=>{
  const items=catalog.items.slice(0,7);
  const cells=gamePosterCells(items);
  assert.equal(cells.length,7);
  assert.ok(cells.every(cell=>cell.kind==='game'));
  assert.deepEqual(cells.map(cell=>cell.item.id),items.map(a=>a.id));
  assert.deepEqual(gamePosterCells([]),[]);
});
