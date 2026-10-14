// ═══════════════════════════════════════════════════════════
//  MOPE.IO CLONE — SERVER (17 животных) — КАРТА ПО РИСУНКУ
// ═══════════════════════════════════════════════════════════

const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const path = require('path');
const { getAbilityByLevel } = require('./abilities');

const app = express();
app.use(express.static(path.join(__dirname, 'public')));

const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// ═══════════════════════════════════════════════════════════
//  КОНФИГ
// ═══════════════════════════════════════════════════════════

const WORLD = { width: 8000, height: 8000 };
const TICK_RATE = 30;
const FOOD_COUNT = 600;
const HOLE_COUNT = 80;
const CRYSTAL_COUNT = 25;
const ADMIN_PASSWORD = '1';

const VOLCANO = { x: 4000, y: 4000, r: 800 };
const DUCK_ISLAND = { x: 2000, y: 4000, r: 300 };
const DUCK_POND = { x: 2000, y: 4000, r: 150 };

const ARENA = {
  x: 6500, y: 1000, startR: 1800, minR: 800,
  shrinkDelay: 60000, shrinkRate: 15
};

const HOLE_COOLDOWN_MS = 800;
const HOLE_ENTER_RADIUS = 0.7;
const HOLE_EXIT_RADIUS = 1.0;
const HOLE_INSIDE_SPEED_MUL = 0.5;

const BOOST_COOLDOWN_MS = 1000;
const BOOST_DURATION_MS = 700;
const BOOST_SPEED_MUL = 2.2;
const MAX_TURN_PER_TICK = 0.35;

const SPIT_COOLDOWN_MS = 600;
const SPIT_WATER_COST = 5;
const SPIT_SPEED = 14;
const SPIT_WATER_RESTORE = 5;       // ← было 15, стало 5 (как стоимость)
const SPIT_PUDDLE_LIFETIME_MS = 5000; // ← лужа лежит 5 сек

const TAIL_BITE_COOLDOWN_MS = 3000;
const TAIL_BITE_XP_FLAT = 40;
const TAIL_BITE_XP_PERCENT = 0.03;
const TAIL_BITE_TURN_DELAY_MS = 400;
const TAIL_BITE_DAMAGE = 2;

const ARENA_WALL_DAMAGE = 1.5;

// ═══════════════════════════════════════════════════════════
//  17 ЖИВОТНЫХ
// ═══════════════════════════════════════════════════════════

const ANIMALS = [
  { name: 'Mouse',         ru: 'Мышка',           r: 15,  speed: 12, hp: 30,   damage: 5,   fov: 500,  color: '#9BA9B9' },
  { name: 'Rabbit',        ru: 'Кролик',          r: 20,  speed: 12, hp: 50,   damage: 8,   fov: 700,  color: '#AA937E' },
  { name: 'Pig',           ru: 'Свинья',          r: 26,  speed: 11, hp: 70,   damage: 10,  fov: 800,  color: '#DD6BD4' },
  { name: 'Fox',           ru: 'Лиса',            r: 32,  speed: 12, hp: 90,   damage: 12,  fov: 900,  color: '#FF9D43' },
  { name: 'Mole',          ru: 'Крот',            r: 38,  speed: 11, hp: 110,  damage: 15,  fov: 1000, color: '#4C4A45' },
  { name: 'Deer',          ru: 'Олень',           r: 44,  speed: 12, hp: 130,  damage: 18,  fov: 1100, color: '#C4773E' },
  { name: 'Gorilla',       ru: 'Горилла',         r: 52,  speed: 11, hp: 160,  damage: 22,  fov: 1200, color: '#323232' },
  { name: 'Zebra',         ru: 'Зебра',           r: 60,  speed: 13, hp: 190,  damage: 26,  fov: 1300, color: '#FFFFFF' },
  { name: 'Lion',          ru: 'Лев',             r: 70,  speed: 12, hp: 220,  damage: 30,  fov: 1400, color: '#f8c923' },
  { name: 'Cheetah',       ru: 'Гепард',          r: 80,  speed: 15, hp: 250,  damage: 34,  fov: 1500, color: '#CAC05B' },
  { name: 'Bear',          ru: 'Медведь',         r: 95,  speed: 11, hp: 300,  damage: 40,  fov: 1600, color: '#99591C' },
  { name: 'Crocodile',     ru: 'Крокодил',        r: 110, speed: 11, hp: 360,  damage: 46,  fov: 1700, color: '#30F51C' },
  { name: 'Rhino',         ru: 'Носорог',         r: 130, speed: 12, hp: 440,  damage: 54,  fov: 1800, color: '#94a3a9' },
  { name: 'Hippo',         ru: 'Бегемот',         r: 155, speed: 10, hp: 530,  damage: 62,  fov: 1900, color: '#945A99' },
  { name: 'Dragon',        ru: 'Дракон',          r: 200, speed: 9,  hp: 700,  damage: 80,  fov: 2200, color: '#2a7fd9' },
  { name: 'Black Dragon',  ru: 'Чёрный Дракон',   r: 280, speed: 8,  hp: 1000, damage: 110, fov: 2600, color: '#1a1a1a' },
  { name: 'King Dragon',   ru: 'Король Драконов', r: 400, speed: 8,  hp: 1500, damage: 150, fov: 3000, color: '#c0392b' }
];

const XP_THRESHOLDS = [
  0, 10, 25, 50, 100, 200, 400, 700, 1100, 1700,
  2500, 3500, 5000, 7500, 11000, 16000, Infinity
];

// ═══════════════════════════════════════════════════════════
//  УТИЛИТЫ
// ═══════════════════════════════════════════════════════════

function isInVolcano(x, y) {
  return Math.hypot(x - VOLCANO.x, y - VOLCANO.y) < VOLCANO.r;
}
function isInDuckIsland(x, y) {
  return Math.hypot(x - DUCK_ISLAND.x, y - DUCK_ISLAND.y) < DUCK_ISLAND.r;
}
function isInDuckPond(x, y) {
  return Math.hypot(x - DUCK_POND.x, y - DUCK_POND.y) < DUCK_POND.r;
}

function turnTowards(current, target, maxDelta) {
  let diff = target - current;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  if (Math.abs(diff) > maxDelta) {
    diff = Math.sign(diff) * maxDelta;
  }
  return current + diff;
}

function canEat(predator, prey) {
  if (!predator || !prey) return false;
  if (predator.id === prey.id) return false;
  if (prey.isSanta) return false;
  if (predator.dead || prey.dead) return false;
  if (prey.invulnerableUntil && Date.now() < prey.invulnerableUntil) return false;
  if (predator.level === 17) return true;
  if (predator.level === 16) return prey.level <= 15;
  if (predator.level === 15) return prey.level <= 14;
  return prey.level <= predator.level - 2;
}

function canTailBite(biter, victim) {
  if (!biter || !victim) return false;
  if (biter.id === victim.id) return false;
  if (biter.dead || victim.dead) return false;
  if (biter.isSanta || victim.isSanta) return false;
  if (victim.invulnerableUntil && Date.now() < victim.invulnerableUntil) return false;
  if (biter.level < 3) return false;
  if (victim.level < 3) return false;
  return canEat(victim, biter);
}

// ═══════════════════════════════════════════════════════════
//  🔌 ОТПРАВКА
// ═══════════════════════════════════════════════════════════

function sendToPlayer(playerId, data) {
  const pl = players[playerId];
  if (!pl || !pl.ws) return false;
  if (pl.ws.readyState !== WebSocket.OPEN) return false;
  pl.ws.send(JSON.stringify(data));
  return true;
}

function broadcastExcept(excludePlayerId, data) {
  const msg = JSON.stringify(data);
  wss.clients.forEach((c) => {
    if (c.readyState === WebSocket.OPEN && c._playerId !== excludePlayerId) {
      c.send(msg);
    }
  });
}

function broadcast(data) {
  const msg = JSON.stringify(data);
  wss.clients.forEach((c) => {
    if (c.readyState === WebSocket.OPEN) c.send(msg);
  });
}
// ═══════════════════════════════════════════════════════════
//  🌀 ТЕЛЕПОРТ 16-17 НА ВУЛКАН
// ═══════════════════════════════════════════════════════════

