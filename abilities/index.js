// ═══════════════════════════════════════════════════════════
//  abilities/index.js — ВСЕ СПОСОБНОСТИ 17 ЖИВОТНЫХ В ОДНОМ ФАЙЛЕ
//  1 mouse, 2 rabbit, 3 pig, 4 fox, 5 mole, 6 deer,
//  7 gorilla, 8 zebra, 9 lion, 10 cheetah, 11 bear,
//  12 croc, 13 rhino, 14 hippo, 15 dragon, 16 blackdragon, 17 kingdragon
// ═══════════════════════════════════════════════════════════

// ─────────────────────────────────────────────
//  УРОВЕНЬ 1 — Мышь (Dive)
// ─────────────────────────────────────────────
const mouse = {
  name: 'Dive',
  cooldown: 2000,
  use(p, players, WORLD, helpers) {
    if (p.inArena) return { message: '🚫 На арене нельзя' };
    if (p.holeState !== 'outside') return { message: '🐭 Только снаружи' };
    if (p.underwater) return { message: '🐭 Уже нырнул' };
    if (p.air <= 0) return { message: '💨 Нет воздуха' };
    if (p.biome !== 'water' && p.biome !== 'duck') {
      return { message: '💧 Нужна вода' };
    }
    p.underwater = true;
    return { message: '🐭 Нырнул!' };
  }
};

// ─────────────────────────────────────────────
//  УРОВЕНЬ 2 — Кролик (Burrow Hole)
// ─────────────────────────────────────────────
const rabbit = {
  name: 'Burrow Hole',
  cooldown: 4000,
  use(p, players, WORLD, helpers) {
    if (p.inArena) return { message: '🚫 На арене нельзя' };
    if (!helpers || !Array.isArray(helpers.holes)) return { message: '❌ Ошибка' };

    const VOLCANO = { x: 4000, y: 3600, r: 1000 };
    if (Math.hypot(p.x - VOLCANO.x, p.y - VOLCANO.y) < VOLCANO.r) {
      return { message: '🔥 В вулкане нельзя' };
    }

    const angle = p.angle || 0;
    const dist = 90 + Math.random() * 40;
    let x = p.x + Math.cos(angle) * dist;
    let y = p.y + Math.sin(angle) * dist;
    x = Math.max(80, Math.min(WORLD.width - 80, x));
    y = Math.max(80, Math.min(WORLD.height - 80, y));

    for (const h of helpers.holes) {
      if (Math.hypot(h.x - x, h.y - y) < h.r + 40) {
        return { message: '🕳️ Слишком близко' };
      }
    }

    helpers.holes.push({
      id: 'rabbit_' + Math.random().toString(36).slice(2),
      x, y, r: 50, temp: true,
      expiresAt: Date.now() + 20000,
      ownerId: p.id
    });

    p.vx += Math.cos(angle) * 15;
    p.vy += Math.sin(angle) * 15;
    p.skipInterpolation = true;
    p.skipInterpolationFrames = 3;

    return { message: '🐰 Нора выкопана (20 сек)' };
  }
};

// ─────────────────────────────────────────────
//  УРОВЕНЬ 3 — Свинья (Fart)
// ─────────────────────────────────────────────
const pig = {
  name: 'Fart',
  cooldown: 6000,
  use(p, players, WORLD, helpers) {
    if (p.inArena) return { message: '🚫 На арене нельзя' };
    if (p.holeState !== 'outside') return { message: '🐷 Только снаружи' };

    const radius = p.r * 4;
    const damage = Math.max(5, Math.round((p.damage || 8) * 0.5));
    const slowUntil = Date.now() + 2000;

    let hitCount = 0;

    for (const tid of Object.keys(players)) {
      const t = players[tid];
      if (!t || t.id === p.id) continue;
      if (t.dead || t.hidden) continue;
      if (t.holeState !== 'outside') continue;
      if (t.isSanta) continue;

      const d = Math.hypot(t.x - p.x, t.y - p.y);
      if (d > radius) continue;

      t.hp -= damage;
      t.stunned = 1;
      t.slowedUntil = slowUntil;

      hitCount++;

      if (t.hp <= 0 && helpers && typeof helpers.killPlayerByPlayer === 'function') {
        helpers.killPlayerByPlayer(t, p, 'задохнулся от пука');
      }
    }

    p.auraColor = 'green';
    p.auraUntil = Date.now() + 800;

    if (hitCount === 0) return { message: '🐷 Пук! (никого)' };
    return { message: `🐷 Пук! Задето: ${hitCount}` };
  }
};

