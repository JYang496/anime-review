export function filterItems(items,{year='all',quarter='all',type='all',query='',selectedOnly=false,selected=new Set()}) {
  const term=query.trim().normalize('NFKC').toLocaleLowerCase();
  return items.filter(a=>(year==='all'||a.year===Number(year))&&(quarter==='all'||a.quarter===Number(quarter))&&(type==='all'||a.type===type)&&(!selectedOnly||selected.has(a.id))&&(!term||[a.title,a.original,...(a.aliases||[])].some(t=>t.normalize('NFKC').toLocaleLowerCase().includes(term))));
}
export function posterPages(items,size=40) {
  const sorted=[...items].sort((a,b)=>b.year-a.year||b.date.localeCompare(a.date)||a.id-b.id);
  return Array.from({length:Math.ceil(sorted.length/size)},(_,i)=>sorted.slice(i*size,(i+1)*size));
}
export function restoreSelection(raw,items) {
  try { const value=JSON.parse(raw); const ids=new Set(items.map(a=>a.id)); return new Set(Array.isArray(value)?value.filter(id=>Number.isInteger(id)&&ids.has(id)):[]); } catch { return new Set(); }
}
