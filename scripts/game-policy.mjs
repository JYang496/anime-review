// A discovery tag or a Bangumi release date is not evidence of mainland service.
export function approvedForCatalog(review,today=new Date().toISOString().slice(0,10)){
  return !!review && review.decision==='approved' && review.region==='CN'
    && ['active','maintenance'].includes(review.serviceStatus)
    && /^\d{4}-\d{2}-\d{2}$/.test(review.reviewedAt||'') && review.reviewedAt<=today
    && (!review.shutdownAt || review.shutdownAt>today)
    && Array.isArray(review.evidence) && review.evidence.length>0
    && review.evidence.every(source=>typeof source.url==='string' && source.url.startsWith('https://') && source.note);
}