// ─────────────────────────────────────────────
//  УРОВЕНЬ 4 — Лиса (Pull from Hole)
// ─────────────────────────────────────────────
const fox = {
  name: 'Pull from Hole',
  cooldown: 3000,
  use(p, players, WORLD, helpers) {
    if (p.inArena) return { message: '🚫 На арене нельзя' };

    if (p.holeState !== 'inside' || !p.inHole) {
      return { message: '🦊 Только изнутри норы!' };
    }

    if (!helpers || !Array.isArray(helpers.holes)) {
      return { message: '❌ Ошибка' };
    }

    const myHole = helpers.holes.find(h => h.id === p.inHole);
    if (!myHole) return { message: '❌ Нора не найдена' };

    const victims = [];
    for (const tid of Object.keys(players)) {
      const t = players[tid];
      if (!t || t.id === p.id) continue;
      if (t.dead || t.hidden) continue;
      if (t.holeState !== 'inside') continue;
      if (t.inHole !== myHole.id) continue;
      if (t.isSanta) continue;
      victims.push(t);
    }

    if (victims.length === 0) {
      return { message: '🦊 В норе никого нет' };
    }

    for (const t of victims) {
      const a = Math.random() * Math.PI * 2;
      const d = myHole.r * 2.5;

      t.x = Math.max(50, Math.min(WORLD.width - 50, myHole.x + Math.cos(a) * d));
      t.y = Math.max(50, Math.min(WORLD.height - 50, myHole.y + Math.sin(a) * d));

      t.holeState = 'outside';
      t.inHole = null;
      t.hidden = false;
      t.holeCooldown = Date.now() + 1500;

      t.hp -= 15;
      t.stunned = 1;
      t.vx = Math.cos(a) * 40;
      t.vy = Math.sin(a) * 40;
      t.skipInterpolation = true;
      t.skipInterpolationFrames = 5;

      if (helpers && typeof helpers.sendToPlayer === 'function') {
        helpers.sendToPlayer(t.id, {
          type: 'chat', system: true,
          text: `🦊 Лиса ${p.name} вытянула тебя из норы!`
        });
      }

      if (t.hp <= 0 && helpers && typeof helpers.killPlayerByPlayer === 'function') {
        helpers.killPlayerByPlayer(t, p, 'вытянул из норы и убил');
      }
    }

    return { message: `🦊 Вытянуто из норы: ${victims.length}` };
  }
};

// ─────────────────────────────────────────────
//  УРОВЕНЬ 5 — Крот (Dig)
// ─────────────────────────────────────────────
const mole = {
  name: 'Dig',
  cooldown: 6000,
  use(p, players, WORLD, helpers) {
    if (p.inArena) return { message: '🚫 На арене нельзя' };
    if (p.holeState !== 'outside') return { message: '🦫 Только снаружи' };

    const now = Date.now();
    p.digging = true;
    p.digUntil = now + 3000;
    p.hidden = true;
    p.skipInterpolation = true;
    p.skipInterpolationFrames = 5;
    p.digEffectUntil = now + 3000;

    return { message: '🦫 Крот закопался на 3 сек!' };
  }
};

