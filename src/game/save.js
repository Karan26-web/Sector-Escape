// Progress persistence (localStorage)
const KEY = 'sector-escape-save-v1';
const DEFAULT = () => ({ unlocked: 1, cleared: {}, clears: {}, stars: {}, best: {}, totalScore: 0, seenStory: false });
export const save = {
  data: null,
  load() { if (this.data) return this.data; try { const raw = localStorage.getItem(KEY); this.data = raw ? { ...DEFAULT(), ...JSON.parse(raw) } : DEFAULT(); } catch { this.data = DEFAULT(); } return this.data; },
  write() { try { localStorage.setItem(KEY, JSON.stringify(this.data)); } catch {} },
  clearedLevel(id, stars, score, total) {
    const d = this.load(); d.cleared[id] = true; d.clears = d.clears || {}; d.clears[id] = (d.clears[id] || 0) + 1; d.stars[id] = Math.max(d.stars[id] || 0, stars); d.best[id] = Math.max(d.best[id] || 0, score);
    d.unlocked = Math.max(d.unlocked, Math.min(total, id + 1));
    d.totalScore = Object.values(d.best).reduce((s, v) => s + v, 0); this.write(); return d;
  },
  reset() { this.data = DEFAULT(); this.write(); },
};
