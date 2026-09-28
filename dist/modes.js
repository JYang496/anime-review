export const isGames = new URLSearchParams(globalThis.location?.search || '').get('mode') === 'games';
export const mode = isGames ? {
  key: 'anime-review:games:selected:v1', catalog: 'data/games.json', noun: '二游', unit: '款',
  title: '二游游玩清单', collection: '我的游玩清单', verb: '玩过', all: '全部游戏',
} : {
  key: 'anime-review:selected:v1', catalog: 'data/catalog.json', noun: '动画', unit: '部',
  title: '动画观看清单', collection: '我的观看清单', verb: '看过', all: '近三年',
};

export function restoreGames(raw) {
  try {
    const ids = JSON.parse(raw);
    return new Set(Array.isArray(ids) ? ids.filter(id => typeof id === 'string' && /^bgm-\d+$/.test(id)) : []);
  } catch { return new Set(); }
}

export function gamePosterCells(items) {
  return items.map(item => ({kind: 'game', item}));
}