function startVolcanoTeleport(p) {
  if (p.level < 16) return;
  const angle = Math.random() * Math.PI * 2;
  const dist = VOLCANO.r * 0.3;
  p.teleporting = true;
  p.teleportToX = VOLCANO.x + Math.cos(angle) * dist;
  p.teleportToY = VOLCANO.y + Math.sin(angle) * dist;
  p.teleportStart = Date.now();
  p.teleportDuration = 1500;
  p.vx = 0;
  p.vy = 0;

  sendToPlayer(p.id, {
    type: 'chat', system: true,
    text: '🌀 Тебя несёт к вулкану...'
  });
}

// ═══════════════════════════════════════════════════════════
//  🌀 ТЕЛЕПОРТ 1-15 В ЛЕС
// ═══════════════════════════════════════════════════════════

function startForestTeleport(p, fromX, fromY) {
  // Границы леса
  const fxMin = WATER_W;
  const fxMax = WORLD.width - WATER_W;
  const fyMin = SNOW_H;
  const fyMax = WORLD.height - SAND_H;
  const fw = fxMax - fxMin;
  const fh = fyMax - fyMin;

  // ─── Если игрок был в вулкане — лес рядом с вулканом ───
  const distToVolcano = Math.hypot(fromX - VOLCANO.x, fromY - VOLCANO.y);
  if (distToVolcano < VOLCANO.r + 200) {
    const angle = Math.atan2(fromY - VOLCANO.y, fromX - VOLCANO.x);
    const dist = VOLCANO.r + 250 + Math.random() * 200;
    let tx = VOLCANO.x + Math.cos(angle) * dist;
    let ty = VOLCANO.y + Math.sin(angle) * dist;
    tx = Math.max(fxMin + 50, Math.min(fxMax - 50, tx));
    ty = Math.max(fyMin + 50, Math.min(fyMax - 50, ty));

    p.teleporting = true;
    p.teleportToX = tx;
    p.teleportToY = ty;
    p.teleportStart = Date.now();
    p.teleportDuration = 1200;
    p.vx = 0;
    p.vy = 0;
    sendToPlayer(p.id, { type: 'chat', system: true, text: '🌀 Тебя несёт в лес рядом с вулканом...' });
    return;
  }

  // ─── Определяем, какой биом был рядом с игроком ───
  // Смотрим, ГДЕ игрок был: в воде / снегу / песке / лесу
  const wasInWater  = fromX < fxMin || fromX > fxMax;
  const wasInSnow   = fromY < fyMin;
  const wasInSand   = fromY > fyMax;

  // Отступ "впритык" от границы — 50 пикселей (чтобы не выйти за лес)
  const EDGE = 80;

  let tx, ty;
  const jitter = 200; // разброс вдоль границы

  if (wasInWater) {
    // Был в воде — прижимаемся к той стороне воды, откуда пришёл
    if (fromX < fxMin) {
      // Левая вода → левая граница леса
      tx = fxMin + EDGE;
      ty = Math.max(fyMin + EDGE, Math.min(fyMax - EDGE, fromY + (Math.random() - 0.5) * jitter));
    } else {
      // Правая вода → правая граница леса
      tx = fxMax - EDGE;
      ty = Math.max(fyMin + EDGE, Math.min(fyMax - EDGE, fromY + (Math.random() - 0.5) * jitter));
    }
  } else if (wasInSnow) {
    // Был в снегу → верхняя граница леса
    ty = fyMin + EDGE;
    tx = Math.max(fxMin + EDGE, Math.min(fxMax - EDGE, fromX + (Math.random() - 0.5) * jitter));
  } else if (wasInSand) {
    // Был в песке → нижняя граница леса
    ty = fyMax - EDGE;
    tx = Math.max(fxMin + EDGE, Math.min(fxMax - EDGE, fromX + (Math.random() - 0.5) * jitter));
  } else {
    // Был в лесу → к ближайшей границе
    const distLeft   = fromX - fxMin;
    const distRight  = fxMax - fromX;
    const distTop    = fromY - fyMin;
    const distBottom = fyMax - fromY;
    const minDist = Math.min(distLeft, distRight, distTop, distBottom);

    if (minDist === distLeft) {
      tx = fxMin + EDGE;
      ty = Math.max(fyMin + EDGE, Math.min(fyMax - EDGE, fromY + (Math.random() - 0.5) * jitter));
    } else if (minDist === distRight) {
      tx = fxMax - EDGE;
      ty = Math.max(fyMin + EDGE, Math.min(fyMax - EDGE, fromY + (Math.random() - 0.5) * jitter));
    } else if (minDist === distTop) {
      ty = fyMin + EDGE;
      tx = Math.max(fxMin + EDGE, Math.min(fxMax - EDGE, fromX + (Math.random() - 0.5) * jitter));
    } else {
      ty = fyMax - EDGE;
      tx = Math.max(fxMin + EDGE, Math.min(fxMax - EDGE, fromX + (Math.random() - 0.5) * jitter));
    }
  }

  p.teleporting = true;
  p.teleportToX = tx;
  p.teleportToY = ty;
  p.teleportStart = Date.now();
  p.teleportDuration = 1200;
  p.vx = 0;
  p.vy = 0;

  sendToPlayer(p.id, {
    type: 'chat', system: true,
    text: '🌀 Тебя несёт к границе леса...'
  });
}
// ═══════════════════════════════════════════════════════════
//  💀 СМЕРТЬ
// ═══════════════════════════════════════════════════════════

function resetCombatState(p) {
  p.dead = true;
  p.hp = 0;
  p.spectating = false;
  p.boostActive = false;
  p.boostHeld = false;
  p.underwater = false;
  p.hidden = false;
  p.inHole = null;
  p.holeState = 'outside';
  p.inArena = false;
  p.digging = false;
  p.digUntil = 0;
  p.digEffectUntil = 0;
  p.draggedBy = null;
  p.dragUntil = 0;
  p.chargeActive = false;
  p.chargeUntil = 0;
  p.speedBoostUntil = 0;
  p.speedBoostMul = 1;
  p.slowedUntil = 0;
  p.stunned = 0;
  p.swingActive = false;
  p.swingTime = 0;
  p.tailActive = false;
  p.tailTime = 0;
  p.flag_tailBitten = false;
  p.vx = 0;
  p.vy = 0;
}

function killPlayer(p, reason) {
  if (!p || p.dead) return;
  resetCombatState(p);

  broadcastExcept(p.id, {
    type: 'chat', system: true,
    text: `💀 ${p.name} ${reason}`
  });

  sendToPlayer(p.id, {
    type: 'you_died',
    reason: reason,
    killerName: null
  });
}

function killPlayerByPlayer(victim, killer, reason) {
  if (!victim || victim.dead) return;
  resetCombatState(victim);

  broadcastExcept(victim.id, {
    type: 'chat', system: true,
    text: `⚔️ ${killer ? killer.name : '???'} ${reason} ${victim.name}`
  });

  sendToPlayer(victim.id, {
    type: 'you_died',
    reason: reason,
    killerName: killer ? killer.name : null
  });

  if (killer && !killer.dead) {
    killer.score += 50;

    sendToPlayer(killer.id, {
      type: 'chat', system: true,
      text: `🎯 Ты ${reason} ${victim.name}! +50 XP`
    });

    if (killer.questProgress) {
      killer.questProgress[victim.level] = true;
    }

    checkLevelUp(killer);
  }
}

// ═══════════════════════════════════════════════════════════
//  🗺️ БИОМЫ — КАК НА РИСУНКЕ
//  ┌──────────────────────┐
//  │        СНЕГ          │   ← верхняя белая полоса
//  ├────┬────────────┬────┤
//  │    │            │    │
//  │ В  │   ЛЕС +    │ В  │   ← синие полосы по бокам
//  │ О  │   ВУЛКАН   │ О  │
//  │ Д  │            │ Д  │
//  │ А  │            │ А  │
//  ├────┴────────────┴────┤
//  │        ПЕСОК         │   ← нижняя оранжевая полоса
//  └──────────────────────┘
// ═══════════════════════════════════════════════════════════

const SNOW_H = 1500;      // высота снега сверху
const SAND_H = 1500;      // высота песка снизу
const WATER_W = 1500;     // ширина воды по бокам

