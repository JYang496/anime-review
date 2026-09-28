// Match explicit season/cour markers, not arbitrary shared title prefixes or numbers.
function seriesKey(title) {
  const normalized=(title||'').normalize('NFKC').toLowerCase().trim();
  const base=normalized.split(/第\s*[0-9一二三四五六七八九十百零〇两]+\s*(?:季|期|部分|クール)|\bseason\s*\d+|\b\d+(?:st|nd|rd|th)\s*(?:season|cour|part)|\bpart\s*\d+/u)[0];
  return base.replace(/[\s\p{P}\p{S}]/gu,'');
}

export function buildSeriesIndex(items) {
  const parent=new Map(items.map(item=>[item.id,item.id]));
  const root=id=>{let current=id;while(parent.get(current)!==current)current=parent.get(current);return current;};
  const names=new Map();
  for(const item of items) {
    for(const title of [item.title,item.original]) {
      const key=seriesKey(title);
      if(!key)continue;
      if(names.has(key))parent.set(root(item.id),root(names.get(key)));
      else names.set(key,item.id);
    }
  }
  const groups=new Map();
  for(const item of items) {
    const key=root(item.id);
    if(!groups.has(key))groups.set(key,[]);
    groups.get(key).push(item.id);
  }
  return new Map(items.map(item=>[item.id,groups.get(root(item.id))]));
}

export function toggleSelection(selected,id,seriesIndex,autoSeries=false) {
  const next=new Set(selected);
  if(next.has(id))next.delete(id);
  else for(const relatedId of (autoSeries?seriesIndex.get(id):null)||[id])next.add(relatedId);
  return next;
}