// ─────────────────────────────────────────────
//  УРОВЕНЬ 6 — Олень (Dig Food)
// ─────────────────────────────────────────────
const deer = {
  name: 'Dig Food',
  cooldown: 5000,
  use(p, players, WORLD, helpers) {
    if (p.inArena) return { message: '🚫 На арене нельзя' };
    if (p.holeState !== 'outside') return { message: '🦌 Только снаружи' };

    const VOLCANO = { x: 4000, y: 3600, r: 1000 };
    if (Math.hypot(p.x - VOLCANO.x, p.y - VOLCANO.y) < VOLCANO.r) {
      return { message: '🔥 В вулкане нельзя' };
    }

    if (!helpers || !Array.isArray(helpers.food)) {
      return { message: '❌ Ошибка: food недоступно' };
    }

    const foods = [
      { type: 'mushroom', emoji: '🍄', color: '#d4a373', xp: 4, bites: 2 },
      { type: 'carrot',   emoji: '🥕', color: '#ff8c00', xp: 6, bites: 3 },
      { type: 'berry',    emoji: '🍓', color: '#e63946', xp: 3, bites: 1 }
    ];
    const chosen = foods[Math.floor(Math.random() * foods.length)];

    const angle = p.angle || 0;
    const dist = 40 + Math.random() * 30;
    const fx = p.x + Math.cos(angle) * dist;
    const fy = p.y + Math.sin(angle) * dist;

    helpers.food.push({
      id: 'deer_' + Math.random().toString(36).slice(2),
      x: fx, y: fy,
      r: 30,
      color: chosen.color,
      type: chosen.type,
      sprite: null,
      emoji: chosen.emoji,
      xp: chosen.xp,
      biome: 'forest',
      hp: chosen.bites,
      maxHp: chosen.bites,
      bites: chosen.bites,
      vx: 0, vy: 0,
      angle: Math.random() * Math.PI * 2
    });

    return { message: `🦌 Ты выкопал ${chosen.emoji}!` };
  }
};

// ─────────────────────────────────────────────
//  УРОВЕНЬ 7 — Горилла (Throw Banana)
// ─────────────────────────────────────────────
const gorilla = {
  name: 'Throw Banana',
  cooldown: 3000,
  use(p, players, WORLD, helpers) {
    if (p.inArena) return { message: '🚫 На арене нельзя' };
    if (p.holeState !== 'outside') return { message: '🦍 Только снаружи' };

    if (!helpers || !Array.isArray(helpers.fireballs)) {
      return { message: '❌ Ошибка' };
    }

    const angle = p.angle || 0;

    helpers.fireballs.push({
      id: 'banana_' + Math.random().toString(36).slice(2),
      x: p.x, y: p.y,
      vx: Math.cos(angle) * 12,
      vy: Math.sin(angle) * 12,
      r: 18,
      owner: p.id,
      damage: 15,
      stunDuration: 1.5,
      life: 60,
      type: 'banana'
    });

    return { message: '🍌 Банан брошен!' };
  }
};

// ─────────────────────────────────────────────
//  УРОВЕНЬ 8 — Зебра (Kick)
// ─────────────────────────────────────────────
const zebra = {
  name: 'Kick',
  cooldown: 4000,
  use(p, players, WORLD, helpers) {
    if (p.inArena) return { message: '🚫 На арене нельзя' };
    if (p.holeState !== 'outside') return { message: '🦓 Только снаружи' };

    const now = Date.now();
    const backAngle = (p.angle || 0) + Math.PI;
    const reach = p.r * 2.5;
    const halfArc = Math.PI / 3;

    p.swingActive = true;
    p.swingTime = now;
    p.nextPawSide = p.nextPawSide === 'left' ? 'right' : 'left';

    const damage = Math.max(20, Math.round((p.damage || 12) * 1.5));
    let hitCount = 0;

    for (const tid of Object.keys(players)) {
      const t = players[tid];
      if (!t || t.id === p.id) continue;
      if (t.dead || t.hidden) continue;
      if (t.holeState !== 'outside') continue;
      if (t.isSanta) continue;

      const dx = t.x - p.x;
      const dy = t.y - p.y;
      const dist = Math.hypot(dx, dy);
      if (dist > reach) continue;

      const targetAngle = Math.atan2(dy, dx);
      let angleDiff = targetAngle - backAngle;
      while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
      while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
      if (Math.abs(angleDiff) > halfArc) continue;

      t.hp -= damage;
      t.stunned = 1.5;

      const knockAngle = Math.atan2(dy, dx);
      const knockPower = 80;
      t.vx += Math.cos(knockAngle) * knockPower;
      t.vy += Math.sin(knockAngle) * knockPower;
      t.skipInterpolation = true;
      t.skipInterpolationFrames = 3;

      hitCount++;

      if (helpers && typeof helpers.sendToPlayer === 'function') {
        helpers.sendToPlayer(t.id, {
          type: 'chat', system: true,
          text: `🦓 Зебра ${p.name} пнула тебя! -${damage} HP`
        });
      }

      if (t.hp <= 0 && helpers && typeof helpers.killPlayerByPlayer === 'function') {
        helpers.killPlayerByPlayer(t, p, 'залягал копытами');
      }
    }

    if (hitCount === 0) return { message: '🦓 Промахнулась' };
    return { message: `🦓 Удар копытами! Задето: ${hitCount}` };
  }
};

