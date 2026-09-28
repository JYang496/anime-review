export function filterItems(items,{year='all',quarter='all',type='all',query='',selectedOnly=false,selected=new Set()}) {
  const term=query.trim().normalize('NFKC').toLocaleLowerCase();
  return items.filter(a=>(year==='all'||a.year===Number(year))&&(quarter==='all'||a.quarter===Number(quarter))&&(type==='all'||a.type===type)&&(!selectedOnly||selected.has(a.id))&&(!term||[a.title,a.original,...(a.aliases||[])].some(t=>t.normalize('NFKC').toLocaleLowerCase().includes(term))));
}
export function posterPages(items) {
  const sorted=[...items].sort((a,b)=>b.year-a.year||b.date.localeCompare(a.date)||a.id-b.id);
  return sorted.length ? [sorted] : [];
}
export function posterCells(items) {
  const sorted=posterPages(items)[0]||[];
  const counts=new Map();
  sorted.forEach(item=>counts.set(item.year,(counts.get(item.year)||0)+1));
  const cells=[];
  let previousYear;
  for(const item of sorted) {
    if(item.year!==previousYear) {
      cells.push({kind:'year',year:item.year,count:counts.get(item.year)});
      previousYear=item.year;
    }
    cells.push({kind:'anime',item});
  }
  return cells;
}
export function sortItems(items,order='popular') {
  const recent=(a,b)=>(b.date||'').localeCompare(a.date||'')||a.id-b.id;
  const comparators={
    popular:(a,b)=>(b.popularity||0)-(a.popularity||0)||recent(a,b),
    newest:recent,
    oldest:(a,b)=>(a.date||'').localeCompare(b.date||'')||a.id-b.id,
    score:(a,b)=>(b.score||0)-(a.score||0)||recent(a,b),
    title:(a,b)=>a.title.localeCompare(b.title,'zh-CN')||a.id-b.id
  };
  return [...items].sort(comparators[order]||comparators.popular);
}
export function restoreSelection(raw,items) {
  try { const value=JSON.parse(raw); const ids=new Set(items.map(a=>a.id)); return new Set(Array.isArray(value)?value.filter(id=>Number.isInteger(id)&&ids.has(id)):[]); } catch { return new Set(); }
}