const BIOMES = [
  // ─── ЛЕС — база (центр) ───
  { name: 'forest', x: WATER_W, y: SNOW_H,
    w: WORLD.width - WATER_W * 2, h: WORLD.height - SNOW_H - SAND_H,
    color: '#5dcb10' },

  // ─── ВОДА — слева ───
  { name: 'water', x: 0, y: SNOW_H,
    w: WATER_W, h: WORLD.height - SNOW_H - SAND_H,
    color: '#1e3a5f' },

  // ─── ВОДА — справа ───
  { name: 'water', x: WORLD.width - WATER_W, y: SNOW_H,
    w: WATER_W, h: WORLD.height - SNOW_H - SAND_H,
    color: '#1e3a5f' },

  // ─── СНЕГ — сверху ───
  { name: 'snow', x: 0, y: 0,
    w: WORLD.width, h: SNOW_H,
    color: '#c8d8e8' },

  // ─── ПЕСОК — снизу ───
  { name: 'desert', x: 0, y: WORLD.height - SAND_H,
    w: WORLD.width, h: SAND_H,
    color: '#e8a44c' },
];

function getBiomeAt(x, y) {
  if (isInVolcano(x, y)) return { name: 'volcano', color: '#4a1818' };
  if (isInDuckIsland(x, y)) return { name: 'duck', color: '#2d5a27' };

  let result = BIOMES[0];
  for (const b of BIOMES) {
    if (x >= b.x && x < b.x + b.w && y >= b.y && y < b.y + b.h) {
      result = b;
    }
  }
  return result;
}

// ═══════════════════════════════════════════════════════════
//  ЕДА
// ═══════════════════════════════════════════════════════════

const FOOD_TYPES = [
  { name: 'berry',      color: '#e63946', r: 25, xp: 3,  sprite: 'berry',  emoji: '🍓', biome: 'forest',  bites: 1 },
  { name: 'mushroom',   color: '#d4a373', r: 30, xp: 4,  emoji: '🍄', biome: 'forest',  bites: 2 },
  { name: 'apple',      color: '#ff0000', r: 30, xp: 4,  emoji: '🍎', biome: 'forest',  bites: 2 },
  { name: 'banana',     color: '#ffd60a', r: 32, xp: 5,  sprite: 'banana', emoji: '🍌', biome: 'desert',  bites: 2 },
  { name: 'fish',       color: '#00b4d8', r: 32, xp: 5,  emoji: '🐟', biome: 'water',   bites: 2 },
  { name: 'carrot',     color: '#ff8c00', r: 35, xp: 6,  sprite: 'carrot', emoji: '🥕', biome: 'forest',  bites: 3 },
  { name: 'meat',       color: '#a0522d', r: 38, xp: 8,  sprite: 'meat',   emoji: '🍖', biome: 'snow',    bites: 3 },
  { name: 'cactus',     color: '#2d6a4f', r: 36, xp: 7,  sprite: 'cactus', emoji: '🌵', biome: 'desert',  bites: 3 },
  { name: 'ice',        color: '#a0e0ff', r: 42, xp: 10, emoji: '🧊', biome: 'snow',    bites: 4 },
  { name: 'lava',       color: '#ff4500', r: 45, xp: 12, emoji: '🔥', biome: 'volcano', bites: 4 },
  { name: 'watermelon', color: '#2e7d32', r: 50, xp: 15, emoji: '🍉', biome: 'desert',  bites: 5 }
];

let players = {};
let food = [];
let holes = [];
let fireballs = [];
let crystals = [];
let trees = [];
let nextId = 1;

let arena = {
  active: false,
  x: ARENA.x, y: ARENA.y, r: ARENA.startR,
  startTime: 0,
  playerA: null, playerB: null,
  shrinking: false
};

// ═══════════════════════════════════════════════════════════
//  СПАВН
// ═══════════════════════════════════════════════════════════

function spawnFood() {
  const type = FOOD_TYPES[Math.floor(Math.random() * FOOD_TYPES.length)];
  let x, y, tries = 0;

  do {
    if (type.biome === 'volcano') {
      const a = Math.random() * Math.PI * 2;
      const d = Math.random() * VOLCANO.r;
      x = VOLCANO.x + Math.cos(a) * d;
      y = VOLCANO.y + Math.sin(a) * d;
    } else {
      x = 200 + Math.random() * (WORLD.width - 400);
      y = 200 + Math.random() * (WORLD.height - 400);
    }
    tries++;
  } while (getBiomeAt(x, y).name !== type.biome && tries < 25);

  return {
    id: Math.random().toString(36).slice(2),
    x, y, r: type.r, color: type.color, type: type.name,
    sprite: type.sprite || null,
    emoji: type.emoji, xp: type.xp, biome: type.biome,
    hp: type.bites, maxHp: type.bites, bites: type.bites,
    vx: 0, vy: 0,
    angle: Math.random() * Math.PI * 2
  };
}
for (let i = 0; i < FOOD_COUNT; i++) food.push(spawnFood());

function spawnCrystal() {
  let x, y, tries = 0;
  do {
    x = 200 + Math.random() * (WORLD.width - 400);
    y = 200 + Math.random() * (WORLD.height - 400);
    tries++;
  } while (getBiomeAt(x, y).name !== 'forest' && tries < 25);
  return {
    id: Math.random().toString(36).slice(2),
    x, y, r: 60, hp: 500, maxHp: 500, respawnAt: 0, isMega: false,
    vx: 0, vy: 0
  };
}
for (let i = 0; i < CRYSTAL_COUNT; i++) crystals.push(spawnCrystal());

function spawnHole() {
  let x, y, tries = 0;
  do {
    x = 200 + Math.random() * (WORLD.width - 400);
    y = 200 + Math.random() * (WORLD.height - 400);
    tries++;
  } while (getBiomeAt(x, y).name !== 'forest' && tries < 25);
  return { id: Math.random().toString(36).slice(2), x, y, r: 50 };
}
for (let i = 0; i < HOLE_COUNT; i++) holes.push(spawnHole());

for (let i = 0; i < 150; i++) {
  let bx, by, tries = 0;
  do {
    bx = 200 + Math.random() * (WORLD.width - 400);
    by = 200 + Math.random() * (WORLD.height - 400);
    tries++;
  } while (getBiomeAt(bx, by).name !== 'forest' && tries < 25);
  trees.push({ x: bx, y: by, r: 30 + Math.random() * 20 });
}

// ═══════════════════════════════════════════════════════════
//  ПОДКЛЮЧЕНИЕ ИГРОКА
// ═══════════════════════════════════════════════════════════