// ─────────────────────────────────────────────
//  УРОВЕНЬ 9 — Лев (Roar)
// ─────────────────────────────────────────────
const lion = {
  name: 'Roar',
  cooldown: 8000,
  use(p, players, WORLD, helpers) {
    if (p.inArena) return { message: '🚫 На арене нельзя' };
    if (p.holeState !== 'outside') return { message: '🦁 Только снаружи' };

    const now = Date.now();
    const radius = p.r * 5;

    p.auraColor = 'orange';
    p.auraUntil = now + 800;

    if (helpers && typeof helpers.sendToPlayer === 'function') {
      helpers.sendToPlayer(p.id, {
        type: 'chat', system: true,
        text: `🦁 ${p.name}: RAAAWR!`
      });
    }

    let hitCount = 0;

    for (const tid of Object.keys(players)) {
      const t = players[tid];
      if (!t || t.id === p.id) continue;
      if (t.dead || t.hidden) continue;
      if (t.holeState !== 'outside') continue;
      if (t.isSanta) continue;

      const dx = t.x - p.x;
      const dy = t.y - p.y;
      const dist = Math.hypot(dx, dy);
      if (dist > radius) continue;

      t.stunned = 1.5;

      const isPrey = t.level < p.level;
      if (isPrey) {
        const damage = Math.max(10, Math.round((p.damage || 25) * 0.5));
        t.hp -= damage;

        if (t.hp <= 0 && helpers && typeof helpers.killPlayerByPlayer === 'function') {
          helpers.killPlayerByPlayer(t, p, 'убит рыком');
        }
      }

      const knockAngle = dist < 1 ? Math.random() * Math.PI * 2 : Math.atan2(dy, dx);
      const knockPower = 60 * (1 - dist / radius + 0.3);
      t.vx += Math.cos(knockAngle) * knockPower;
      t.vy += Math.sin(knockAngle) * knockPower;
      t.skipInterpolation = true;
      t.skipInterpolationFrames = 3;

      hitCount++;

      if (helpers && typeof helpers.sendToPlayer === 'function') {
        helpers.sendToPlayer(t.id, {
          type: 'chat', system: true,
          text: `😱 Лев ${p.name} зарычал на тебя!`
        });
      }
    }

    if (hitCount === 0) return { message: '🦁 RAAAWR! (никого)' };
    return { message: `🦁 RAAAWR! Застанено: ${hitCount}` };
  }
};

// ─────────────────────────────────────────────
//  УРОВЕНЬ 10 — Гепард (Speed Boost)
// ─────────────────────────────────────────────
const cheetah = {
  name: 'Speed Boost',
  cooldown: 8000,
  use(p, players, WORLD, helpers) {
    if (p.inArena) return { message: '🚫 На арене нельзя' };
    if (p.holeState !== 'outside') return { message: '🐆 Только снаружи' };

    const now = Date.now();
    const duration = 5000;

    p.boostHeld = true;
    p.boostHoldUntil = now + duration;
    p.boostActive = true;
    p.lastBoost = now;

    p.speedBoostUntil = now + duration;
    p.speedBoostMul = 1.8;

    p.auraColor = 'orange';
    p.auraUntil = now + duration;

    return { message: '🐆 Ускорение на 5 сек!' };
  }
};

