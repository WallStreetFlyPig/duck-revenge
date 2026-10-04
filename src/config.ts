export type Vec = { x: number; y: number };
export const C = {
  width: 2400, height: 1600, step: 1 / 60, grid: 24,
  playerSpeed: 180, sprintSpeed: 330, sprintTime: .6, sprintCooldown: 3,
  visitorSpeed: 155, guardSpeed: 190, duckSpeed: 202, duckCatchup: 265,
  playerRadius: 13, duckRadius: 12, humanRadius: 25,
  interactRadius: 48, stealTime: .6, restockTime: 20, surpriseTime: .7,
  quackRadius: 260, quackCooldown: 2, sightRange: 300, rearSight: 70,
  fieldOfView: 110 * Math.PI / 180, searchTime: 4, decayDelay: 5, decayRate: 4,
  protection: 3, capacity: 3, maxMischief: 100, occupationTime: 15,
  occupationRadius: 202, occupationGrace: 2,
};
export const distance = (a: Vec, b: Vec) => Math.hypot(a.x - b.x, a.y - b.y);
export const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
export const norm = (x: number, y: number): Vec => { const n = Math.hypot(x, y); return n ? { x: x / n, y: y / n } : { x: 0, y: 0 }; };
export const spawn: Vec = { x: 360, y: 1260 };
export const fountain: Vec = { x: 1200, y: 800 };
export const safePoints: Vec[] = [spawn, { x: 610, y: 590 }, { x: 1800, y: 1280 }];
export const entrances: Vec[] = [{ x: 2260, y: 800 }, { x: 1200, y: 120 }, { x: 180, y: 800 }];
export const lunches = [{ x: 570, y: 1170 }, { x: 380, y: 380 }, { x: 680, y: 350 }, { x: 580, y: 570 }, { x: 1730, y: 350 }, { x: 2000, y: 450 }];
export const companions = [
  { name: '豆豆', accessory: 'leaf', x: 690, y: 1160, quote: '有饭？那我跟你。' },
  { name: '饼饼', accessory: 'bow', x: 360, y: 520, quote: '这次要干票大的？' },
  { name: '团团', accessory: 'glasses', x: 780, y: 390, quote: '路线我没看懂，但我支持。' },
  { name: '点点', accessory: 'bag', x: 2070, y: 580, quote: '我带了空气，轻装出发。' },
  { name: '大白', accessory: 'band', x: 1850, y: 1200, quote: '喷泉本来就是我们的。' },
];
