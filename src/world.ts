import { C, clamp, distance, norm, type Vec } from './config.ts';
export type Obstacle = { x: number; y: number; w: number; h: number; kind: 'hedge' | 'tree' | 'rim' | 'statue' | 'cart' };
export const obstacles: Obstacle[] = [];
const rect = (x: number, y: number, w: number, h: number, kind: Obstacle['kind'] = 'hedge') => obstacles.push({ x, y, w, h, kind });
// Three 48-unit passages. A 50-unit human body must route around each hedge.
rect(460, 1010, 230, 42); rect(738, 1010, 140, 42);
rect(900, 245, 42, 225); rect(900, 518, 42, 150);
rect(1550, 1020, 42, 180); rect(1550, 1248, 42, 160);
rect(280, 690, 330, 42); rect(280, 210, 230, 42);
rect(1400, 240, 42, 240); rect(1510, 640, 470, 42);
rect(1690, 1000, 310, 42); rect(2030, 1100, 42, 240);
rect(1690, 1370, 340, 42); rect(650, 1330, 260, 42);
// Fountain has three broad entryways: north, west and east.
rect(960, 570, 180, 32, 'rim'); rect(1260, 570, 180, 32, 'rim');
rect(960, 602, 32, 138, 'rim'); rect(960, 860, 32, 170, 'rim');
rect(1408, 602, 32, 138, 'rim'); rect(1408, 860, 32, 170, 'rim');
rect(992, 998, 416, 32, 'rim'); rect(1160, 755, 80, 90, 'statue');
rect(1830, 240, 130, 75, 'cart');
for (const [x, y] of [[220,450],[790,710],[1080,250],[1290,390],[1640,520],[2170,330],[2150,920],[2160,1440],[1380,1260],[1110,1400],[410,1460],[160,1060],[480,900],[1710,860]]) rect(x - 18, y - 18, 36, 36, 'tree');
export const gaps = [{ x: 714, y: 1031 }, { x: 921, y: 494 }, { x: 1571, y: 1224 }];

export function collides(p: Vec, radius: number) {
  if (p.x < radius + 40 || p.y < radius + 40 || p.x > C.width - radius - 40 || p.y > C.height - radius - 40) return true;
  return obstacles.some(o => Math.hypot(p.x - clamp(p.x, o.x, o.x + o.w), p.y - clamp(p.y, o.y, o.y + o.h)) < radius - .01);
}
export function clearLine(a: Vec, b: Vec, radius = 0) {
  const n = Math.max(1, Math.ceil(distance(a, b) / 7));
  for (let i = 0; i <= n; i++) if (collides({ x: a.x + (b.x - a.x) * i / n, y: a.y + (b.y - a.y) * i / n }, radius || .1)) return false;
  return true;
}
export function move(p: Vec, dx: number, dy: number, radius: number) {
  const n = Math.max(1, Math.ceil(Math.hypot(dx, dy) / 5));
  for (let i = 0; i < n; i++) {
    const q = { x: p.x + dx / n, y: p.y };
    if (!collides(q, radius)) p.x = q.x;
    q.x = p.x; q.y = p.y + dy / n;
    if (!collides(q, radius)) p.y = q.y;
  }
}
const cols = C.width / C.grid, rows = Math.ceil(C.height / C.grid);
const grids = new Map<number, Uint8Array>();
function grid(radius: number) {
  if (!grids.has(radius)) {
    const g = new Uint8Array(cols * rows);
    for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) g[y * cols + x] = collides({ x: x * C.grid + C.grid / 2, y: y * C.grid + C.grid / 2 }, radius) ? 1 : 0;
    grids.set(radius, g);
  }
  return grids.get(radius)!;
}
// Binary heap A*: cached clearance grids and no diagonal corner cutting.
export function findPath(from: Vec, to: Vec, radius: number): Vec[] {
  if (clearLine(from, to, radius)) return [{ ...to }];
  const g = grid(radius), idx = (p: Vec) => clamp(Math.floor(p.y / C.grid), 0, rows - 1) * cols + clamp(Math.floor(p.x / C.grid), 0, cols - 1);
  const point = (i: number) => ({ x: (i % cols) * C.grid + C.grid / 2, y: Math.floor(i / cols) * C.grid + C.grid / 2 });
  const nearest = (p: Vec) => {
    const base = idx(p); if (!g[base] && clearLine(p, point(base), radius)) return base;
    let best = -1, d = Infinity;
    for (let y = -4; y <= 4; y++) for (let x = -4; x <= 4; x++) {
      const n = base + y * cols + x;
      if (n >= 0 && n < g.length && !g[n]) {const v = distance(p, point(n)); if (v < d && clearLine(p, point(n), radius)) {best = n; d = v;}}
    }
    return best;
  };
  const start = nearest(from), end = nearest(to); if (start < 0 || end < 0) return [];
  const costs = new Float32Array(g.length).fill(Infinity), previous = new Int32Array(g.length).fill(-1), closed = new Uint8Array(g.length);
  const heap: { i: number; f: number }[] = [];
  const push = (i: number, f: number) => { let j = heap.length; heap.push({i,f}); while (j > 0) { const p = (j - 1) >> 1; if (heap[p].f <= f) break; heap[j] = heap[p]; j = p; } heap[j] = {i,f}; };
  const pop = () => {const first = heap[0], last = heap.pop()!; if (heap.length) {let i = 0; while (i * 2 + 1 < heap.length) {let c = i * 2 + 1; if (c + 1 < heap.length && heap[c + 1].f < heap[c].f) c++; if (last.f <= heap[c].f) break; heap[i] = heap[c]; i = c;} heap[i] = last;} return first.i;};
  costs[start] = 0; push(start, 0);
  const steps = [-cols, cols, -1, 1, -cols-1, -cols+1, cols-1, cols+1];
  while (heap.length) {
    const u = pop(); if (closed[u]) continue; if (u === end) {
      const path: Vec[] = [{ ...to }]; let n = end;
      while (n !== start) { path.push(point(n)); n = previous[n]; }
      path.reverse(); return path;
    }
    closed[u] = 1;
    for (const s of steps) {
      const v = u + s; if (v < 0 || v >= g.length || g[v] || closed[v] || Math.abs(v % cols - u % cols) > 1) continue;
      const diagonal = Math.abs(s) > 1 && Math.abs(s) !== cols;
      if (diagonal && (g[u + (s < 0 ? -cols : cols)] || g[u + (v % cols > u % cols ? 1 : -1)])) continue;
      const cost = costs[u] + (diagonal ? 1.414 : 1);
      if (cost < costs[v]) { costs[v] = cost; previous[v] = u; push(v, cost + distance(point(v), point(end)) / C.grid); }
    }
  }
  return [];
}
export type Navigator = Vec & { path: Vec[]; repath: number; face: Vec; moving: boolean };
export function navigate(a: Navigator, target: Vec, speed: number, radius: number, dt: number, phase = 0) {
  a.repath -= dt; a.moving = false;
  if (distance(a, target) < 5) return;
  if (a.repath <= 0) { const direct = clearLine(a, target, radius); a.path = direct ? [{ ...target }] : findPath(a, target, radius); a.repath = (direct ? .18 : .5) + phase * .025; }
  while (a.path.length > 1 && distance(a, a.path[0]) < 9) a.path.shift();
  const next = a.path[0]; if (!next) return;
  const dir = norm(next.x - a.x, next.y - a.y), step = Math.min(speed * dt, distance(a, next));
  a.face = dir; a.moving = true; move(a, dir.x * step, dir.y * step, radius);
}