// ─────────────────────────────────────────────
//  УРОВЕНЬ 11 — Медведь (Claw Slash)
// ─────────────────────────────────────────────
const bear = {
  name: 'Claw Slash',
  cooldown: 3000,
  use(p, players, WORLD, helpers) {
    if (p.inArena) return { message: '🚫 На арене нельзя' };
    if (p.holeState !== 'outside') return { message: '🐻 Только снаружи' };

    const now = Date.now();
    const angle = p.angle || 0;
    const reach = p.r * 3.5;
    const halfArc = (70 * Math.PI) / 180;

    p.swingActive = true;
    p.swingTime = now;
    p.nextPawSide = p.nextPawSide === 'left' ? 'right' : 'left';

    const baseDamage = Math.max(25, Math.round((p.damage || 25) * 1.5));

    let hitCount = 0;

    for (const tid of Object.keys(players)) {
      const t = players[tid];
      if (!t || t.id === p.id) continue;
      if (t.dead || t.hidden) continue;
      if (t.holeState !== 'outside') continue;
      if (t.isSanta) continue;

      const dx = t.x - p.x;
      const dy = t.y - p.y;
      const dist = Math.hypot(dx, dy);
      if (dist > reach) continue;

      const targetAngle = Math.atan2(dy, dx);
      let angleDiff = targetAngle - angle;
      while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
      while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
      if (Math.abs(angleDiff) > halfArc) continue;

      t.hp -= baseDamage;
      t.stunned = 1;

      const knockAngle = Math.atan2(dy, dx);
      const knockPower = 55;
      t.vx += Math.cos(knockAngle) * knockPower;
      t.vy += Math.sin(knockAngle) * knockPower;
      t.skipInterpolation = true;
      t.skipInterpolationFrames = 3;

      p.auraColor = 'orange';
      p.auraUntil = now + 300;

      hitCount++;

      if (helpers && typeof helpers.sendToPlayer === 'function') {
        helpers.sendToPlayer(t.id, {
          type: 'chat', system: true,
          text: `🐻 ${p.name} ударил тебя лапой! -${baseDamage} HP`
        });
      }

      if (t.hp <= 0 && helpers && typeof helpers.killPlayerByPlayer === 'function') {
        helpers.killPlayerByPlayer(t, p, 'раздавил лапой');
      }
    }

    if (hitCount === 0) return { message: '🐻 Промахнулся' };
    return { message: `🐻 Удар лапой! Задето: ${hitCount}` };
  }
};

// ─────────────────────────────────────────────
//  УРОВЕНЬ 12 — Крокодил (Bite Drag)
// ─────────────────────────────────────────────
const croc = {
  name: 'Bite Drag',
  cooldown: 5000,
  use(p, players, WORLD, helpers) {
    if (p.inArena) return { message: '🚫 На арене нельзя' };
    if (p.holeState !== 'outside') return { message: '🐊 Только снаружи' };

    const now = Date.now();
    const angle = p.angle || 0;
    const reach = p.r * 2.5;
    const halfArc = Math.PI / 3;

    p.swingActive = true;
    p.swingTime = now;
    p.nextPawSide = p.nextPawSide === 'left' ? 'right' : 'left';

    let victim = null;

    for (const tid of Object.keys(players)) {
      const t = players[tid];
      if (!t || t.id === p.id) continue;
      if (t.dead || t.hidden) continue;
      if (t.holeState !== 'outside') continue;
      if (t.isSanta) continue;

      const dx = t.x - p.x;
      const dy = t.y - p.y;
      const dist = Math.hypot(dx, dy);
      if (dist > reach) continue;

      const targetAngle = Math.atan2(dy, dx);
      let angleDiff = targetAngle - angle;
      while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
      while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
      if (Math.abs(angleDiff) > halfArc) continue;

      victim = t;
      break;
    }

    if (!victim) {
      return { message: '🐊 Промахнулся' };
    }

    const damage = Math.max(20, Math.round((p.damage || 40) * 0.6));
    victim.hp -= damage;
    victim.stunned = 1;

    victim.draggedBy = p.id;
    victim.dragUntil = now + 2000;

    if (helpers && typeof helpers.sendToPlayer === 'function') {
      helpers.sendToPlayer(victim.id, {
        type: 'chat', system: true,
        text: `🐊 Крокодил ${p.name} тащит тебя!`
      });
    }

    if (victim.hp <= 0 && helpers && typeof helpers.killPlayerByPlayer === 'function') {
      helpers.killPlayerByPlayer(victim, p, 'разорвал крокодил');
    }

    return { message: `🐊 Ты схватил ${victim.name}!` };
  }
};