wss.on('connection', (ws) => {
  const id = nextId++;
  ws._playerId = id;

  players[id] = {
    id,
    ws,
    name: 'Игрок ' + id,
    x: Math.random() * WORLD.width,
    y: Math.random() * WORLD.height,
    vx: 0, vy: 0, angle: 0, r: 15, color: '#9BA9B9',
    targetX: 0, targetY: 0,
    moveDirX: 0, moveDirY: 0, movePower: 0,
    score: 0, level: 1,
    hp: 30, maxHp: 30, damage: 5,
    water: 100, maxWater: 100,
    air: 100, maxAir: 100,
    lastBoost: 0,
    boostActive: false, boostHeld: false, boostHoldUntil: 0,
    lastSpit: 0,
    isAdmin: false, isSanta: false, santaSpeed: 8,
    chatText: '', chatTime: 0,
    lastFire: 0, lastTail: 0,
    lastFoodBite: 0, lastCrystalBite: 0,
    auraColor: null, auraUntil: 0,
    inHole: null, hidden: false, dead: false,
    underwater: false,
    swingActive: false, swingTime: 0, nextPawSide: 'left',
    tailActive: false, tailTime: 0, nextTailSide: 'left',
    lastTailBite: 0,
    spectating: false,
    inArena: false, arenaPartner: null, arenaInvite: null,
    holeCooldown: 0,
    lastAbility: 0,
    holeState: 'outside',
    inDuckIsland: false,
    pendingEvolution: null,
    questProgress: {},
    digging: false, digUntil: 0, digEffectUntil: 0,
    draggedBy: null, dragUntil: 0,
    chargeActive: false, chargeUntil: 0,
    speedBoostUntil: 0, speedBoostMul: 1,
    slowedUntil: 0,
    stunned: 0,
    tailTurnAt: 0,
    tailTurnTargetId: null,
    isInvisible: false,
    teleporting: false,
    teleportToX: 0,
    teleportToY: 0,
    teleportStart: 0,
    teleportDuration: 1500,
    invulnerableUntil: 0,
    skin: null
  };
  players[id].biome = getBiomeAt(players[id].x, players[id].y).name;

  console.log(`✅ Игрок ${id} подключился`);
  ws.send(JSON.stringify({ type: 'init', id, world: WORLD, isAdmin: players[id].isAdmin }));

  ws.on('message', (msg) => {
    try {
      const data = JSON.parse(msg);
      const p = players[id];
      if (!p) return;

      if (data.type === 'setName') {
        const name = String(data.name || '').slice(0, 16).trim();
        if (name.length > 0) p.name = name;
      }

      if (data.type === 'move') {
        if (data.dirX !== undefined) {
          p.moveDirX = data.dirX || 0;
          p.moveDirY = data.dirY || 0;
          p.movePower = data.power || 0;
        } else {
          p.targetX = data.x;
          p.targetY = data.y;
          p.moveDirX = null;
        }
      }

      if (data.type === 'quest_info') {
        sendToPlayer(id, {
          type: 'quest_info',
          progress: p.questProgress || {},
          level: p.level
        });
      }

      if (data.type === 'dive') {
        if (p.dead || p.isSanta) return;
        if (p.inArena) return;
        if (p.holeState !== 'outside') return;
        if (p.digging) return;
        const biome = getBiomeAt(p.x, p.y);
        if (biome.name === 'water' || biome.name === 'duck') {
          if (p.air > 0) p.underwater = true;
        }
      }
      if (data.type === 'diveRelease') {
        p.underwater = false;
      }

      if (data.type === 'spit') {
        if (p.dead || p.isSanta) return;
        if (p.holeState !== 'outside') return;
        if (p.inArena) return;
        if (p.level > 14) return;
        const now = Date.now();
        if (now - (p.lastSpit || 0) < SPIT_COOLDOWN_MS) return;
        if (p.water < SPIT_WATER_COST) {
          sendToPlayer(id, { type: 'chat', system: true, text: '💧 Мало воды' });
          return;
        }
        p.lastSpit = now;
        const angle = p.angle || 0;

        fireballs.push({
          id: 'water_' + Math.random().toString(36).slice(2),
          x: p.x, y: p.y,
          vx: Math.cos(angle) * SPIT_SPEED,
          vy: Math.sin(angle) * SPIT_SPEED,
          r: 14,
          owner: id,
          damage: 0,
          water: SPIT_WATER_RESTORE,
          life: 40,
          type: 'water',
          state: 'flying',
          puddleUntil: 0
        });

        p.water = Math.max(0, p.water - SPIT_WATER_COST);
      }

      if (data.type === 'ability') {
        if (p.dead || p.isSanta) return;
        if (p.inArena) {
          sendToPlayer(id, { type: 'chat', system: true, text: '🚫 Абилки на арене запрещены!' });
          return;
        }
        const now = Date.now();
        const ability = getAbilityByLevel(p.level);
        if (!ability) return;
        if (now - (p.lastAbility || 0) < ability.cooldown) return;
        p.lastAbility = now;
        const helpers = {
          fireballs,
          holes,
          food,
          killPlayerByPlayer,
          sendToPlayer,
          broadcast
        };
        const result = ability.use(p, players, WORLD, helpers);
        if (result && result.message) {
          sendToPlayer(id, { type: 'chat', system: true, text: result.message });
        }
      }

      if (data.type === 'fire') {
        if (p.hidden || p.dead) return;
        if (p.level < 15) return;
        if (p.inArena) return;
        const now = Date.now();
        if (now - p.lastFire < 1000) return;
        p.lastFire = now;
        let dx = p.moveDirX || 0, dy = p.moveDirY || 0;
        if (Math.hypot(dx, dy) < 0.01) { dx = p.targetX - p.x; dy = p.targetY - p.y; }
        const dist = Math.hypot(dx, dy);
        if (dist > 0.01) {
          const baseAngle = Math.atan2(dy, dx);
          const spread = Math.PI / 12;
          for (let k = -1; k <= 1; k++) {
            const a = baseAngle + k * spread;
            fireballs.push({
              id: Math.random().toString(36).slice(2),
              x: p.x, y: p.y,
              vx: Math.cos(a) * 15, vy: Math.sin(a) * 15,
              r: 20, owner: id,
              damage: 40, life: 40,
              state: 'flying',
              stopAt: now + 500,
              burnUntil: 0,
              burnDamage: 10,
              burnRadius: 60,
              lastBurnDamage: 0,
              type: 'fire'
            });
          }
        }
      }

      if (data.type === 'tail') {
        if (p.level < 17 || p.hidden || p.dead) return;
        if (p.inArena) return;
        const now = Date.now();
        if (now - p.lastTail < 15000) return;
        p.lastTail = now;

        p.tailActive = true;
        p.tailTime = now;
        p.nextTailSide = p.nextTailSide === 'left' ? 'right' : 'left';

        for (const tid of Object.keys(players)) {
          const t = players[tid];
          if (!t || t.id === id || t.hidden || t.dead) continue;
          const d = Math.hypot(t.x - p.x, t.y - p.y);
          if (d < p.r + 1.2) {
            t.hp -= 50;
            const ang = Math.atan2(t.y - p.y, t.x - p.x);
            t.x += Math.cos(ang) * 250;
            t.y += Math.sin(ang) * 250;
            if (t.hp <= 0) {
              killPlayerByPlayer(t, p, 'убил хвостом');
            }
          }
        }
      }

      if (data.type === 'boostStart' || data.type === 'boost') {
        if (p.dead) return;
        if (p.holeState !== 'outside') return;
        if (p.underwater) return;
        if (p.digging) return;
        const now = Date.now();
        if (now - p.lastBoost < BOOST_COOLDOWN_MS) return;
        p.boostHeld = true;
        p.boostHoldUntil = now + BOOST_DURATION_MS;
        p.boostActive = true;
        p.lastBoost = now;
      }
      if (data.type === 'boostStop') {
        p.boostHeld = false;
      }

if (data.type === 'evolution_confirm') {
  if (!p.pendingEvolution) return;
  const { newLevel } = p.pendingEvolution;
  p.pendingEvolution = null;
  p.level = newLevel;
  const a = ANIMALS[newLevel - 1];
  p.r = a.r;
  p.color = a.color;
  p.hp = a.hp;
  p.maxHp = a.hp;
  p.damage = a.damage;
  // 💧 Полная вода + воздух после эволюции
  p.water = p.maxWater;
  p.air = p.maxAir;
  // 🛡️ 3 секунды неуязвимости после эволюции
  p.invulnerableUntil = Date.now() + 3000;

  // 🌀 Если 16-17 — телепорт на вулкан
  if (newLevel >= 16) {
    startVolcanoTeleport(p);
  } else {
    // 🌀 1-15 — телепорт в лес (только если НЕ в лесу)
    const biome = getBiomeAt(p.x, p.y).name;
    if (biome !== 'forest') {
      startForestTeleport(p, p.x, p.y);
    }
  }

  sendToPlayer(id, {
    type: 'evolution_done',
    level: newLevel,
    animalName: a.ru,
    animalIndex: newLevel - 1
  });

  broadcast({ type: 'chat', system: true, text: `✨ ${p.name} стал ${a.ru} (${newLevel} ур.)` });
}

      if (data.type === 'admin_level') {
        if (!p.isAdmin) return;
        if (p.dead || p.isSanta) return;
        const delta = parseInt(data.delta) || 0;
        if (delta === 0) return;
        const currentLvl = p.level || 1;
        let newLvl = currentLvl + delta;
        if (newLvl < 1) newLvl = 1;
        if (newLvl > 17) newLvl = 17;
        if (newLvl === currentLvl) return;
        p.level = newLvl;
        const a = ANIMALS[newLvl - 1];
        p.r = a.r; p.color = a.color;
        p.hp = a.hp; p.maxHp = a.hp; p.damage = a.damage;
        p.score = XP_THRESHOLDS[newLvl - 1] || 0;

        // 🌀 Если 16-17 — телепорт на вулкан
        if (newLvl >= 16) {
          startVolcanoTeleport(p);
        }

        sendToPlayer(id, {
          type: 'evolution',
          level: newLvl, animalName: a.ru, animalIndex: newLvl - 1, oldIndex: currentLvl - 1
        });
      }

      if (data.type === 'spawn') {
        let x, y, biome, tries = 0;
        do {
          x = 200 + Math.random() * (WORLD.width - 400);
          y = 200 + Math.random() * (WORLD.height - 400);
          biome = getBiomeAt(x, y);
          tries++;
        } while (biome.name !== 'forest' && tries < 100);
        p.x = x; p.y = y;
        p.level = 1;
        const animal = ANIMALS[0];
        p.r = animal.r; p.color = animal.color;
        p.hp = animal.hp; p.maxHp = animal.hp; p.damage = animal.damage;
        p.score = 0;
        p.water = p.maxWater;
        p.air = p.maxAir;
        p.dead = false;
        p.spectating = false;
        p.isSanta = false;
        p.hidden = false;
        p.inHole = null;
        p.holeState = 'outside';
        p.vx = 0; p.vy = 0;
        p.boostActive = false;
        p.boostHeld = false;
        p.underwater = false;
        p.inDuckIsland = false;
        p.pendingEvolution = null;
        p.questProgress = {};
        p.inArena = false;
        p.arenaPartner = null;
        p.arenaInvite = null;
        p.digging = false;
        p.digUntil = 0;
        p.digEffectUntil = 0;
        p.draggedBy = null;
        p.dragUntil = 0;
        p.chargeActive = false;
        p.chargeUntil = 0;
        p.speedBoostUntil = 0;
        p.speedBoostMul = 1;
        p.slowedUntil = 0;
        p.stunned = 0;
        p.swingActive = false;
        p.tailActive = false;
        p.flag_tailBitten = false;
        p.tailTurnAt = 0;
        p.tailTurnTargetId = null;
                p.isInvisible = false;
        // 🌀 Плавный спавн — чтобы клиент сгладил рывок
        p.skipInterpolation = true;
        p.skipInterpolationFrames = 2;
      }

      if (data.type === 'spectate') {
        p.spectating = true;
        p.dead = true;
      }

      if (data.type === 'chat') {
        const text = String(data.text || '').slice(0, 80).trim();
        if (text.length === 0) return;

        if (text === '/a ' + ADMIN_PASSWORD) {
          p.isAdmin = true;
          sendToPlayer(id, { type: 'chat', system: true, text: '👑 Ты теперь админ!' });
          return;
        }
        if (text.startsWith('/')) {
          const parts = text.split(' ');
          const cmd = parts[0].toLowerCase();
          if (!p.isAdmin) return;

          if (cmd === '/kill') {
            killPlayer(p, 'убит админом');
          }
          else if (cmd === '/level' && parts.length === 2) {
            const oldLvl = p.level || 1;
            const lvl = Math.max(1, Math.min(ANIMALS.length, parseInt(parts[1]) || 1));
            p.level = lvl;
            const a = ANIMALS[lvl - 1];
            p.r = a.r; p.color = a.color; p.hp = a.hp; p.maxHp = a.hp; p.damage = a.damage;

            // 🌀 Если 16-17 — телепорт на вулкан
            if (lvl >= 16) {
              startVolcanoTeleport(p);
            }

            sendToPlayer(id, {
              type: 'evolution', level: lvl, animalName: a.ru, animalIndex: lvl - 1, oldIndex: oldLvl - 1
            });
          }
          else if (cmd === '/score' && parts.length === 2) {
            p.score = Math.max(0, parseInt(parts[1]) || 0);
          }
          else if (cmd === '/clear') {
            broadcast({ type: 'clear-chat' });
          }
          else if (cmd === '/invis') {
            p.isInvisible = !p.isInvisible;
            sendToPlayer(id, {
              type: 'chat', system: true,
              text: p.isInvisible ? '👻 Невидимость ВКЛ' : '👁️ Невидимость ВЫКЛ'
            });
          }
          else if (cmd === '/skin' && parts.length === 2) {
            const skinName = parts[1].toLowerCase();
            if (skinName === 'lambo') {
              p.skin = 'lambo';
              sendToPlayer(id, { type: 'chat', system: true, text: '🏎️ Скин Lambo ВКЛ' });
            } else if (skinName === 'default' || skinName === 'none' || skinName === 'reset') {
              p.skin = null;
              sendToPlayer(id, { type: 'chat', system: true, text: '✅ Скин сброшен' });
            } else {
              sendToPlayer(id, { type: 'chat', system: true, text: '❌ Неизвестный скин. Доступно: lambo, default' });
            }
          }
          return;
        }
        p.chatText = text;
        p.chatTime = Date.now();
      }

    } catch (e) {
      console.error('Ошибка обработки сообщения:', e);
    }
  });

  ws.on('close', () => {
    if (players[id]) {
      players[id].ws = null;
      delete players[id];
    }
    console.log(`❌ Игрок ${id} отключился`);
  });
});

