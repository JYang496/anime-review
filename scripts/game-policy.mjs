// A discovery tag or a Bangumi release date is not evidence of mainland service.
export function approvedForCatalog(review,today=new Date().toISOString().slice(0,10)){
  return !!review && review.decision==='approved' && review.region==='CN'
    && ['active','maintenance'].includes(review.serviceStatus)
    && /^\d{4}-\d{2}-\d{2}$/.test(review.reviewedAt||'') && review.reviewedAt<=today
    && (!review.shutdownAt || review.shutdownAt>today)
    && Array.isArray(review.evidence) && review.evidence.length>0
    && review.evidence.every(source=>typeof source.url==='string' && source.url.startsWith('https://') && source.note);
}

// Explicit tag inclusion is independent of the older mainland-service review.
export function catalogSeeds(seeds,reviews,tagged,today){
  const reviewById=new Map(reviews.map(r=>[r.id,r]));
  const tagIds=new Set(tagged.map(item=>item.id));
  const merged=new Map(seeds.filter(s=>tagIds.has(s.id)||approvedForCatalog(reviewById.get(s.id),today)).map(s=>[s.id,s]));
  for(const item of tagged)if(!merged.has(item.id))merged.set(item.id,{id:item.id,title:item.title,type:'其他',aliases:[]});
  return [...merged.values()];
}