// ─────────────────────────────────────────────
//  УРОВЕНЬ 13 — Носорог (Charge)
// ─────────────────────────────────────────────
const rhino = {
  name: 'Charge',
  cooldown: 6000,
  use(p, players, WORLD, helpers) {
    if (p.inArena) return { message: '🚫 На арене нельзя' };
    if (p.holeState !== 'outside') return { message: '🦏 Только снаружи' };

    const now = Date.now();
    const angle = p.angle || 0;
    const duration = 700;
    const boostSpeed = 60;

    p.vx = Math.cos(angle) * boostSpeed;
    p.vy = Math.sin(angle) * boostSpeed;
    p.chargeUntil = now + duration;
    p.chargeActive = true;
    p.skipInterpolation = true;
    p.skipInterpolationFrames = 3;

    const reach = p.r * 3.5;
    const halfArc = Math.PI / 4;

    let hitCount = 0;

    for (const tid of Object.keys(players)) {
      const t = players[tid];
      if (!t || t.id === p.id) continue;
      if (t.dead || t.hidden) continue;
      if (t.holeState !== 'outside') continue;
      if (t.isSanta) continue;

      const dx = t.x - p.x;
      const dy = t.y - p.y;
      const dist = Math.hypot(dx, dy);
      if (dist > reach) continue;

      const targetAngle = Math.atan2(dy, dx);
      let angleDiff = targetAngle - angle;
      while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
      while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
      if (Math.abs(angleDiff) > halfArc) continue;

      const damage = Math.max(20, Math.round((p.damage || 40) * 0.8));
      t.hp -= damage;
      t.stunned = 1.5;

      const knockAngle = Math.atan2(dy, dx);
      const knockPower = 100;
      t.vx += Math.cos(knockAngle) * knockPower;
      t.vy += Math.sin(knockAngle) * knockPower;
      t.skipInterpolation = true;
      t.skipInterpolationFrames = 3;

      hitCount++;

      if (helpers && typeof helpers.sendToPlayer === 'function') {
        helpers.sendToPlayer(t.id, {
          type: 'chat', system: true,
          text: `🦏 Носорог ${p.name} сбил тебя! -${damage} HP`
        });
      }

      if (t.hp <= 0 && helpers && typeof helpers.killPlayerByPlayer === 'function') {
        helpers.killPlayerByPlayer(t, p, 'затоптал');
      }
    }

    if (hitCount === 0) return { message: '🦏 Рывок!' };
    return { message: `🦏 CHARGE! Сбито: ${hitCount}` };
  }
};

