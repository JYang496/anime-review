import {readFile,writeFile,mkdir} from 'node:fs/promises';
const candidates=JSON.parse(await readFile('scripts/game-candidates.json','utf8'));
const reviews=JSON.parse(await readFile('scripts/game-reviews.json','utf8'));
const catalog=JSON.parse(await readFile('dist/data/games.json','utf8'));
const published=new Set(catalog.items.map(i=>Number(i.id.slice(4))));
const byId=new Map(reviews.map(r=>[r.id,r]));
const titles=new Map(candidates.items.map(c=>[c.id,c.title]));
const lines=['# 二游候选审核记录','',`发现时间：${candidates.discoveredAt}。候选 ${candidates.items.length} 项；候选不等于二游，也不等于国服仍运营。`,'',
  '最新收录口径：全部「二次元」标签游戏直接加入，另保留原有审核通过目录。以下结论仅为国服运营审核历史，不限制标签条目收录。','',
  '维护 game-reviews.json 中的审核结论与官方证据，审核通过后配置 game-seeds.json，再执行 npm run sync:games。「二次元」标签条目无需通过国服运营审核即可收录。','',
  '## 搜索覆盖','',...candidates.searches.map(s=>`- ${s.tag}：抓取 ${s.fetched}/${s.total}${s.truncated?'（按人气取前 200 项，非全量）':''}`),''];
for(const [decision,label] of [['approved','已通过'],['rejected','国服运营审核未通过'],['pending','已查看，待复核']]){
  lines.push(`## ${label}`,'');
  for(const r of reviews.filter(r=>r.decision===decision)){
    lines.push(`- ${r.title||titles.get(r.id)}（${r.id}）：${r.region} / ${r.serviceStatus}，核验 ${r.reviewedAt}。目录：${published.has(r.id)?'已收录':'未收录'}。`);
    for(const e of r.evidence)lines.push(`  - [依据](${e.url})：${e.note}`);
  }
  lines.push('');
}
const pending=candidates.items.filter(c=>!byId.has(c.id));
lines.push(`## 尚未审核（${pending.length} 项）`,'','标签条目可以在尚未完成国服审核时收录，以下标注当前目录状态。','');
for(const c of pending)lines.push(`- [${c.title.replace(/[\[\]\r\n]/g,' ')}](${c.sourceUrl})（${c.id}）；目录：${published.has(c.id)?'已收录':'未收录'}；发现标签：${c.discoveredBy.join('、')}`);
await mkdir('docs',{recursive:true});
await writeFile('docs/game-candidate-review.md',lines.join('\n')+'\n');
console.log(`Review report: ${reviews.filter(r=>r.decision==='approved').length} approved, ${pending.length} unreviewed.`);
