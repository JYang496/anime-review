import {readFile,writeFile,mkdir} from 'node:fs/promises';
const candidates=JSON.parse(await readFile('scripts/game-candidates.json','utf8'));
const reviews=JSON.parse(await readFile('scripts/game-reviews.json','utf8'));
const byId=new Map(reviews.map(r=>[r.id,r]));
const titles=new Map(candidates.items.map(c=>[c.id,c.title]));
const lines=['# 二游候选审核记录','',`发现时间：${candidates.discoveredAt}。候选 ${candidates.items.length} 项；候选不等于二游，也不等于国服仍运营。`,'',
  '收录口径：国服正式上线且服务器开放；排除仅日服/国际服、已关服及未上线作品。停更但可登录的国服单独标注。无法确认的暂缓。','',
  '维护 game-reviews.json 中的审核结论与官方证据，审核通过后配置 game-seeds.json，再执行 npm run sync:games。此报告不自动批准任何游戏。','',
  '## 搜索覆盖','',...candidates.searches.map(s=>`- ${s.tag}：抓取 ${s.fetched}/${s.total}${s.truncated?'（按人气取前 200 项，非全量）':''}`),''];
for(const [decision,label] of [['approved','已通过'],['rejected','已排除'],['pending','已查看，待复核']]){
  lines.push(`## ${label}`,'');
  for(const r of reviews.filter(r=>r.decision===decision)){
    lines.push(`- ${r.title||titles.get(r.id)}（${r.id}）：${r.region} / ${r.serviceStatus}，核验 ${r.reviewedAt}。`);
    for(const e of r.evidence)lines.push(`  - [依据](${e.url})：${e.note}`);
  }
  lines.push('');
}
const pending=candidates.items.filter(c=>!byId.has(c.id));
lines.push(`## 尚未审核（${pending.length} 项）`,'','以下均不会发布。','');
for(const c of pending)lines.push(`- [${c.title.replace(/[\[\]\r\n]/g,' ')}](${c.sourceUrl})（${c.id}）；发现标签：${c.discoveredBy.join('、')}`);
await mkdir('docs',{recursive:true});
await writeFile('docs/game-candidate-review.md',lines.join('\n')+'\n');
console.log(`Review report: ${reviews.filter(r=>r.decision==='approved').length} approved, ${pending.length} unreviewed.`);