// ─────────────────────────────────────────────
//  УРОВЕНЬ 14 — Бегемот (Water Spout)
// ─────────────────────────────────────────────
const hippo = {
  name: 'Water Spout',
  cooldown: 6000,
  use(p, players, WORLD, helpers) {
    if (p.inArena) return { message: '🚫 На арене нельзя' };
    if (p.holeState !== 'outside') return { message: '🦛 Только снаружи' };

    const now = Date.now();
    const angle = p.angle || 0;

    const reach = p.r * 4;
    const halfArc = Math.PI / 2.5;

    p.auraColor = 'blue';
    p.auraUntil = now + 600;

    let hitCount = 0;

    for (const tid of Object.keys(players)) {
      const t = players[tid];
      if (!t || t.id === p.id) continue;
      if (t.dead || t.hidden) continue;
      if (t.holeState !== 'outside') continue;
      if (t.isSanta) continue;

      const dx = t.x - p.x;
      const dy = t.y - p.y;
      const dist = Math.hypot(dx, dy);
      if (dist > reach) continue;

      const targetAngle = Math.atan2(dy, dx);
      let angleDiff = targetAngle - angle;
      while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
      while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
      if (Math.abs(angleDiff) > halfArc) continue;

      const damage = Math.max(15, Math.round((p.damage || 62) * 0.4));
      t.hp -= damage;
      t.stunned = 1.2;

      const knockAngle = Math.atan2(dy, dx);
      const knockPower = 90;
      t.vx += Math.cos(knockAngle) * knockPower;
      t.vy += Math.sin(knockAngle) * knockPower;
      t.skipInterpolation = true;
      t.skipInterpolationFrames = 3;

      hitCount++;

      if (helpers && typeof helpers.sendToPlayer === 'function') {
        helpers.sendToPlayer(t.id, {
          type: 'chat', system: true,
          text: `🦛 Бегемот ${p.name} облил тебя водой! -${damage} HP`
        });
      }

      if (t.hp <= 0 && helpers && typeof helpers.killPlayerByPlayer === 'function') {
        helpers.killPlayerByPlayer(t, p, 'утопил в фонтане');
      }
    }

    p.water = Math.min(p.maxWater, p.water + 40);

    if (helpers && Array.isArray(helpers.fireballs)) {
      helpers.fireballs.push({
        id: 'spout_' + Math.random().toString(36).slice(2),
        x: p.x, y: p.y,
        vx: Math.cos(angle) * 8,
        vy: Math.sin(angle) * 8,
        r: 40,
        owner: p.id,
        damage: 0,
        water: 0,
        life: 15,
        type: 'water'
      });
    }

    if (hitCount === 0) return { message: '🦛 Фонтан! (никого)' };
    return { message: `🦛 Фонтан! Задето: ${hitCount}, +40 воды` };
  }
};

// ─────────────────────────────────────────────
//  УРОВЕНЬ 15 — Дракон (Fire)
// ─────────────────────────────────────────────
const dragon = {
  name: 'Fire',
  cooldown: 1000,
  use(p, players, WORLD, helpers) {
    if (p.inArena) return { message: '🚫 На арене нельзя' };
    if (p.holeState !== 'outside') return { message: '🐉 Только снаружи' };

    if (!helpers || !Array.isArray(helpers.fireballs)) {
      return { message: '❌ Ошибка' };
    }

    const now = Date.now();
    if (now - (p.lastFire || 0) < 1000) return { message: '⌛ Кулдаун' };
    p.lastFire = now;

    const angle = p.angle || 0;

    helpers.fireballs.push({
      id: 'fire_' + Math.random().toString(36).slice(2),
      x: p.x, y: p.y,
      vx: Math.cos(angle) * 15,
      vy: Math.sin(angle) * 15,
      r: 20, owner: p.id,
      damage: 40, life: 40,
      state: 'flying',
      stopAt: now + 500,
      burnUntil: 0,
      burnDamage: 10,
      burnRadius: 60,
      lastBurnDamage: 0,
      type: 'fire'
    });

    return { message: '🔥 Огонь!' };
  }
};

// ─────────────────────────────────────────────
//  УРОВЕНЬ 16 — Чёрный Дракон (Quest List)
// ─────────────────────────────────────────────
const blackdragon = {
  name: 'Quest List',
  cooldown: 2000,
  use(p, players, WORLD, helpers) {
    if (p.inArena) return { message: '🚫 На арене нельзя' };
    if (p.holeState !== 'outside') return { message: '🖤 Только снаружи' };

    const questList = [
      '🐭 Мышь', '🐰 Кролик', '🐷 Свинья', '🦊 Лиса', '🦫 Крот',
      '🦌 Олень', '🦍 Горилла', '🦓 Зебра', '🦁 Лев', '🐆 Гепард',
      '🐻 Медведь', '🐊 Крокодил', '🦏 Носорог', '🦛 Бегемот',
      '🐉 Дракон', '🖤 Чёрный Дракон'
    ];

    if (helpers && typeof helpers.sendToPlayer === 'function') {
      helpers.sendToPlayer(p.id, {
        type: 'quest_list',
        list: questList,
        progress: p.questProgress || {}
      });
    }

    return { message: '📜 Список заданий открыт' };
  }
};