// ═══════════════════════════════════════════════════════════
//  ИГРОВОЙ ЦИКЛ
// ═══════════════════════════════════════════════════════════

let tickCount = 0;
setInterval(() => {
  try {
    tickCount++;

    for (let i = holes.length - 1; i >= 0; i--) {
      const h = holes[i];
      if (h.temp && h.expiresAt && Date.now() > h.expiresAt) holes.splice(i, 1);
    }

    for (const id in players) {
      const p = players[id];
      if (p.arenaInvite && Date.now() > p.arenaInvite.expiresAt) p.arenaInvite = null;
    }

    if (arena.active) {
      const elapsed = Date.now() - arena.startTime;
      if (elapsed > ARENA.shrinkDelay) {
        arena.shrinking = true;
        arena.r = Math.max(ARENA.minR, arena.r - ARENA.shrinkRate / TICK_RATE);
      }
      const a = players[arena.playerA];
      const b = players[arena.playerB];
      if (!a || !b || a.dead || b.dead) {
        arena.active = false;
      }
    }

    // ═══ ИГРОКИ ═══
    for (const id in players) {
      if (!players[id]) continue;
      const p = players[id];
      if (p.dead) continue;

      const now = Date.now();

      if (p.stunned > 0) {
        p.stunned -= 1 / TICK_RATE;
        if (p.stunned < 0) p.stunned = 0;
      }

      if (p.boostHeld && now > p.boostHoldUntil) {
        p.boostHeld = false;
        p.boostActive = false;
      }
      if (!p.boostHeld) p.boostActive = false;

      if (p.speedBoostUntil && now >= p.speedBoostUntil) {
        p.speedBoostMul = 1;
        p.speedBoostUntil = 0;
      }

      if (p.digging && p.digUntil && now >= p.digUntil) {
        p.digging = false;
        p.hidden = false;
        p.digEffectUntil = 0;
      }

      if (p.chargeActive && now >= p.chargeUntil) {
        p.chargeActive = false;
        p.chargeUntil = 0;
      }

      if (p.swingActive && p.swingTime && now - p.swingTime > 400) {
        p.swingActive = false;
        p.swingTime = 0;
      }

      if (p.tailActive && p.tailTime && now - p.tailTime > 500) {
        p.tailActive = false;
        p.tailTime = 0;
      }

      if (p.flag_tailBitten) p.flag_tailBitten = false;

      if (p.tailTurnAt && now >= p.tailTurnAt) {
        const biter = players[p.tailTurnTargetId];
        if (biter && !p.dead) {
          p.angle = Math.atan2(biter.y - p.y, biter.x - p.x);
          p.skipInterpolation = true;
          p.skipInterpolationFrames = 3;
        }
        p.tailTurnAt = 0;
        p.tailTurnTargetId = null;
      }

      if (p.draggedBy && p.dragUntil && now < p.dragUntil) {
        const croc = players[p.draggedBy];
        if (croc && !croc.dead) {
          const dx = croc.x - p.x;
          const dy = croc.y - p.y;
          const dist = Math.hypot(dx, dy);
          if (dist > 0.1) {
            p.x += (dx / dist) * 8;
            p.y += (dy / dist) * 8;
          }
        } else {
          p.draggedBy = null;
          p.dragUntil = 0;
        }
      } else if (p.draggedBy && p.dragUntil && now >= p.dragUntil) {
        p.draggedBy = null;
        p.dragUntil = 0;
      }

      const inDuckNow = isInDuckIsland(p.x, p.y);
      if (inDuckNow && !p.inDuckIsland) {
        p.inDuckIsland = true;
        broadcast({ type: 'duck_enter' });
      } else if (!inDuckNow && p.inDuckIsland) {
        p.inDuckIsland = false;
      }

      if (!p.inArena && !p.digging) {
        if (p.holeState === 'outside') {
          let nearest = null, nearestDist = Infinity;
          for (const h of holes) {
            const d = Math.hypot(p.x - h.x, p.y - h.y);
            if (d < nearestDist) { nearestDist = d; nearest = h; }
          }
          if (nearest && nearestDist < nearest.r * HOLE_ENTER_RADIUS &&
              p.level < 15 && !p.isSanta &&
              now > (p.holeCooldown || 0)) {
            p.holeState = 'inside';
            p.inHole = nearest.id;
            p.hidden = true;
            p.vx = 0; p.vy = 0;
          }
        } else if (p.holeState === 'inside') {
          const myHole = holes.find(h => h.id === p.inHole);
          if (myHole) {
            const d = Math.hypot(p.x - myHole.x, p.y - myHole.y);
            if (d > myHole.r * HOLE_EXIT_RADIUS) {
              p.holeState = 'outside'; p.inHole = null; p.hidden = false;
              p.holeCooldown = now + HOLE_COOLDOWN_MS;
            }
          } else {
            p.holeState = 'outside'; p.inHole = null; p.hidden = false;
            p.holeCooldown = now + HOLE_COOLDOWN_MS;
          }
        }
      }

      let speedMul = p.holeState === 'inside' ? HOLE_INSIDE_SPEED_MUL : 1;

      if (p.speedBoostUntil && now < p.speedBoostUntil) {
        speedMul *= (p.speedBoostMul || 1);
      }
      if (p.slowedUntil && now < p.slowedUntil) {
        speedMul *= 0.3;
      }
      // 🌀 ТЕЛЕПОРТ (вулкан / лес) — двигаем + поворачиваем вручную
      if (p.teleporting) {
        const elapsed = now - p.teleportStart;
        const progress = Math.min(1, elapsed / p.teleportDuration);
        const ease = 1 - Math.pow(1 - progress, 3);
        p.x = p.x + (p.teleportToX - p.x) * Math.min(1, ease * 1.5);
        p.y = p.y + (p.teleportToY - p.y) * Math.min(1, ease * 1.5);
        p.vx = 0;
        p.vy = 0;

        // 🌀 Ручное движение от мышки (пока телепорт)
        let _tpDx = 0, _tpDy = 0, _tpSpeed = 0;
        if (p.moveDirX !== null && p.moveDirX !== undefined && (p.moveDirX !== 0 || p.moveDirY !== 0)) {
          _tpDx = p.moveDirX;
          _tpDy = p.moveDirY;
          _tpSpeed = 5 * (p.movePower || 1);
        } else {
          _tpDx = p.targetX - p.x;
          _tpDy = p.targetY - p.y;
          const _d = Math.hypot(_tpDx, _tpDy);
          if (_d > 5) { _tpDx /= _d; _tpDy /= _d; _tpSpeed = 5; }
          else { _tpDx = 0; _tpDy = 0; }
        }

        // Поворот
        if (_tpDx !== 0 || _tpDy !== 0) {
          const targetAngle = Math.atan2(_tpDy, _tpDx);
          p.angle = turnTowards(p.angle, targetAngle, MAX_TURN_PER_TICK);
        }

        // Движение — маленькое, чтобы не перебить телепорт
        if (_tpSpeed > 0.1) {
          p.x += _tpDx * _tpSpeed * 0.3;
          p.y += _tpDy * _tpSpeed * 0.3;
        }

        if (progress >= 1) {
          p.teleporting = false;
          p.x = p.teleportToX;
          p.y = p.teleportToY;
          p.skipInterpolation = true;
          p.skipInterpolationFrames = 3;
          sendToPlayer(p.id, {
            type: 'chat', system: true,
            text: p.level >= 16 ? '🔥 Ты прибыл на вулкан!' : '🌲 Ты прибыл в лес!'
          });
        }
        continue;
      }

      let inputDx = 0, inputDy = 0, inputSpeed = 0;

      if (p.moveDirX !== null && p.moveDirX !== undefined && (p.moveDirX !== 0 || p.moveDirY !== 0)) {
        inputDx = p.moveDirX;
        inputDy = p.moveDirY;
        inputSpeed = 5 * (p.movePower || 1);
      } else {
        inputDx = p.targetX - p.x;
        inputDy = p.targetY - p.y;
        const d = Math.hypot(inputDx, inputDy);
        if (d > 5) { inputDx /= d; inputDy /= d; inputSpeed = 5; }
        else { inputDx = 0; inputDy = 0; }
      }

      if (p.stunned > 0) {
        inputDx = 0; inputDy = 0; inputSpeed = 0;
      }

      if (inputSpeed > 0.1) {
        const targetAngle = Math.atan2(inputDy, inputDx);
        p.angle = turnTowards(p.angle, targetAngle, MAX_TURN_PER_TICK);
      }

      const isBoosting = p.boostHeld && now < p.boostHoldUntil;
      const isCharging = p.chargeActive && now < p.chargeUntil;

      if (isCharging) {
        p.vx *= 0.95;
        p.vy *= 0.95;
        p.x += p.vx;
        p.y += p.vy;
      } else if (isBoosting) {
        const boostSpeed = inputSpeed * BOOST_SPEED_MUL;
        p.vx += inputDx * boostSpeed * 0.35;
        p.vy += inputDy * boostSpeed * 0.35;
        p.vx *= 0.90; p.vy *= 0.90;
        p.x += p.vx; p.y += p.vy;
        p.boostActive = true;
      } else {
        p.boostActive = false;
        if (p.isSanta) inputSpeed = p.santaSpeed * 8;
        if (p.underwater && p.holeState === 'outside') inputSpeed *= 0.6;
        inputSpeed *= speedMul;
        p.vx += inputDx * inputSpeed * 0.3;
        p.vy += inputDy * inputSpeed * 0.3;
        p.vx *= 0.85; p.vy *= 0.85;
        p.x += p.vx; p.y += p.vy;
      }

      if (p.inArena && arena.active) {
        const d = Math.hypot(p.x - arena.x, p.y - arena.y);
        if (d > arena.r - p.r * 0.5) {
          const angle = Math.atan2(p.y - arena.y, p.x - arena.x);
          p.x = arena.x + Math.cos(angle) * (arena.r - p.r * 0.5);
          p.y = arena.y + Math.sin(angle) * (arena.r - p.r * 0.5);
          if (arena.shrinking) {
            p.hp -= ARENA_WALL_DAMAGE;
            if (p.hp <= 0) { killPlayer(p, 'сгорел в стене арены'); continue; }
          }
        }
      } else {
        if (p.x < p.r) { p.x = p.r; p.vx = 0; }
        if (p.x > WORLD.width - p.r) { p.x = WORLD.width - p.r; p.vx = 0; }
        if (p.y < p.r) { p.y = p.r; p.vy = 0; }
        if (p.y > WORLD.height - p.r) { p.y = WORLD.height - p.r; p.vy = 0; }
      }

      p.biome = getBiomeAt(p.x, p.y).name;

// 🔥 УРОН ОТ ЛАВЫ (вулкан) — 5% от макс. HP в секунду
// 16-17 (Чёрный Дракон и Король) НЕ получают урон от лавы
const isDragonLava = p.level >= 16;
if (p.biome === 'volcano' && !p.isSanta && !isDragonLava) {
  p.hp -= (p.maxHp * 0.05) / TICK_RATE;
  if (p.hp <= 0) { killPlayer(p, 'сгорел в лаве'); continue; }
}



if (!p.inArena && p.holeState === 'outside' && !p.digging) {
  const isDragon = p.level >= 16;

  let onCrystal = false;
  if (isDragon) {
    for (const c of crystals) {
      if (c.hp <= 0) continue;
      if (Math.hypot(p.x - c.x, p.y - c.y) < p.r + c.r * 1.2) {
        onCrystal = true;
        break;
      }
    }
  }

  if (isDragon) {
    if (p.biome === 'volcano' || onCrystal) {
      p.water = Math.min(p.maxWater, p.water + 0.3);
    } else if (p.biome === 'forest') {
      // В лесу — ×3 от 0.013
      p.water = Math.max(0, p.water - 0.039);
    } else {
      const dist = Math.hypot(p.x - VOLCANO.x, p.y - VOLCANO.y);
      // ← ×3 от прежней формулы
      let drain = (0.02 + (dist / 4000) * 0.15) * 1.3 * 3;
      if (p.biome === 'desert') drain *= 0.6;
      if (p.biome === 'snow')   drain *= 0.7;
      p.water = Math.max(0, p.water - drain);
    }
  } else {
    if (p.biome === 'water' || p.biome === 'duck') {
      if (!p.underwater) p.water = Math.min(p.maxWater, p.water + 0.15);
    } else {
      // ← ×3 к базовым значениям
      let drain = 0.117;   // было 0.039
      if (p.biome === 'desert') drain = 0.078;  // было 0.026
      p.water = Math.max(0, p.water - drain);
    }
  }

  if (p.underwater) {
    p.air = Math.max(0, p.air - 0.3);
    if (p.air <= 0) p.underwater = false;
  } else {
    p.air = Math.min(p.maxAir, p.air + 0.5);
  }

  if (p.water <= 0 && p.biome !== 'water' && p.biome !== 'duck') {
    if (isDragon) {
      // ← было 5% → стало 15% от макс. HP в секунду
      p.hp -= (p.maxHp * 0.15) / TICK_RATE;
      if (p.hp <= 0) { killPlayer(p, 'погиб без лавы'); continue; }
    } else {
      p.hp -= 0.45;   // было 0.15 — ×3
      if (p.hp <= 0) { killPlayer(p, 'погиб от жажды'); continue; }
    }
  }
}


      if (!p.inArena && p.holeState === 'outside') {
        for (const f of food) {
          if (f.hp <= 0) continue;
          if (p.level >= 15) continue;
          const d = Math.hypot(p.x - f.x, p.y - f.y);
          if (d < p.r + f.r * 0.7) {
            if (now - (p.lastFoodBite || 0) < 200) continue;
            p.lastFoodBite = now;
            f.hp--;
            p.score += f.xp;
            if (f.hp <= 0) { f.hp = 0; f.respawnAt = Date.now() + 5000; }
            checkLevelUp(p);
          }
        }
for (const c of crystals) {
  if (c.hp <= 0) continue;
  const d = Math.hypot(p.x - c.x, p.y - c.y);
  if (d < p.r + c.r * 0.7) {
    if (now - (p.lastCrystalBite || 0) < 300) continue;
    p.lastCrystalBite = now;

    // 16-17: НЕ кусают, а ЛЕЧАТСЯ (HP + лава), аура синяя
    if (p.level >= 16) {
      p.hp = Math.min(p.maxHp, p.hp + 5);
      p.water = Math.min(p.maxWater, p.water + 10);
      p.auraColor = 'blue';
      p.auraUntil = now + 500;
      continue;  // не ломают кристалл
    }

    // 1-15: кусают, получают XP + воду + HP
    c.hp -= p.damage;
    p.score += 10;
    p.water = Math.min(p.maxWater, p.water + 8);
    p.hp = Math.min(p.maxHp, p.hp + 3);
    checkLevelUp(p);
    if (c.hp <= 0) c.respawnAt = Date.now() + 15000;
  }
}
      }

      if (!p.inArena && p.holeState === 'outside' && !p.isSanta && p.level >= 3 && !p.digging) {
        for (const tid of Object.keys(players)) {
          const t = players[tid];
          if (!t || t.id === p.id) continue;
          if (t.dead || t.hidden) continue;
          if (t.holeState !== 'outside') continue;
          if (t.isSanta || t.inArena) continue;
          if (!canEat(p, t)) continue;

          const d = Math.hypot(p.x - t.x, p.y - t.y);
          if (d < p.r * 0.9 + t.r * 0.5) {
            const xpGain = Math.max(50, Math.floor(t.score * 0.5) + 50);
            p.score += xpGain;
            p.hp = Math.min(p.maxHp, p.hp + 30);

            sendToPlayer(p.id, {
              type: 'chat', system: true,
              text: `🍖 Ты съел ${t.name}! +${xpGain} XP`
            });

            killPlayerByPlayer(t, p, 'съел');
            checkLevelUp(p);
            break;
          }
        }
      }

      if (!p.isSanta && p.level >= 3 && !p.dead) {
        if (now - (p.lastTailBite || 0) >= TAIL_BITE_COOLDOWN_MS) {
          for (const tid of Object.keys(players)) {
            const t = players[tid];
            if (!t || t.id === p.id) continue;
            if (t.dead || t.hidden) continue;
            if (t.isSanta) continue;
            if (!canTailBite(p, t)) continue;

            const dx = p.x - t.x;
            const dy = p.y - t.y;
            const dist = Math.hypot(dx, dy);
            if (dist > t.r * 1.2) continue;

            const victimAngle = t.angle || 0;
            const angleToBiter = Math.atan2(dy, dx);
            let angleDiff = angleToBiter - victimAngle;
            while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
            while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
            if (Math.abs(angleDiff) < Math.PI / 2) continue;

            p.lastTailBite = now;
            t.hp -= TAIL_BITE_DAMAGE;
            const xpSteal = Math.min(
              TAIL_BITE_XP_FLAT + t.score * TAIL_BITE_XP_PERCENT,
              p.score * 2
            );
            t.score = Math.max(0, t.score - xpSteal);
            p.score += xpSteal;

            t.flag_tailBitten = true;

            t.tailTurnAt = now + TAIL_BITE_TURN_DELAY_MS;
            t.tailTurnTargetId = p.id;

            sendToPlayer(p.id, {
              type: 'chat', system: true,
              text: `🦷 Ты укусил хвост ${t.name}! +${Math.round(xpSteal)} XP`
            });

            if (t.hp <= 0) killPlayerByPlayer(t, p, 'закусал хвост');
            break;
          }
        }
      }

      if (p.hp <= 0) { killPlayer(p, 'погиб'); continue; }
    }

    for (let i = 0; i < food.length; i++) {
      if (food[i].hp <= 0 && food[i].respawnAt && Date.now() > food[i].respawnAt) {
        food[i] = spawnFood();
      }
    }
for (let i = 0; i < crystals.length; i++) {
  const c = crystals[i];
  if (c.hp <= 0 && c.respawnAt && Date.now() > c.respawnAt) {
    crystals[i] = spawnCrystal();
  } else if (c.hp > 0 && c.hp < c.maxHp) {
    // 💙 Медленное восстановление (1 HP в секунду)
    c.hp = Math.min(c.maxHp, c.hp + 1 / TICK_RATE);
  }
}

    // СНАРЯДЫ
    for (let i = fireballs.length - 1; i >= 0; i--) {
      const fb = fireballs[i];
      const tnow = Date.now();

      // ── ВОДА ──
      if (fb.type === 'water') {

        // ─── ФАЗА 1: ЛЕТИТ ───
        if (fb.state === 'flying' || !fb.state) {
          fb.x += fb.vx;
          fb.y += fb.vy;
          fb.vx *= 0.98;
          fb.vy *= 0.98;
          fb.life--;

          // Останавливаемся — превращаемся в лужу
          if (fb.life <= 0 || (Math.abs(fb.vx) < 0.5 && Math.abs(fb.vy) < 0.5)) {
            fb.state = 'puddle';
            fb.vx = 0; fb.vy = 0;
            fb.puddleUntil = Date.now() + SPIT_PUDDLE_LIFETIME_MS;
            continue;
          }

          // Попадание в игрока → лужа + эффект
          for (const id in players) {
            const p2 = players[id];
            if (p2.dead || id == fb.owner) continue;
            if (p2.inArena) continue;
            if (Math.hypot(p2.x - fb.x, p2.y - fb.y) < p2.r + fb.r) {
              // 1-15 — получают воду, 16-17 — нет
              if (p2.level < 16) {
                p2.water = Math.min(p2.maxWater, p2.water + (fb.water || SPIT_WATER_RESTORE));
              }
              // Снаряд превращается в лужу
              fb.state = 'puddle';
              fb.vx = 0; fb.vy = 0;
              fb.puddleUntil = Date.now() + SPIT_PUDDLE_LIFETIME_MS;
              break;
            }
          }
          continue;
        }

        // ─── ФАЗА 2: ЛУЖА ЛЕЖИТ ───
        if (fb.state === 'puddle') {
          // Истекла — удаляем
          if (Date.now() >= fb.puddleUntil) {
            fireballs.splice(i, 1);
            continue;
          }

          // 1-15 наступают → подбирают
          for (const id in players) {
            const p2 = players[id];
            if (p2.dead) continue;
            if (p2.level >= 16) continue; // 16-17 НЕ подбирают
            if (p2.inArena) continue;
            if (p2.water >= p2.maxWater) continue; // полная шкала — не подбирает

            if (Math.hypot(p2.x - fb.x, p2.y - fb.y) < p2.r + fb.r) {
              p2.water = Math.min(p2.maxWater, p2.water + (fb.water || SPIT_WATER_RESTORE));
              fireballs.splice(i, 1);
              break;
            }
          }
          continue;
        }
      }

      // ── БАНАН ──
      if (fb.type === 'banana') {
        fb.x += fb.vx;
        fb.y += fb.vy;
        fb.vx *= 0.98;
        fb.vy *= 0.98;
        fb.life--;
        if (fb.life <= 0) { fireballs.splice(i, 1); continue; }

        for (const id in players) {
          const p2 = players[id];
          if (p2.dead || id == fb.owner || p2.inArena) continue;
          if (Math.hypot(p2.x - fb.x, p2.y - fb.y) < p2.r + fb.r) {
            p2.hp -= fb.damage || 15;
            p2.stunned = fb.stunDuration || 1.5;
            if (p2.hp <= 0) {
              const killer = players[fb.owner];
              killPlayerByPlayer(p2, killer, 'убит бананом');
            }
            fireballs.splice(i, 1);
            break;
          }
        }
        continue;
      }

      // ── МЕТЕОРИТ ──
      if (fb.type === 'meteor') {
        if (fb.state === 'falling') {
          if (tnow >= fb.impactAt) {
            fb.state = 'burning';
            fb.burnUntil = tnow + 5000;
            broadcast({
              type: 'chat', system: true,
              text: `☄️ МЕТЕОРИТ УПАЛ!`
            });
          }
          continue;
        } else if (fb.state === 'burning') {
          if (tnow >= fb.burnUntil) { fireballs.splice(i, 1); continue; }
          if (tnow - fb.lastBurnDamage > 500) {
            fb.lastBurnDamage = tnow;
            for (const pid in players) {
              const p2 = players[pid];
              if (p2.dead || pid == fb.owner || p2.inArena) continue;
              const d = Math.hypot(p2.x - fb.x, p2.y - fb.y);
              if (d < fb.burnRadius) {
                p2.hp -= fb.burnDamage;
                if (p2.hp <= 0) {
                  const killer = players[fb.owner];
                  killPlayerByPlayer(p2, killer, 'сгорел от метеорита');
                }
              }
            }
          }
          continue;
        }
      }

      // ── ОГОНЬ ──
      if (fb.state === 'flying') {
        fb.x += fb.vx;
        fb.y += fb.vy;
        fb.life--;
        if (tnow >= fb.stopAt || fb.life <= 0) {
          fb.state = 'burning';
          fb.vx = 0; fb.vy = 0;
          fb.burnUntil = tnow + 4000;
        }
        for (const id in players) {
          const p2 = players[id];
          if (p2.dead || id == fb.owner || p2.inArena) continue;
          if (p2.invulnerableUntil && Date.now() < p2.invulnerableUntil) continue;
          if (Math.hypot(p2.x - fb.x, p2.y - fb.y) < p2.r + fb.r) {
            p2.hp -= fb.damage;
            if (p2.hp <= 0) {
              const killer = players[fb.owner];
              killPlayerByPlayer(p2, killer, 'сжёг');
            }
            fb.state = 'burning';
            fb.vx = 0; fb.vy = 0;
            fb.burnUntil = tnow + 4000;
            break;
          }
        }
      } else if (fb.state === 'burning') {
        if (tnow >= fb.burnUntil) { fireballs.splice(i, 1); continue; }
        if (tnow - fb.lastBurnDamage > 500) {
          fb.lastBurnDamage = tnow;
          for (const id in players) {
            const p2 = players[id];
            if (p2.dead || id == fb.owner || p2.inArena) continue;
            const d = Math.hypot(p2.x - fb.x, p2.y - fb.y);
            if (d < fb.burnRadius) {
              p2.hp -= fb.burnDamage;
              if (p2.hp <= 0) {
                const killer = players[fb.owner];
                killPlayerByPlayer(p2, killer, 'сжёг');
              }
            }
          }
        }
        fb.r *= 0.998;
      }
    }

    // ═══ СОСТОЯНИЕ ═══
    const fastState = {
      type: 'state_fast',
      players: {},
      fireballs: fireballs.map(f => ({
        id: f.id, x: f.x, y: f.y, r: f.r,
        type: f.type || null,
        state: f.state || null,
        burnRadius: f.burnRadius || 0,
        burnUntil: f.burnUntil || 0,
        impactAt: f.impactAt || 0,
        puddleUntil: f.puddleUntil || 0
      })),
      arena: arena.active ? {
        x: arena.x, y: arena.y, r: arena.r,
        shrinking: arena.shrinking,
        a: arena.playerA, b: arena.playerB
      } : null
    };

    for (const id in players) {
      const p = players[id];
      fastState.players[id] = {
        id: p.id, name: p.name,
        x: p.x, y: p.y, angle: p.angle, r: p.r,
        color: p.color, level: p.level,
        score: p.score, hp: p.hp, maxHp: p.maxHp,
        water: p.water, maxWater: p.maxWater,
        air: p.air, maxAir: p.maxAir,
        dead: p.dead, hidden: p.hidden,
        underwater: p.underwater,
        isAdmin: p.isAdmin, isSanta: p.isSanta,
        isInvisible: p.isInvisible,
        chatText: p.chatText, chatTime: p.chatTime,
        holeState: p.holeState,
        boostActive: p.boostActive,
        auraColor: p.auraColor, auraUntil: p.auraUntil,
        swingActive: p.swingActive, swingTime: p.swingTime,
        nextPawSide: p.nextPawSide,
        tailActive: p.tailActive, tailTime: p.tailTime,
        nextTailSide: p.nextTailSide,
        flag_tailBitten: p.flag_tailBitten,
        digging: p.digging, digEffectUntil: p.digEffectUntil,
        inArena: p.inArena, arenaPartner: p.arenaPartner,
        lastAbility: p.lastAbility,
        lastBoost: p.lastBoost,
        lastFire: p.lastFire,
        lastTailBite: p.lastTailBite,
        stunned: p.stunned || 0,
        invulnerableUntil: p.invulnerableUntil || 0,
        skin: p.skin || null,
        skipInterpolation: p.skipInterpolation || false,
        skipInterpolationFrames: p.skipInterpolationFrames || 0
      };
      p.skipInterpolation = false;
      p.skipInterpolationFrames = 0;
    }

    wss.clients.forEach((c) => {
      if (c.readyState !== WebSocket.OPEN) return;
      const clientPlayerId = c._playerId;
      const me = players[clientPlayerId];

      if (!me) {
        c.send(JSON.stringify(fastState));
        return;
      }

      const enriched = {};
      for (const pid in fastState.players) {
        const copy = Object.assign({}, fastState.players[pid]);
        const other = players[pid];
        copy.preyOf = false;
        copy.predatorOf = false;
        copy.tailBitable = false;
        if (other && !other.dead && parseInt(pid) !== clientPlayerId) {
          if (canEat(me, other)) copy.preyOf = true;
          if (canEat(other, me)) copy.predatorOf = true;
          if (canTailBite(me, other)) copy.tailBitable = true;
        }
        enriched[pid] = copy;
      }
      c.send(JSON.stringify(Object.assign({}, fastState, { players: enriched })));
    });

    if (tickCount % 6 === 0) {
      broadcast({
        type: 'state_slow',
        food: food.filter(f => f.hp > 0).map(f => ({
          id: f.id, x: f.x, y: f.y, r: f.r, color: f.color, type: f.type,
          sprite: f.sprite, emoji: f.emoji, xp: f.xp,
          hp: f.hp, maxHp: f.maxHp,
          angle: f.angle || 0
        })),
        holes,
        biomes: BIOMES,
        crystals: crystals.filter(c => c.hp > 0),
        trees,
        volcano: VOLCANO,
        duckIsland: DUCK_ISLAND,
        duckPond: DUCK_POND
      });
    }
  } catch (e) {
    console.error('❌ Ошибка в тике:', e);
  }
}, 1000 / TICK_RATE);

// ═══════════════════════════════════════════════════════════
//  ПРОВЕРКА УРОВНЯ
// ═══════════════════════════════════════════════════════════

function checkLevelUp(p) {
  if (p.isSanta) return;
  if (p.pendingEvolution) return;
  if (p.inArena) return;
  if (p.level >= 17) return;

  const nextXP = XP_THRESHOLDS[p.level];
  if (p.score >= nextXP) {
    const oldLvl = p.level;
    const newLvl = p.level + 1;

    p.pendingEvolution = { oldLevel: oldLvl, newLevel: newLvl };

    sendToPlayer(p.id, {
      type: 'evolution',
      level: newLvl,
      animalName: ANIMALS[newLvl - 1].ru,
      animalIndex: newLvl - 1,
      oldIndex: oldLvl - 1,
      pending: true
    });

    broadcast({ type: 'chat', system: true, text: `⬆️ ${p.name} готов эволюционировать!` });
  }
}

const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`🎮 Сервер запущен на порту ${PORT}`);
  console.log(`🌐 Открой: http://localhost:${PORT}`);
});