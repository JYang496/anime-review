import {test} from 'node:test';
import assert from 'node:assert/strict';
import {filterItems,posterPages,restoreSelection} from '../dist/catalog.js';
const items=[{id:1,title:'葬送的芙莉莲',original:'葬送のフリーレン',aliases:['芙莉莲'],year:2024,quarter:1,type:'TV',date:'2024-01-01'},{id:2,title:'测试',original:'TEST',aliases:[],year:2025,quarter:3,type:'剧场版',date:'2025-07-01'}];
test('filters combine without discarding selections outside visible year',()=>{const selected=new Set([1,2]);assert.deepEqual(filterItems(items,{year:'2025',quarter:'3',type:'剧场版',selectedOnly:true,selected}).map(a=>a.id),[2]);assert.equal(selected.size,2)});
test('search supports original titles, aliases, normalized case and whitespace',()=>{assert.equal(filterItems(items,{query:' フリーレン '})[0].id,1);assert.equal(filterItems(items,{query:'ｔｅｓｔ'})[0].id,2);assert.equal(filterItems(items,{query:'芙莉莲'})[0].id,1)});
test('corrupt storage and unknown ids do not break restoration',()=>{assert.deepEqual([...restoreSelection('bad',items)],[]);assert.deepEqual([...restoreSelection('[1,1,999,"2"]',items)],[1])});
test('poster pagination preserves each title once and caps memory per canvas',()=>{const many=Array.from({length:103},(_,i)=>({...items[i%2],id:i}));const pages=posterPages(many);assert.deepEqual(pages.map(p=>p.length),[40,40,23]);assert.equal(new Set(pages.flat().map(a=>a.id)).size,103);assert.deepEqual(posterPages([]),[])});
