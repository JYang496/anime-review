import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {buildSeriesIndex,toggleSelection} from '../dist/series.js';

test('series link across years and localized season/cour names',()=>{
  const items=[
    {id:1,title:'测试动画',year:2024},
    {id:2,title:'测试动画 第二季 袭击篇',original:'Example Season 2',year:2025},
    {id:3,title:'另一种译名',original:'Ｅｘａｍｐｌｅ 3rd Season',year:2026},
    {id:4,title:'测试动画 第二季 第2部分'},
    {id:5,title:'测试动画外传'},
    {id:6,title:'86'},
    {id:7,title:'87'},
  ];
  const index=buildSeriesIndex(items);
  assert.deepEqual(index.get(3),[1,2,3,4]);
  assert.deepEqual(index.get(5),[5]);
  assert.deepEqual(index.get(6),[6]);
  const original=new Set([7]);
  const selected=toggleSelection(original,2,index,true);
  assert.deepEqual([...selected],[7,1,2,3,4]);
  assert.deepEqual([...original],[7]);
  assert.deepEqual([...toggleSelection(selected,3,index,true)],[7,1,2,4]);
  assert.deepEqual([...toggleSelection(original,2,index,false)],[7,2]);
  assert.deepEqual([...toggleSelection(original,99,index,true)],[7,99]);
});

test('current catalogue links seasons without selecting unrelated anime',()=>{
  const {items}=JSON.parse(readFileSync(new URL('../dist/data/catalog.json',import.meta.url),'utf8'));
  const index=buildSeriesIndex(items);
  assert.ok(index.get(515880).includes(569116)); // Grand Blue seasons 2 and 3
  assert.ok(index.get(425998).includes(633836)); // Re:Zero seasons and split cours
  assert.ok(!index.get(515880).includes(425998));
});