// ─────────────────────────────────────────────
//  УРОВЕНЬ 17 — Король Драконов (Meteor Strike)
// ─────────────────────────────────────────────
const kingdragon = {
  name: 'Meteor Strike',
  cooldown: 15000,
  use(p, players, WORLD, helpers) {
    if (p.inArena) return { message: '🚫 На арене нельзя' };
    if (p.holeState !== 'outside') return { message: '👑 Только снаружи' };

    const now = Date.now();
    const angle = p.angle || 0;

    const targetX = p.x + Math.cos(angle) * 800;
    const targetY = p.y + Math.sin(angle) * 800;

    const clampedX = Math.max(200, Math.min(WORLD.width - 200, targetX));
    const clampedY = Math.max(200, Math.min(WORLD.height - 200, targetY));

    const meteorRadius = 250;

    p.auraColor = 'orange';
    p.auraUntil = now + 1500;

    if (helpers && Array.isArray(helpers.fireballs)) {
      helpers.fireballs.push({
        id: 'meteor_' + Math.random().toString(36).slice(2),
        x: clampedX,
        y: clampedY,
        vx: 0, vy: 0,
        r: meteorRadius,
        owner: p.id,
        damage: 0,
        life: 60,
        type: 'meteor',
        state: 'falling',
        impactAt: now + 1000,
        burnUntil: 0,
        burnRadius: meteorRadius,
        burnDamage: 25,
        lastBurnDamage: 0
      });
    }

    let hitCount = 0;
    for (const tid of Object.keys(players)) {
      const t = players[tid];
      if (!t || t.id === p.id) continue;
      if (t.dead || t.hidden) continue;
      if (t.isSanta) continue;

      const d = Math.hypot(t.x - clampedX, t.y - clampedY);
      if (d > meteorRadius) continue;

      const falloff = 1 - (d / meteorRadius) * 0.5;
      const damage = Math.round(200 * falloff);
      t.hp -= damage;
      t.stunned = 2;

      const knockAngle = d < 1 ? Math.random() * Math.PI * 2 : Math.atan2(t.y - clampedY, t.x - clampedX);
      const knockPower = 150 * falloff;
      t.vx += Math.cos(knockAngle) * knockPower;
      t.vy += Math.sin(knockAngle) * knockPower;
      t.skipInterpolation = true;
      t.skipInterpolationFrames = 5;

      hitCount++;

      if (helpers && typeof helpers.sendToPlayer === 'function') {
        helpers.sendToPlayer(t.id, {
          type: 'chat', system: true,
          text: `☄️ Король ${p.name} обрушил метеорит! -${damage} HP`
        });
      }

      if (t.hp <= 0 && helpers && typeof helpers.killPlayerByPlayer === 'function') {
        helpers.killPlayerByPlayer(t, p, 'сжёг метеоритом');
      }
    }

    if (helpers && typeof helpers.broadcast === 'function') {
      helpers.broadcast({
        type: 'chat', system: true,
        text: `☄️ ${p.name} призвал МЕТЕОРИТ!`
      });
    }

    if (hitCount === 0) return { message: '☄️ Метеорит упал в пустоту' };
    return { message: `☄️ МЕТЕОРИТ! Задето: ${hitCount}` };
  }
};

// ─────────────────────────────────────────────
//  САНТА (админ) — Подарок
// ─────────────────────────────────────────────
const santa = {
  name: 'Подарок',
  cooldown: 500,
  use(p) {
    return { message: '🎁 Подарок (используй G)' };
  }
};

// ═══════════════════════════════════════════════════════════
//  РЕЕСТР СПОСОБНОСТЕЙ (индекс = уровень - 1)
// ═══════════════════════════════════════════════════════════

const ABILITIES = [
  mouse,        // 1
  rabbit,       // 2
  pig,          // 3
  fox,          // 4
  mole,         // 5
  deer,         // 6
  gorilla,      // 7
  zebra,        // 8
  lion,         // 9
  cheetah,      // 10
  bear,         // 11
  croc,         // 12
  rhino,        // 13
  hippo,        // 14
  dragon,       // 15
  blackdragon,  // 16
  kingdragon    // 17
];

function getAbilityByLevel(level, isSanta) {
  if (isSanta) return santa;
  const idx = Math.min(Math.max((level | 0) - 1, 0), ABILITIES.length - 1);
  return ABILITIES[idx];
}

module.exports = {
  getAbilityByLevel,
  ABILITIES,
  santa
};