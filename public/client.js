// ═══════════════════════════════════════════════════════════
//  MOPE.IO CLONE — CLIENT (ПОЛНАЯ ВЕРСИЯ)
//  Аномалии, damage numbers, тряска, звуки, биомы
// ═══════════════════════════════════════════════════════════

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const leaderboard = document.getElementById('leaderboard');
const minimap = document.getElementById('minimap');
const mmCtx = minimap.getContext('2d');
const xpFill = document.getElementById('xp-fill');
const waterFill = document.getElementById('water-fill');
const airFill = document.getElementById('air-fill');
const barLabel = document.getElementById('bar-label');
const bottomBar = document.getElementById('bottom-bar');
const abilitiesPanel = document.getElementById('abilities-panel');
const chatInput = document.getElementById('chat-input');

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;
window.addEventListener('resize', () => {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
});

function lerp(a, b, t) { return a + (b - a) * t; }
function turnTowards(current, target, maxDelta) {
  let diff = target - current;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  if (Math.abs(diff) > maxDelta) diff = Math.sign(diff) * maxDelta;
  return current + diff;
}
const isMobile = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0) || /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);

let myId = null;
let world = { width: 8000, height: 8000 };
let players = {};
let food = [];
let holes = [];
let biomes = [];
let fireballs = [];
let crystals = [];
let trees = [];
let eggs = [];
let anomalies = [];
let duckIsland = { x: 2000, y: 4000, r: 300 };
let duckPond = { x: 2000, y: 4000, r: 150 };
let volcano = { x: 4000, y: 3600, r: 1000 };
let arenaState = null;
let mouse = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
let camera = { x: 0, y: 0, zoom: 1, shakeX: 0, shakeY: 0, shakeTime: 0 };
let gameStarted = false;
let isAdmin = false;
let spectating = false;
let spectateTarget = null;
let particles = [];
let damageNumbers = [];
let trails = {};
let questAutoCloseTimer = null;
let incomingArenaInvite = null;
const FOV_RADIUS = [500, 550, 600, 700, 800, 900, 1000, 1100, 1250, 1400, 1550, 1700, 1900, 2100, 2400, 2700, 3000];
let chatOpen = false;
let respawnPending = false;
let respawnTimer = null;
let respawnDeadline = 0;
let lowHpFlash = 0;
let lastMyHp = 100;

// ─── МУЗЫКА МЕНЮ ───
const menuMusic = document.getElementById('menu-music');
let menuMusicStarted = false;
function startMenuMusic() {
  if (menuMusicStarted || !menuMusic) return;
  menuMusic.volume = 0.4;
  menuMusic.play().then(() => { menuMusicStarted = true; }).catch(() => {});
}
function stopMenuMusic() {
  if (!menuMusic) return;
  menuMusic.pause();
  menuMusic.currentTime = 0;
  menuMusicStarted = false;
}

// ─── ЗВУК ───
let audioCtx = null;
function initAudio() {
  if (!audioCtx) { try { audioCtx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) {} }
  if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume();
}
window.addEventListener('click', () => { initAudio(); startMenuMusic(); }, { once: true });
window.addEventListener('touchstart', () => { initAudio(); startMenuMusic(); }, { once: true });
window.addEventListener('keydown', () => { initAudio(); startMenuMusic(); }, { once: true });

function playTone(freq, duration, type = 'sine', volume = 0.05) {
  if (!audioCtx) return;
  try {
    const now = audioCtx.currentTime;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(volume, now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
    osc.connect(gain); gain.connect(audioCtx.destination);
    osc.start(now); osc.stop(now + duration);
  } catch (e) {}
}

function playQuack(pitch = 1) {
  if (!audioCtx) return;
  try {
    const now = audioCtx.currentTime;
    for (let i = 0; i < 2; i++) {
      const start = now + i * 0.12;
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(220 * pitch, start);
      osc.frequency.exponentialRampToValueAtTime(160 * pitch, start + 0.08);
      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(0.04, start + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.1);
      osc.connect(gain); gain.connect(audioCtx.destination);
      osc.start(start); osc.stop(start + 0.12);
    }
  } catch (e) {}
}
function playEvolutionSound() {
  if (!audioCtx) return;
  try {
    const now = audioCtx.currentTime;
    [523.25, 659.25, 783.99, 1046.50].forEach((freq, i) => {
      const start = now + i * 0.1;
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, start);
      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(0.1, start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.5);
      osc.connect(gain); gain.connect(audioCtx.destination);
      osc.start(start); osc.stop(start + 0.5);
    });
  } catch (e) {}
}
function playArenaSound() {
  if (!audioCtx) return;
  try {
    const now = audioCtx.currentTime;
    [261.63, 329.63, 392.00, 523.25].forEach((freq, i) => {
      const start = now + i * 0.08;
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(freq, start);
      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(0.08, start + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.3);
      osc.connect(gain); gain.connect(audioCtx.destination);
      osc.start(start); osc.stop(start + 0.3);
    });
  } catch (e) {}
}
function playDamageSound(type) {
  if (!audioCtx) return;
  if (type === 'lava') playTone(120, 0.3, 'sawtooth', 0.06);
  else if (type === 'snow') playTone(600, 0.2, 'sine', 0.04);
  else if (type === 'desert') playTone(200, 0.15, 'square', 0.03);
  else if (type === 'freeze') playTone(1200, 0.3, 'sine', 0.05);
  else if (type === 'geyser') playTone(80, 0.4, 'sawtooth', 0.07);
  else if (type === 'anomaly') playTone(440, 0.4, 'sine', 0.06);
  else playTone(300, 0.15, 'square', 0.03);
}
function playBiteSound() { playTone(150, 0.1, 'square', 0.05); }
function playDeathSound() { playTone(80, 0.6, 'sawtooth', 0.08); }
function playEatSound() { playTone(800, 0.08, 'sine', 0.04); }

// ─── ЭВОЛЮЦИЯ МОДАЛКА ───
const ANIMAL_ICONS = ['🐭','🐰','🐷','🦊','🦫','🦌','🦍','🦓','🦁','🐆','🐻','🐊','🦏','🦛','🐉','🖤','👑'];

function getAnimalSpriteImg(index) {
  const idx = Math.min(Math.max(index, 0), 16);
  const name = window.skinNames[idx];
  const img = window.skinImages[name];
  return (img && img.complete && img.naturalWidth > 0) ? img : null;
}

function showEvolutionModal(level, name, index, oldIndex) {
  const modal = document.getElementById('evolution-modal');
  const iconOld = document.getElementById('evolution-icon-old');
  const iconNew = document.getElementById('evolution-icon');
  const nameEl = document.getElementById('evolution-name');
  const levelEl = document.getElementById('evolution-level');
  const btn = document.getElementById('evolution-btn');
  if (!modal) return;
  const oldIdx = typeof oldIndex === 'number' ? oldIndex : Math.max(0, index - 1);
  const imgOld = getAnimalSpriteImg(oldIdx);
  iconOld.innerHTML = '';
  if (imgOld) { const i = new Image(); i.src = imgOld.src; iconOld.appendChild(i); }
  else iconOld.textContent = ANIMAL_ICONS[oldIdx] || '🐾';
  const imgNew = getAnimalSpriteImg(index);
  iconNew.innerHTML = '';
  if (imgNew) { const i = new Image(); i.src = imgNew.src; iconNew.appendChild(i); }
  else iconNew.textContent = ANIMAL_ICONS[index] || '🐾';
  nameEl.textContent = name;
  levelEl.textContent = `${level} уровень`;
  modal.classList.add('show');
  playEvolutionSound();
  btn.onclick = () => {
    modal.classList.remove('show');
    safeSend({ type: 'evolution_confirm' });
  };
}

// ─── КВЕСТ МОДАЛКА ───
function showQuestMenu(progress, level) {
  const modal = document.getElementById('quest-modal');
  if (!modal) return;
  const list = document.getElementById('quest-list');
  const kingEl = document.getElementById('quest-king-status');
  if (list) {
    const animals = ['🐭 Мышь','🐰 Кролик','🐷 Свинья','🦊 Лиса','🦫 Крот','🦌 Олень','🦍 Горилла','🦓 Зебра','🦁 Лев','🐆 Гепард','🐻 Медведь','🐊 Крокодил','🦏 Носорог','🦛 Бегемот','🐉 Дракон','🖤 Чёрный Дракон'];
    list.innerHTML = '';
    animals.forEach((name, i) => {
      const lvl = i + 1;
      const done = progress && progress[lvl];
      const item = document.createElement('div');
      item.className = 'quest-item' + (done ? ' done' : '');
      item.innerHTML = `<span class="quest-name">${name}</span><span class="quest-status">${done ? '✅ Убит' : '❌ Не убит'}</span>`;
      list.appendChild(item);
    });
  }
  if (kingEl) {
    const killed = Object.values(progress || {}).filter(v => v).length;
    kingEl.textContent = killed >= 16 ? '👑 Ты готов стать Королём!' : `Убито: ${killed}/16`;
  }
  modal.classList.add('show');
  playEvolutionSound();
  if (questAutoCloseTimer) clearTimeout(questAutoCloseTimer);
  questAutoCloseTimer = setTimeout(hideQuestMenu, 15000);
}
function hideQuestMenu() {
  const modal = document.getElementById('quest-modal');
  if (modal) modal.classList.remove('show');
  if (questAutoCloseTimer) { clearTimeout(questAutoCloseTimer); questAutoCloseTimer = null; }
}
function isQuestMenuOpen() {
  const modal = document.getElementById('quest-modal');
  return !!(modal && modal.classList.contains('show'));
}

// ─── АРЕНА МОДАЛКА ───
function showArenaInvite(fromId, fromName, fromLevel, timeout) {
  const modal = document.getElementById('arena-invite-modal');
  if (!modal) return;
  document.getElementById('arena-from-name').textContent = fromName + ' (ур. ' + fromLevel + ')';
  modal.classList.add('show');
  incomingArenaInvite = { fromId, fromName, fromLevel, expiresAt: Date.now() + timeout };
  playArenaSound();
}
function hideArenaInvite() {
  const modal = document.getElementById('arena-invite-modal');
  if (modal) modal.classList.remove('show');
  incomingArenaInvite = null;
}

// ─── WEBSOCKET ───
const ws = new WebSocket(`${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}`);
function safeSend(data) {
  if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(data));
}

// ─── СМЕРТЬ МЕНЮ ───
function showDeathMenu(reasonText, respawnInMs) {
  const menu = document.getElementById('menu');
  if (!menu) return;
  if (respawnPending) return;
  bottomBar.style.display = 'block';
  if (abilitiesPanel) abilitiesPanel.style.display = 'none';
  const baseText = reasonText ? '💀 ' + reasonText : '💀 Ты погиб!';
  barLabel.textContent = baseText;
  respawnDeadline = Date.now() + (respawnInMs || 3000);
  if (respawnTimer) clearInterval(respawnTimer);
  respawnTimer = setInterval(() => {
    const left = Math.max(0, Math.ceil((respawnDeadline - Date.now()) / 1000));
    if (left > 0) {
      barLabel.textContent = baseText + ` — респавн через ${left}...`;
    } else {
      clearInterval(respawnTimer);
      respawnTimer = null;
      barLabel.textContent = baseText + ' — нажми PLAY';
    }
  }, 200);
  xpFill.style.width = '0%';
  waterFill.style.width = '0%';
  airFill.style.width = '100%';
  if (menu.style.display === 'none' || !menu.style.display) {
    menu.style.display = 'flex';
    gameStarted = false;
    document.getElementById('startBtn').textContent = '▶ PLAY';
    hideMobileControls();
  }
  if (!menuMusicStarted) startMenuMusic();
  playDeathSound();
}

// ─── WEBSOCKET ОБРАБОТЧИК ───
ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  if (data.type === 'init') {
    myId = data.id; world = data.world; isAdmin = data.isAdmin || false;
  }
  else if (data.type === 'state_fast') {
    const newPlayers = data.players || {};
    for (const pid in newPlayers) {
      const np = newPlayers[pid];
      const old = players[pid];
      if (np.skipInterpolation || (np.skipInterpolationFrames && np.skipInterpolationFrames > 0)) {
        // 🌀 Телепорт / спавн — сбрасываем интерполяцию
        np.renderX = np.x;
        np.renderY = np.y;
        np.renderAngle = np.angle || 0;
        // Сбрасываем и frames, чтобы в draw() не сработал skip ещё раз
        np.skipInterpolationFrames = 0;
        np.skipInterpolation = false;
      } else if (old && old.renderX !== undefined) {
        np.renderX = old.renderX;
        np.renderY = old.renderY;
        np.renderAngle = old.renderAngle;
      } else {
        np.renderX = np.x;
        np.renderY = np.y;
        np.renderAngle = np.angle || 0;
      }
    }
    players = newPlayers;

    // Damage numbers
    if (myId && players[myId]) {
      const me = players[myId];
      if (me.hp < lastMyHp - 0.5) {
        const dmg = Math.round(lastMyHp - me.hp);
        if (dmg >= 1) {
          damageNumbers.push({
            x: me.x, y: me.y - 40,
            text: '-' + dmg,
            color: '#ff4444',
            life: 1.2, maxLife: 1.2
          });
          camera.shakeTime = 0.15;
          lowHpFlash = 0.3;
        }
      }
      lastMyHp = me.hp;

      // Звук биома
      if (me.biome === 'volcano' && me.level < 15) playDamageSound('lava');
      else if (me.biome === 'snow' && me.level < 15) playDamageSound('snow');
      else if (me.biome === 'desert' && me.level < 15) playDamageSound('desert');
    }

    // Фильтр fireballs
    const now = Date.now();
    fireballs = (data.fireballs || []).filter(f => {
      if (f.type === 'fire' && f.state === 'burning' && f.burnUntil) return f.burnUntil > now;
      if (f.type === 'meteor' && f.state === 'burning' && f.burnUntil) return f.burnUntil > now;
      return true;
    });

    eggs = data.eggs || [];
    anomalies = data.anomalies || [];
    arenaState = data.arena || null;

    if (myId && players[myId]) {
      isAdmin = players[myId].isAdmin || false;
      const me = players[myId];
      bottomBar.style.display = 'block';
      if (me.dead || me.hp <= 0) {
        if (!respawnTimer) showDeathMenu(null, 3000);
      }
      else {
        respawnPending = false;
        if (respawnTimer) { clearInterval(respawnTimer); respawnTimer = null; }
        if (abilitiesPanel) abilitiesPanel.style.display = 'flex';

        const xpArr = [0, 10, 25, 50, 100, 200, 400, 700, 1100, 1700, 2500, 3500, 5000, 7500, 11000, 16000];
        const xpToNext = xpArr[Math.min(me.level, 16)] || Infinity;
        const prevXP = xpArr[Math.min(me.level - 1, 15)] || 0;
        let xpPercent = 0;
        if (me.level >= 17) { xpPercent = 100; barLabel.textContent = '👑 Король Драконов'; }
        else {
          xpPercent = Math.max(0, Math.min(100, ((me.score - prevXP) / (xpToNext - prevXP)) * 100));
          barLabel.textContent = `${Math.round(me.score)} XP (${xpToNext} XP Next)`;
        }
        xpFill.style.width = xpPercent + '%';

        const wP = Math.max(0, (me.water / me.maxWater) * 100);
        waterFill.style.width = wP + '%';
        if (me.level >= 15) waterFill.style.background = 'linear-gradient(90deg, #8b0000, #ff4500, #ff9500)';
        else if (wP < 30) waterFill.style.background = 'linear-gradient(90deg, #8b0000, #ff0000, #ff6666)';
        else waterFill.style.background = 'linear-gradient(90deg, #0077b6, #00b4d8, #90e0ef)';

        const aP = Math.max(0, (me.air / me.maxAir) * 100);
        airFill.style.width = aP + '%';
        if (aP < 30) airFill.style.background = 'linear-gradient(90deg, #8b0000, #ff0000, #ff6666)';
        else airFill.style.background = 'linear-gradient(90deg, #0099ff, #66ccff, #99ddff)';

        updateAbilitiesPanel(me);
        updateBiomeIndicator(me);
      }

      const arenaBtn = document.getElementById('arena-btn');
      if (arenaBtn) {
        if (me.level >= 15 && !me.dead && !me.inArena && !me.isSanta) arenaBtn.style.display = 'flex';
        else arenaBtn.style.display = 'none';
      }
    }
  }
  else if (data.type === 'state_slow') {
    food = data.food || [];
    holes = data.holes || [];
    biomes = data.biomes || [];
    crystals = data.crystals || [];
    trees = data.trees || [];
    if (data.volcano) volcano = data.volcano;
    if (data.duckIsland) duckIsland = data.duckIsland;
    if (data.duckPond) duckPond = data.duckPond;
  }
  else if (data.type === 'chat') { if (data.system) showNotification(data.text); }
  else if (data.type === 'duck_enter') { playQuack(0.9 + Math.random() * 0.3); }
  else if (data.type === 'quack') { playQuack(0.8 + Math.random() * 0.6); }
  else if (data.type === 'evolution') { showEvolutionModal(data.level, data.animalName, data.animalIndex, data.oldIndex); }
  else if (data.type === 'evolution_done') { showNotification(`✨ Ты стал ${data.animalName}!`); }
  else if (data.type === 'you_died') {
    const reason = data.killerName ? `${data.reason} — тебя убил ${data.killerName}` : data.reason;
    showDeathMenu(reason, data.respawnIn || 3000);
    hideQuestMenu();
    hideArenaInvite();
  }
  else if (data.type === 'quest_info') { showQuestMenu(data.progress, data.level); }
  else if (data.type === 'quest_list') { showQuestMenu(data.progress, 16); }
  else if (data.type === 'arena_invite') { showArenaInvite(data.fromId, data.fromName, data.fromLevel, data.timeout || 15000); }
  else if (data.type === 'clear-chat') {}
};

// ─── ВВОД ───
canvas.addEventListener('mousemove', (e) => { mouse.x = e.clientX; mouse.y = e.clientY; });
canvas.addEventListener('contextmenu', (e) => e.preventDefault());

let boostHeldLocal = false;
let diveHeldLocal = false;
let lastBoostStart = 0;

canvas.addEventListener('mousedown', (e) => {
  if (!gameStarted || !myId || !players[myId]) return;
  if (chatOpen) return;
  const me = players[myId];
  if (me.dead) return;
  if (e.button === 2) {
    if (me.inArena) return;
    diveHeldLocal = true;
    safeSend({ type: 'dive' });
    e.preventDefault();
    return;
  }
  if (e.button === 0) {
    if (me.holeState === 'inside') return;
    const now = Date.now();
    if (now - lastBoostStart < 100) return;
    lastBoostStart = now;
    boostHeldLocal = true;
    safeSend({ type: 'boostStart' });
  }
});
canvas.addEventListener('mouseup', (e) => {
  if (e.button === 2 && diveHeldLocal) { diveHeldLocal = false; safeSend({ type: 'diveRelease' }); return; }
  if (e.button === 0 && boostHeldLocal) { boostHeldLocal = false; safeSend({ type: 'boostStop' }); }
});
window.addEventListener('blur', () => {
  if (boostHeldLocal) { boostHeldLocal = false; safeSend({ type: 'boostStop' }); }
  if (diveHeldLocal) { diveHeldLocal = false; safeSend({ type: 'diveRelease' }); }
});

canvas.addEventListener('touchstart', (e) => {
  if (!gameStarted || !myId || !players[myId]) return;
  const me = players[myId];
  if (me.dead || me.holeState === 'inside') return;
  boostHeldLocal = true;
  safeSend({ type: 'boostStart' });
}, { passive: true });
canvas.addEventListener('touchend', () => {
  if (boostHeldLocal) { boostHeldLocal = false; safeSend({ type: 'boostStop' }); }
}, { passive: true });

function showNotification(text) {
  const div = document.createElement('div');
  div.textContent = text;
  div.style.cssText = `position:fixed;top:80px;left:50%;transform:translateX(-50%);background:rgba(0,0,0,0.85);color:#ffd700;padding:8px 16px;border-radius:5px;font-family:sans-serif;font-size:14px;z-index:60;pointer-events:none;border:1px solid #ffd700;max-width:600px;text-align:center;`;
  document.body.appendChild(div);
  setTimeout(() => div.remove(), 3000);
}

// ─── КЛАВИАТУРА ───
document.addEventListener('keydown', (e) => {
  if (chatOpen) return;
  if (myId && players[myId] && players[myId].dead) return;
  if (e.key === 'Escape') {
    if (isQuestMenuOpen()) { hideQuestMenu(); return; }
    if (incomingArenaInvite) { hideArenaInvite(); return; }
  }
  if (e.key === 'w' || e.key === 'W' || e.key === 'ц') {
    if (!myId || !players[myId] || !gameStarted) return;
    const me = players[myId];
    if (me.dead) return;
    if (me.inArena) { showNotification('🚫 На арене абилки запрещены'); return; }
    safeSend({ type: 'ability' });
  }
  if (e.key === 's' || e.key === 'S' || e.key === 'ы') {
    if (!myId || !players[myId] || !gameStarted) return;
    const me = players[myId];
    if (me.dead) return;
    if (me.inArena) { showNotification('🚫 На арене нельзя'); return; }
    if (me.level >= 17) safeSend({ type: 'tail' });
    else if (me.level <= 14) safeSend({ type: 'spit' });
  }
  if (e.key === 'ArrowUp' && isAdmin && gameStarted) { e.preventDefault(); safeSend({ type: 'admin_level', delta: 1 }); }
  if (e.key === 'ArrowDown' && isAdmin && gameStarted) { e.preventDefault(); safeSend({ type: 'admin_level', delta: -1 }); }
});

// ─── ЕДИНЫЙ ИНТЕРВАЛ ДВИЖЕНИЯ ───
setInterval(() => {
  if (!gameStarted || !myId || !players[myId]) return;
  const me = players[myId];
  if (me.dead) return;
  if (me.frozen || me.sinking || me.geyser) return;

  if (isMobile) {
    if (joyDir.power < 0.05) return;
    safeSend({ type: 'move', dirX: joyDir.x, dirY: joyDir.y, power: joyDir.power });
  } else {
    const cx = canvas.width / 2, cy = canvas.height / 2;
    const dx = mouse.x - cx, dy = mouse.y - cy;
    const dist = Math.hypot(dx, dy);
    const nx = dist > 0 ? dx / dist : 0;
    const ny = dist > 0 ? dy / dist : 0;
    const maxDist = Math.min(canvas.width, canvas.height) / 2;
    const power = Math.min(1, dist / (maxDist * 0.6));
    safeSend({ type: 'move', dirX: nx, dirY: ny, power });
  }
}, 1000 / 30);

// ─── PLAY ───
document.getElementById('startBtn').addEventListener('click', () => {
  if (!myId) return;
  initAudio();
  stopMenuMusic();
  respawnPending = true;
  if (respawnTimer) { clearInterval(respawnTimer); respawnTimer = null; }
  const nameInput = document.getElementById('name-input');
  const name = nameInput.value.trim() || ('Игрок ' + myId);
  safeSend({ type: 'setName', name });
  setTimeout(() => safeSend({ type: 'spawn', biome: 'forest' }), 100);
  document.getElementById('menu').style.display = 'none';
  gameStarted = true;
  bottomBar.style.display = 'block';
  if (abilitiesPanel) abilitiesPanel.style.display = 'flex';
  showMobileControls();
});

document.addEventListener('DOMContentLoaded', () => {
  const qBtn = document.getElementById('quest-close-btn');
  if (qBtn) qBtn.addEventListener('click', hideQuestMenu);
});

// ─── ЧАТ ───
document.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !chatOpen && gameStarted) {
    e.preventDefault();
    chatOpen = true;
    chatInput.style.display = 'block';
    chatInput.value = '';
    chatInput.focus();
  } else if (e.key === 'Escape' && chatOpen) {
    chatOpen = false;
    chatInput.style.display = 'none';
    chatInput.value = '';
    chatInput.blur();
  }
});
chatInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    e.preventDefault();
    const rawText = chatInput.value.trim();
    const words = rawText.split(/\s+/).filter(w => w.length > 0);
    const limitedText = words.slice(0, 5).join(' ');
    if (limitedText.length > 0 && myId) safeSend({ type: 'chat', text: limitedText });
    chatInput.value = '';
    chatOpen = false;
    chatInput.style.display = 'none';
    chatInput.blur();
  }
  if (e.key === 'Escape') {
    chatInput.value = '';
    chatOpen = false;
    chatInput.style.display = 'none';
    chatInput.blur();
  }
});

// ─── ПАНЕЛЬ СПОСОБНОСТЕЙ ───
const ABILITY_ICONS = ['🐭','🐰','🐷','🦊','🦫','🦌','🦍','🦓','🦁','🐆','🐻','🐊','🦏','🦛','🔥','📜','☄️'];
const ABILITY_COOLDOWNS = [2000, 4000, 6000, 3000, 6000, 5000, 3000, 4000, 8000, 8000, 3000, 5000, 6000, 6000, 1000, 2000, 15000];

function updateAbilitiesPanel(p) {
  if (!abilitiesPanel) return;
  const slotAbility = document.getElementById('slot-ability');
  const slotBoost = document.getElementById('slot-boost');
  const abilityCd = document.getElementById('ability-cd');
  const boostCd = document.getElementById('boost-cd');
  if (!slotAbility || !slotBoost) return;

  const abilityIcon = p.isSanta ? '🎁' : ABILITY_ICONS[Math.min(p.level - 1, 16)];
  const iconEl = slotAbility.querySelector('.ability-icon');
  if (iconEl) iconEl.textContent = abilityIcon;

  let cdMs = p.isSanta ? 500 : ABILITY_COOLDOWNS[Math.min(p.level - 1, 16)];
  const lastUse = p.lastAbility;
  if (lastUse && Date.now() - lastUse < cdMs) {
    slotAbility.classList.remove('ready');
    slotAbility.classList.add('cooldown');
    if (abilityCd) abilityCd.textContent = ((cdMs - (Date.now() - lastUse)) / 1000).toFixed(1) + 's';
  } else {
    slotAbility.classList.add('ready');
    slotAbility.classList.remove('cooldown');
  }

  if (p.lastBoost && Date.now() - p.lastBoost < 1000) {
    slotBoost.classList.remove('ready');
    slotBoost.classList.add('cooldown');
    if (boostCd) boostCd.textContent = ((1000 - (Date.now() - p.lastBoost)) / 1000).toFixed(1) + 's';
  } else {
    slotBoost.classList.add('ready');
    slotBoost.classList.remove('cooldown');
  }
}

// ─── ИНДИКАТОР БИОМА ───
function updateBiomeIndicator(p) {
  const el = document.getElementById('biome-icon');
  if (!el) return;
  const icons = {
    forest: '🌲', water: '💧', snow: '❄️', desert: '🏜️',
    volcano: '🌋', duck: '🦆', arena: '⚔️'
  };
  el.textContent = icons[p.biome] || '🌍';
}

// ─── ЧАСТИЦЫ ───
function spawnParticles(x, y, count, color, speed, life) {
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const s = speed * (0.5 + Math.random() * 0.5);
    particles.push({
      x, y,
      vx: Math.cos(angle) * s,
      vy: Math.sin(angle) * s,
      life: life * (0.7 + Math.random() * 0.3),
      maxLife: life,
      color,
      size: 2 + Math.random() * 3
    });
  }
}
function updateParticles(dt) {
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.x += p.vx * dt * 60;
    p.y += p.vy * dt * 60;
    p.vx *= 0.95;
    p.vy *= 0.95;
    p.life -= dt;
    if (p.life <= 0) particles.splice(i, 1);
  }
}
function updateDamageNumbers(dt) {
  for (let i = damageNumbers.length - 1; i >= 0; i--) {
    const d = damageNumbers[i];
    d.y -= dt * 50;
    d.life -= dt;
    if (d.life <= 0) damageNumbers.splice(i, 1);
  }
}

// ═══════════════════════════════════════════════════════════
//  ОТРИСОВКА
// ═══════════════════════════════════════════════════════════

function draw() {
  ctx.fillStyle = '#0a0a1a';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  let focusX, focusY;
  if (spectating && myId && players[myId] && players[myId].dead) {
    const sorted = Object.values(players).filter(p => !p.dead && p.id !== myId).sort((a, b) => b.score - a.score);
    if (sorted.length > 0) { spectateTarget = sorted[0]; focusX = spectateTarget.x; focusY = spectateTarget.y; }
  } else if (myId && players[myId] && !players[myId].dead) {
    focusX = players[myId].x; focusY = players[myId].y;
  } else { focusX = 4000; focusY = 4000; }

  const nowMs = performance.now();
  const dt = Math.min(50, nowMs - (window._lastDraw || nowMs)) / 1000;
  window._lastDraw = nowMs;

  updateParticles(dt);
  updateDamageNumbers(dt);

  for (const id in players) {
    const p = players[id];
    if (!p || p.dead) continue;

    if (p.skipInterpolation || p.skipInterpolationFrames > 0) {
      p.renderX = p.x;
      p.renderY = p.y;
      p.renderAngle = p.angle || 0;
      p.skipInterpolation = false;
      if (p.skipInterpolationFrames > 0) p.skipInterpolationFrames--;
      continue;
    }

    if (p.renderX === undefined || isNaN(p.renderX)) {
      p.renderX = p.x;
    }
    if (p.renderY === undefined || isNaN(p.renderY)) {
      p.renderY = p.y;
    }
    if (p.renderAngle === undefined || isNaN(p.renderAngle)) {
      p.renderAngle = p.angle || 0;
    }

    // 🌀 Телепорт: если игрок далеко — резкий перенос
    const tdx = p.x - p.renderX;
    const tdy = p.y - p.renderY;
    const tdist = tdx * tdx + tdy * tdy;
    if (tdist > 300 * 300) {
      p.renderX = p.x;
      p.renderY = p.y;
      p.renderAngle = p.angle || 0;
    } else {
      const smooth = 1 - Math.pow(0.001, dt * 30);
      p.renderX = lerp(p.renderX, p.x, smooth);
      p.renderY = lerp(p.renderY, p.y, smooth);
      p.renderAngle = turnTowards(p.renderAngle, p.angle || 0, 14 * dt);
    }
  }

  const me = myId ? players[myId] : null;
  let fovLevel = 500;
  if (me) {
    if (me.level >= 17) fovLevel = 8000;          // весь мир
    else if (me.level === 16) fovLevel = 2600;
    else if (me.level === 15) fovLevel = 2200;
    else fovLevel = FOV_RADIUS[Math.min((me.level || 1) - 1, 16)] || 500;
  }
  camera.zoom = (isMobile ? 400 : 700) / fovLevel;
  if (camera.zoom < 0.15) camera.zoom = 0.15;
  if (camera.zoom > 2.5) camera.zoom = 2.5;

  if (camera.shakeTime > 0) {
    camera.shakeTime -= dt;
    camera.shakeX = (Math.random() - 0.5) * 8;
    camera.shakeY = (Math.random() - 0.5) * 8;
  } else { camera.shakeX = 0; camera.shakeY = 0; }

  const viewW = canvas.width / camera.zoom;
  const viewH = canvas.height / camera.zoom;
  camera.x = focusX - viewW / 2 + camera.shakeX;
  camera.y = focusY - viewH / 2 + camera.shakeY;

  ctx.save();
  ctx.scale(camera.zoom, camera.zoom);

  // Биомы
  for (const b of biomes) {
    ctx.fillStyle = b.color;
    ctx.fillRect(b.x - camera.x, b.y - camera.y, b.w, b.h);
  }

  // Остров уток
  const dix = duckIsland.x - camera.x, diy = duckIsland.y - camera.y;
  ctx.beginPath(); ctx.arc(dix, diy, duckIsland.r, 0, Math.PI * 2);
  ctx.fillStyle = '#3a7d2e'; ctx.fill();
  ctx.strokeStyle = '#5aaa3f'; ctx.lineWidth = 4; ctx.stroke();
  ctx.beginPath(); ctx.arc(dix, diy, duckIsland.r - 15, 0, Math.PI * 2);
  ctx.fillStyle = '#2d6a27'; ctx.fill();

  // Пруд
  const dpx = duckPond.x - camera.x, dpy = duckPond.y - camera.y;
  const pondGrad = ctx.createRadialGradient(dpx, dpy, 0, dpx, dpy, duckPond.r);
  pondGrad.addColorStop(0, '#4fc3f7'); pondGrad.addColorStop(0.6, '#29b6f6'); pondGrad.addColorStop(1, '#0277bd');
  ctx.beginPath(); ctx.arc(dpx, dpy, duckPond.r, 0, Math.PI * 2);
  ctx.fillStyle = pondGrad; ctx.fill();
  ctx.strokeStyle = '#01579b'; ctx.lineWidth = 4; ctx.stroke();

  // Деревья
  for (const tr of trees) {
    const tx = tr.x - camera.x, ty = tr.y - camera.y;
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.beginPath(); ctx.ellipse(tx, ty + tr.r * 0.7, tr.r * 0.9, tr.r * 0.3, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#4a2c17'; ctx.fillRect(tx - 6, ty - 4, 12, tr.r * 0.8);
    ctx.beginPath(); ctx.arc(tx, ty, tr.r, 0, Math.PI * 2);
    ctx.fillStyle = '#1e4d1a'; ctx.fill();
    ctx.beginPath(); ctx.arc(tx - tr.r * 0.3, ty - tr.r * 0.3, tr.r * 0.6, 0, Math.PI * 2);
    ctx.fillStyle = '#2d6a27'; ctx.fill();
  }

  // Вулкан
  const vx = volcano.x - camera.x, vy = volcano.y - camera.y;
  ctx.beginPath(); ctx.arc(vx, vy, volcano.r, 0, Math.PI * 2);
  ctx.fillStyle = '#8b4513'; ctx.fill();
  ctx.strokeStyle = '#4a1818'; ctx.lineWidth = 6; ctx.stroke();
  ctx.beginPath(); ctx.arc(vx, vy, volcano.r * 0.85, 0, Math.PI * 2);
  ctx.fillStyle = '#ff6600'; ctx.fill();
  ctx.beginPath(); ctx.arc(vx, vy, volcano.r * 0.6, 0, Math.PI * 2);
  ctx.fillStyle = '#ff9500'; ctx.fill();
  ctx.beginPath(); ctx.arc(vx, vy, volcano.r * 0.35, 0, Math.PI * 2);
  ctx.fillStyle = '#ffcc00'; ctx.fill();
  ctx.beginPath(); ctx.arc(vx, vy, volcano.r * 0.12, 0, Math.PI * 2);
  ctx.fillStyle = '#ffffff'; ctx.fill();

  // ═══ АНОМАЛИИ ═══
  for (const a of anomalies) {
    const ax = a.x - camera.x, ay = a.y - camera.y;
    const t = Date.now() / 1000;

    if (a.type === 'vortex') {
      // Водоворот — спираль
      ctx.save();
      for (let i = 0; i < 5; i++) {
        const r = a.r * (0.3 + i * 0.15);
        const angleOffset = t * 2 + i * 1.2;
        ctx.beginPath();
        ctx.arc(ax, ay, r, angleOffset, angleOffset + Math.PI * 1.5);
        ctx.strokeStyle = `rgba(100, 200, 255, ${0.5 - i * 0.08})`;
        ctx.lineWidth = 6 - i;
        ctx.stroke();
      }
      // Центр
      const grad = ctx.createRadialGradient(ax, ay, 0, ax, ay, a.r);
      grad.addColorStop(0, 'rgba(0, 50, 150, 0.9)');
      grad.addColorStop(0.5, 'rgba(0, 100, 200, 0.5)');
      grad.addColorStop(1, 'rgba(0, 150, 255, 0)');
      ctx.fillStyle = grad;
      ctx.beginPath(); ctx.arc(ax, ay, a.r, 0, Math.PI * 2); ctx.fill();
      // Иконка
      ctx.font = '40px serif';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('🌀', ax, ay);
      ctx.restore();
    }
    else if (a.type === 'mirage') {
      // Мираж — мерцание
      const flicker = 0.4 + Math.sin(t * 5) * 0.3;
      ctx.save();
      const grad = ctx.createRadialGradient(ax, ay, 0, ax, ay, a.r);
      grad.addColorStop(0, `rgba(255, 200, 255, ${flicker})`);
      grad.addColorStop(0.5, `rgba(200, 150, 255, ${flicker * 0.5})`);
      grad.addColorStop(1, 'rgba(150, 100, 255, 0)');
      ctx.fillStyle = grad;
      ctx.beginPath(); ctx.arc(ax, ay, a.r, 0, Math.PI * 2); ctx.fill();
      ctx.font = '40px serif';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('✨', ax, ay);
      ctx.restore();
    }
    else if (a.type === 'crack') {
      // Трещина — кристаллы льда
      ctx.save();
      const grad = ctx.createRadialGradient(ax, ay, 0, ax, ay, a.r);
      grad.addColorStop(0, 'rgba(200, 240, 255, 0.9)');
      grad.addColorStop(1, 'rgba(150, 200, 255, 0)');
      ctx.fillStyle = grad;
      ctx.beginPath(); ctx.arc(ax, ay, a.r, 0, Math.PI * 2); ctx.fill();
      // Линии трещин
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
      ctx.lineWidth = 3;
      for (let i = 0; i < 6; i++) {
        const angle = (i / 6) * Math.PI * 2 + t * 0.5;
        ctx.beginPath();
        ctx.moveTo(ax, ay);
        ctx.lineTo(ax + Math.cos(angle) * a.r * 0.8, ay + Math.sin(angle) * a.r * 0.8);
        ctx.stroke();
      }
      ctx.font = '40px serif';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('❄️', ax, ay);
      ctx.restore();
    }
    else if (a.type === 'geyser') {
      // Гейзер — анимация подъёма
      ctx.save();
      const grad = ctx.createRadialGradient(ax, ay, 0, ax, ay, a.r);
      grad.addColorStop(0, 'rgba(255, 150, 0, 0.9)');
      grad.addColorStop(1, 'rgba(255, 0, 0, 0)');
      ctx.fillStyle = grad;
      ctx.beginPath(); ctx.arc(ax, ay, a.r, 0, Math.PI * 2); ctx.fill();
      // Иконка
      ctx.font = '40px serif';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('🌋', ax, ay);
      // Пузыри
      for (let i = 0; i < 3; i++) {
        const phase = (t * 2 + i * 0.7) % 1;
        ctx.beginPath();
        ctx.arc(ax, ay - phase * a.r, 8 - phase * 4, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 200, 50, ${1 - phase})`;
        ctx.fill();
      }
      ctx.restore();
    }
    else if (a.type === 'quicksand') {
      // Зыбучие пески — круги на песке
      ctx.save();
      const grad = ctx.createRadialGradient(ax, ay, 0, ax, ay, a.r);
      grad.addColorStop(0, 'rgba(180, 140, 80, 0.8)');
      grad.addColorStop(1, 'rgba(120, 80, 40, 0.2)');
      ctx.fillStyle = grad;
      ctx.beginPath(); ctx.arc(ax, ay, a.r, 0, Math.PI * 2); ctx.fill();
      // Спираль
      ctx.strokeStyle = 'rgba(255, 200, 100, 0.6)';
      ctx.lineWidth = 3;
      for (let i = 0; i < 3; i++) {
        ctx.beginPath();
        ctx.arc(ax, ay, a.r * (0.3 + i * 0.25), t * 2 + i, t * 2 + i + Math.PI * 1.2);
        ctx.stroke();
      }
      ctx.font = '40px serif';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('🏜️', ax, ay);
      ctx.restore();
    }
    else if (a.type === 'pond') {
      // Пруд-целитель — золотое свечение
      ctx.save();
      const pulse = 0.7 + Math.sin(t * 3) * 0.2;
      const grad = ctx.createRadialGradient(ax, ay, 0, ax, ay, a.r);
      grad.addColorStop(0, `rgba(255, 230, 100, ${pulse})`);
      grad.addColorStop(0.5, `rgba(255, 200, 50, ${pulse * 0.5})`);
      grad.addColorStop(1, 'rgba(255, 150, 0, 0)');
      ctx.fillStyle = grad;
      ctx.beginPath(); ctx.arc(ax, ay, a.r, 0, Math.PI * 2); ctx.fill();
      ctx.font = '40px serif';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('💧', ax, ay);
      // Частицы
      for (let i = 0; i < 5; i++) {
        const angle = (i / 5) * Math.PI * 2 + t * 0.5;
        const r = a.r * 0.7;
        ctx.beginPath();
        ctx.arc(ax + Math.cos(angle) * r, ay + Math.sin(angle) * r, 4, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255, 230, 100, 0.8)';
        ctx.fill();
      }
      ctx.restore();
    }
  }

  // АРЕНА
  if (arenaState) {
    const ax = arenaState.x - camera.x, ay = arenaState.y - camera.y, ar = arenaState.r;
    ctx.save();
    ctx.beginPath();
    ctx.arc(ax, ay, ar + 3000, 0, Math.PI * 2);
    ctx.arc(ax, ay, ar, 0, Math.PI * 2, true);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.65)';
    ctx.fill();
    ctx.restore();
    const arenaGrad = ctx.createRadialGradient(ax, ay, 0, ax, ay, ar);
    arenaGrad.addColorStop(0, arenaState.shrinking ? '#8b1a1a' : '#c2a56b');
    arenaGrad.addColorStop(1, arenaState.shrinking ? '#5a0a0a' : '#8a7040');
    ctx.beginPath(); ctx.arc(ax, ay, ar, 0, Math.PI * 2);
    ctx.fillStyle = arenaGrad; ctx.fill();
    ctx.beginPath(); ctx.arc(ax, ay, ar, 0, Math.PI * 2);
    ctx.strokeStyle = arenaState.shrinking ? '#ff4500' : '#ffd700';
    ctx.lineWidth = 8; ctx.stroke();
    const pulse = 1 + Math.sin(Date.now() / 200) * 0.03;
    ctx.beginPath(); ctx.arc(ax, ay, ar * pulse, 0, Math.PI * 2);
    ctx.strokeStyle = arenaState.shrinking ? 'rgba(255,69,0,0.5)' : 'rgba(255,215,0,0.4)';
    ctx.lineWidth = 12; ctx.stroke();
    ctx.font = 'bold 28px sans-serif'; ctx.textAlign = 'center';
    ctx.strokeStyle = '#000'; ctx.lineWidth = 5;
    ctx.fillStyle = arenaState.shrinking ? '#ff4500' : '#ffd700';
    ctx.strokeText('⚔️ АРЕНА 1v1 ⚔️', ax, ay - ar - 20);
    ctx.fillText('⚔️ АРЕНА 1v1 ⚔️', ax, ay - ar - 20);
  }

  // Норы
  for (const h of holes) {
    const hx = h.x - camera.x, hy = h.y - camera.y;
    const grad = ctx.createRadialGradient(hx, hy, h.r * 0.4, hx, hy, h.r * 1.5);
    grad.addColorStop(0, 'rgba(0,0,0,0)'); grad.addColorStop(0.6, 'rgba(0,0,0,0.6)'); grad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = grad;
    ctx.beginPath(); ctx.arc(hx, hy, h.r * 1.5, 0, Math.PI * 2); ctx.fill();
    const innerGrad = ctx.createRadialGradient(hx, hy, 0, hx, hy, h.r);
    innerGrad.addColorStop(0, '#2a1a0a'); innerGrad.addColorStop(0.8, '#1a0f05'); innerGrad.addColorStop(1, '#000');
    ctx.fillStyle = innerGrad;
    ctx.beginPath(); ctx.arc(hx, hy, h.r, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#8b6f47'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(hx, hy, h.r, 0, Math.PI * 2); ctx.stroke();
  }

  // Кристаллы
  for (const c of crystals) {
    if (c.hp <= 0) continue;
    const cx = c.x - camera.x, cy = c.y - camera.y;
    const glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, c.r * 1.5);
    glow.addColorStop(0, 'rgba(0, 100, 255, 0.6)'); glow.addColorStop(1, 'rgba(0, 100, 255, 0)');
    ctx.fillStyle = glow;
    ctx.beginPath(); ctx.arc(cx, cy, c.r * 1.5, 0, Math.PI * 2); ctx.fill();
    const grad = ctx.createRadialGradient(cx - c.r * 0.3, cy - c.r * 0.3, c.r * 0.1, cx, cy, c.r);
    grad.addColorStop(0, '#5bc0ff'); grad.addColorStop(0.6, '#0066cc'); grad.addColorStop(1, '#003d80');
    ctx.fillStyle = grad;
    ctx.beginPath();
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2 - Math.PI / 8;
      const px = cx + Math.cos(angle) * c.r, py = cy + Math.sin(angle) * c.r;
      if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#00ff88'; ctx.lineWidth = 3; ctx.stroke();

    // 💙 Шкала HP кристалла
    if (c.hp !== undefined && c.maxHp !== undefined && c.maxHp > 0) {
      const w = c.r * 2.2;
      const h = 8;
      const barX = cx - w / 2;
      const barY = cy - c.r - 20;
      // Фон
      ctx.fillStyle = 'rgba(0,0,0,0.7)';
      ctx.fillRect(barX, barY, w, h);
      // Заполнение
      const pct = Math.max(0, Math.min(1, c.hp / c.maxHp));
      const hue = pct * 120; // 0 — красный, 120 — зелёный
      ctx.fillStyle = `hsl(${hue}, 100%, 50%)`;
      ctx.fillRect(barX, barY, w * pct, h);
      // Обводка
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 2;
      ctx.strokeRect(barX, barY, w, h);
      // Текст HP
      ctx.font = 'bold 12px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 3;
      ctx.strokeText(`${Math.ceil(c.hp)} / ${c.maxHp}`, cx, barY - 10);
      ctx.fillStyle = '#fff';
      ctx.fillText(`${Math.ceil(c.hp)} / ${c.maxHp}`, cx, barY - 10);
    }
  }

  // Яйца
  for (const e of eggs) {
    const ex = e.x - camera.x, ey = e.y - camera.y;
    const pulse = 1 + Math.sin(Date.now() / 300) * 0.1;
    const R = e.r * pulse;
    const glow = ctx.createRadialGradient(ex, ey, 0, ex, ey, R * 2);
    glow.addColorStop(0, 'rgba(255, 215, 0, 0.7)');
    glow.addColorStop(1, 'rgba(255, 215, 0, 0)');
    ctx.fillStyle = glow;
    ctx.beginPath(); ctx.arc(ex, ey, R * 2, 0, Math.PI * 2); ctx.fill();
    ctx.save();
    ctx.translate(ex, ey);
    ctx.rotate(Math.sin(Date.now() / 500) * 0.2);
    ctx.font = `${R * 1.8}px serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('🥚', 0, 0);
    ctx.restore();
  }

  // Еда
  for (const f of food) {
    const fx = f.x - camera.x, fy = f.y - camera.y;
    if (f._wobble === undefined) f._wobble = Math.random() * Math.PI * 2;
    f._wobble += 0.02;
    const wobbleAngle = (f.angle || 0) + Math.sin(f._wobble) * 0.08;
    drawFood(ctx, fx, fy, f.r, { sprite: f.sprite, color: f.color, emoji: f.emoji, angle: wobbleAngle });
    if (f.maxHp && f.maxHp > 1) {
      const w = f.r * 1.4, h = 4, barY = fy - Math.max(f.r * 0.9, 22);
      ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(fx - w / 2, barY, w, h);
      ctx.fillStyle = f.hp / f.maxHp > 0.5 ? '#00ff00' : f.hp / f.maxHp > 0.25 ? '#ffff00' : '#ff0000';
      ctx.fillRect(fx - w / 2, barY, w * (f.hp / f.maxHp), h);
    }
  }

  // СНАРЯДЫ
  for (const fb of fireballs) {
    if (!isFinite(fb.x) || !isFinite(fb.y)) continue;
    const baseR = isFinite(fb.r) ? fb.r : 20;
    const fx = fb.x - camera.x, fy = fb.y - camera.y;
    const isWater = fb.type === 'water';
    const isBanana = fb.type === 'banana';
    const isMeteor = fb.type === 'meteor';
    const isBurning = fb.state === 'burning';

    if (isWater) {
      const r = baseR;
      const glow = ctx.createRadialGradient(fx, fy, 0, fx, fy, r * 2);
      glow.addColorStop(0, 'rgba(180, 230, 255, 0.95)');
      glow.addColorStop(0.5, 'rgba(80, 170, 255, 0.7)');
      glow.addColorStop(1, 'rgba(0, 100, 200, 0)');
      ctx.fillStyle = glow;
      ctx.beginPath(); ctx.arc(fx, fy, r * 2, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(fx, fy, r, 0, Math.PI * 2);
      ctx.fillStyle = '#00b4d8'; ctx.fill();
      ctx.strokeStyle = '#90e0ef'; ctx.lineWidth = 2; ctx.stroke();
      continue;
    }
    if (isBanana) {
      ctx.font = '36px serif';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.save(); ctx.translate(fx, fy); ctx.rotate(Date.now() / 100);
      ctx.fillText('🍌', 0, 0); ctx.restore();
      continue;
    }
    if (isMeteor) {
      const R = baseR || 250;
      if (fb.state === 'falling') {
        const now = Date.now();
        const totalFall = 1000;
        const remaining = fb.impactAt ? Math.max(0, fb.impactAt - now) : totalFall;
        const progress = Math.max(0, Math.min(1, 1 - remaining / totalFall));
        const currentR = R * (1 - progress * 0.7);
        ctx.save();
        ctx.strokeStyle = `rgba(255, 100, 0, ${0.4 + progress * 0.6})`;
        ctx.lineWidth = 6;
        ctx.setLineDash([15, 10]);
        ctx.lineDashOffset = -now / 30;
        ctx.beginPath(); ctx.arc(fx, fy, currentR, 0, Math.PI * 2); ctx.stroke();
        ctx.setLineDash([]);
        ctx.beginPath(); ctx.arc(fx, fy, currentR * 0.5, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(255, 200, 50, ${0.3 + progress * 0.5})`;
        ctx.lineWidth = 3;
        ctx.stroke();
        ctx.restore();
        const fallY = fy - 400 + progress * 400;
        ctx.save();
        ctx.font = '80px serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = 'rgba(255, 150, 0, 0.9)';
        ctx.fillText('☄️', fx, fallY);
        ctx.restore();
        continue;
      } else if (fb.state === 'burning') {
        const flicker = 1 + Math.sin(Date.now() / 60) * 0.1;
        const RR = R * flicker;
        const grad = ctx.createRadialGradient(fx, fy, 0, fx, fy, RR);
        grad.addColorStop(0, 'rgba(255, 255, 180, 1)');
        grad.addColorStop(0.4, 'rgba(255, 150, 0, 0.9)');
        grad.addColorStop(0.8, 'rgba(255, 60, 0, 0.5)');
        grad.addColorStop(1, 'rgba(200, 20, 0, 0)');
        ctx.fillStyle = grad;
        ctx.beginPath(); ctx.arc(fx, fy, RR, 0, Math.PI * 2); ctx.fill();
        for (let k = 0; k < 12; k++) {
          const angle = (Date.now() / 400 + k * 0.5) % (Math.PI * 2);
          const ddist = RR * 0.6 * (0.7 + Math.sin(Date.now() / 150 + k) * 0.3);
          ctx.beginPath();
          ctx.arc(fx + Math.cos(angle) * ddist, fy + Math.sin(angle) * ddist, RR * 0.12, 0, Math.PI * 2);
          ctx.fillStyle = 'rgba(255, 240, 100, 0.8)';
          ctx.fill();
        }
        continue;
      }
    }
    if (isBurning) {
      const R = (fb.burnRadius || 60) * 1.2;
      const flicker = 1 + Math.sin(Date.now() / 60) * 0.1;
      const RR = R * flicker;
      const burnGlow = ctx.createRadialGradient(fx, fy, 0, fx, fy, RR);
      burnGlow.addColorStop(0, 'rgba(255, 255, 180, 1)');
      burnGlow.addColorStop(0.3, 'rgba(255, 200, 60, 0.9)');
      burnGlow.addColorStop(0.6, 'rgba(255, 100, 0, 0.7)');
      burnGlow.addColorStop(1, 'rgba(200, 20, 0, 0)');
      ctx.fillStyle = burnGlow;
      ctx.beginPath(); ctx.arc(fx, fy, RR, 0, Math.PI * 2); ctx.fill();
      for (let k = 0; k < 8; k++) {
        const angle = (Date.now() / 300 + k * 0.8) % (Math.PI * 2);
        const ddist = RR * 0.5 * (0.7 + Math.sin(Date.now() / 150 + k) * 0.3);
        ctx.beginPath();
        ctx.arc(fx + Math.cos(angle) * ddist, fy + Math.sin(angle) * ddist, RR * 0.18, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255, 240, 100, 0.8)'; ctx.fill();
      }
      continue;
    }
    const flicker = 1 + Math.sin(Date.now() / 40 + fb.x) * 0.25;
    const RR = baseR * flicker;
    const glow = ctx.createRadialGradient(fx, fy, 0, fx, fy, RR * 2.5);
    glow.addColorStop(0, 'rgba(255, 255, 150, 0.95)');
    glow.addColorStop(0.4, 'rgba(255, 160, 0, 0.8)');
    glow.addColorStop(0.8, 'rgba(255, 60, 0, 0.4)');
    glow.addColorStop(1, 'rgba(255, 0, 0, 0)');
    ctx.fillStyle = glow;
    ctx.beginPath(); ctx.arc(fx, fy, RR * 2.5, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(fx, fy, RR, 0, Math.PI * 2);
    ctx.fillStyle = '#ff8800'; ctx.fill();
    ctx.beginPath(); ctx.arc(fx, fy, RR * 0.5, 0, Math.PI * 2);
    ctx.fillStyle = '#ffff00'; ctx.fill();
  }

  // ИГРОКИ
  const sorted = Object.values(players).sort((a, b) => b.score - a.score);
  for (const p of sorted) {
    if (p.dead) continue;
    const x = (p.renderX !== undefined ? p.renderX : p.x) - camera.x;
    const y = (p.renderY !== undefined ? p.renderY : p.y) - camera.y;
    const angle = p.renderAngle !== undefined ? p.renderAngle : (p.angle || 0);
    if (p.hidden && p.id != myId) continue;

    // След буста
    if (p.id == myId && p.boostActive) {
      if (!trails[p.id]) trails[p.id] = [];
      trails[p.id].push({ x, y, r: p.r, life: 0.4 });
      if (trails[p.id].length > 8) trails[p.id].shift();
    }
    if (trails[p.id]) {
      for (const tr of trails[p.id]) {
        tr.life -= dt;
        if (tr.life <= 0) continue;
        ctx.beginPath(); ctx.arc(tr.x, tr.y, tr.r * 0.9, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(100, 200, 255, ${tr.life / 0.4 * 0.25})`; ctx.fill();
      }
      trails[p.id] = trails[p.id].filter(t => t.life > 0);
    }

    // Обводка prey/predator
    if (p.id !== String(myId) && !p.hidden && !p.inArena) {
      const skinSize = p.level >= 15 ? p.r * 2.3 : p.level >= 11 ? p.r * 2.0 : p.r * 3.0;
      if (p.preyOf) {
        ctx.save();
        ctx.beginPath();
        ctx.arc(x, y, skinSize / 2 + 6, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(74, 222, 128, 0.9)';
        ctx.lineWidth = 2;
        ctx.setLineDash([10, 5]);
        ctx.lineDashOffset = -Date.now() / 50;
        ctx.stroke();
        ctx.restore();
      } else if (p.predatorOf) {
        ctx.save();
        ctx.beginPath();
        ctx.arc(x, y, skinSize / 2 + 6, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(248, 113, 113, 0.9)';
        ctx.lineWidth = 3;
        ctx.stroke();
        const pulse = 1 + Math.sin(Date.now() / 150) * 0.06;
        ctx.beginPath();
        ctx.arc(x, y, (skinSize / 2 + 6) * pulse, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(248, 113, 113, 0.4)';
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.restore();
      }
    }
    // Underwater — только пузырьки (купол рисуется ПОСЛЕ скина)
    if (p.underwater) {
      const now = Date.now();
      if (!p._bubbles) p._bubbles = [];
      if (!p._bubbleLastSpawn || now - p._bubbleLastSpawn > 100) {
        p._bubbleLastSpawn = now;
        p._bubbles.push({
          x: x + (Math.random() - 0.5) * p.r * 1.2,
          y: y + p.r * 0.4,
          r: 4 + Math.random() * 5,
          wobble: Math.random() * Math.PI * 2,
          born: now,
          life: 1800
        });
      }
      for (let i = p._bubbles.length - 1; i >= 0; i--) {
        const b = p._bubbles[i];
        const age = now - b.born;
        if (age >= b.life) { p._bubbles.splice(i, 1); continue; }
        const progress = age / b.life;
        const bx = b.x + Math.sin(now / 150 + b.wobble) * 8;
        const by = b.y - progress * 80;
        const alpha = Math.max(0, (1 - progress) * 0.9);
        ctx.save();
        ctx.globalAlpha = alpha;
        const bg = ctx.createRadialGradient(bx, by, 0, bx, by, b.r);
        bg.addColorStop(0, 'rgba(255, 255, 255, 0.95)');
        bg.addColorStop(0.5, 'rgba(180, 230, 255, 0.8)');
        bg.addColorStop(1, 'rgba(100, 180, 255, 0.4)');
        ctx.fillStyle = bg;
        ctx.beginPath(); ctx.arc(bx, by, b.r, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = 'rgba(255, 255, 255, 1)';
        ctx.lineWidth = 1.5;
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(bx - b.r * 0.3, by - b.r * 0.3, b.r * 0.3, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255, 255, 255, 1)';
        ctx.fill();
        ctx.restore();
      }
    }

    // Boost aura
    if (p.boostActive) {
      const pulse = 1 + Math.sin(Date.now() / 80) * 0.15;
      const auraR = p.r * 2.2 * pulse;
      const gradient = ctx.createRadialGradient(x, y, p.r * 0.5, x, y, auraR);
      gradient.addColorStop(0, 'rgba(100, 200, 255, 0.5)');
      gradient.addColorStop(0.5, 'rgba(50, 150, 255, 0.25)');
      gradient.addColorStop(1, 'rgba(0, 100, 255, 0)');
      ctx.fillStyle = gradient;
      ctx.beginPath(); ctx.arc(x, y, auraR, 0, Math.PI * 2); ctx.fill();
    }

    // Аура абилок
    if (p.auraColor && p.auraUntil && Date.now() < p.auraUntil) {
      const alpha = Math.min(1, (p.auraUntil - Date.now()) / 500);
      const auraR = p.r * 2.5;
      const gradient = ctx.createRadialGradient(x, y, p.r * 0.5, x, y, auraR);
      const color = p.auraColor === 'green' ? '100, 255, 100'
                  : p.auraColor === 'blue' ? '100, 180, 255'
                  : '255, 150, 50';
      gradient.addColorStop(0, `rgba(${color}, ${0.7 * alpha})`);
      gradient.addColorStop(0.5, `rgba(${color}, ${0.4 * alpha})`);
      gradient.addColorStop(1, `rgba(${color}, 0)`);
      ctx.fillStyle = gradient;
      ctx.beginPath(); ctx.arc(x, y, auraR, 0, Math.PI * 2); ctx.fill();
    }

    // Dig воронка (Крот)
    if (p.digging) {
      ctx.save();
      ctx.globalAlpha = 0.7;
      const holeR = p.r * 1.5;
      const grad = ctx.createRadialGradient(x, y, 0, x, y, holeR);
      grad.addColorStop(0, '#3a1f0a');
      grad.addColorStop(0.6, '#5a3a15');
      grad.addColorStop(1, 'rgba(139, 111, 71, 0)');
      ctx.fillStyle = grad;
      ctx.beginPath(); ctx.arc(x, y, holeR, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }

    // Frozen — синий ореол
    if (p.frozen) {
      ctx.save();
      ctx.strokeStyle = 'rgba(150, 220, 255, 0.9)';
      ctx.lineWidth = 5;
      ctx.beginPath(); ctx.arc(x, y, p.r * 1.8, 0, Math.PI * 2); ctx.stroke();
      ctx.restore();
    }

    // Flying — летит
    if (p.flying) {
      ctx.save();
      ctx.globalAlpha = 0.6;
      ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
      ctx.beginPath(); ctx.ellipse(x, y + p.r, p.r * 1.2, p.r * 0.3, 0, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }

    // Hidden in hole
    if (p.holeState === 'inside') {
      ctx.globalAlpha = (p.id == myId) ? 0.85 : 0.35;
      const hiddenSize = p.level >= 15 ? p.r * 2.3 : p.level >= 11 ? p.r * 2.0 : p.r * 3.0;
      drawSkin(ctx, x, y, hiddenSize, p.level, angle);
      ctx.globalAlpha = 1;
      if (p.id == myId) {
        ctx.font = 'bold 15px sans-serif';
        ctx.textAlign = 'center';
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 4;
        ctx.fillStyle = '#fff';
        ctx.strokeText(p.name, x, y - hiddenSize / 2 - 8);
        ctx.fillText(p.name, x, y - hiddenSize / 2 - 8);
      }
      continue;
    }

    // Скин
    const skinSize = p.level >= 15 ? p.r * 2.3 : p.level >= 11 ? p.r * 2.0 : p.r * 3.0;

    // 💧 Под водой — скин НЕ рисуем, только купол + пузырьки
    if (p.underwater) {
      // Купол воды
      ctx.save();
      const bubbleR = p.r * 1.7;
      const bubbleGrad = ctx.createRadialGradient(x, y, p.r * 0.3, x, y, bubbleR);
      bubbleGrad.addColorStop(0, 'rgba(100, 180, 255, 0.4)');
      bubbleGrad.addColorStop(0.7, 'rgba(50, 140, 230, 0.6)');
      bubbleGrad.addColorStop(1, 'rgba(20, 80, 180, 0.85)');
      ctx.fillStyle = bubbleGrad;
      ctx.beginPath(); ctx.arc(x, y, bubbleR, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
      ctx.lineWidth = 3;
      ctx.stroke();
      ctx.restore();

      // Прозрачный силуэт игрока — чтобы сам себя видел
      if (p.id == myId) {
        ctx.save();
        ctx.globalAlpha = 0.25;
        if (p.skin === 'lambo' && window.drawLambo) {
          window.drawLambo(ctx, x, y, skinSize, angle);
        } else {
          drawSkin(ctx, x, y, skinSize, p.level, angle);
        }
        ctx.restore();
      }
    } else {
      // 🎨 Кастомный скин
      if (p.skin === 'lambo' && window.drawLambo) {
        window.drawLambo(ctx, x, y, skinSize, angle);
      } else {
        drawSkin(ctx, x, y, skinSize, p.level, angle);
      }
    }

    // Имя
    ctx.font = 'bold 15px sans-serif';
    ctx.textAlign = 'center';
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 4;
    if (p.isAdmin) {
      const hue = (Date.now() / 20) % 360;
      ctx.fillStyle = '#ff0000';
      ctx.strokeText('[DEV]', x - 30, y - skinSize / 2 - 8);
      ctx.fillText('[DEV]', x - 30, y - skinSize / 2 - 8);
      ctx.fillStyle = `hsl(${hue}, 100%, 60%)`;
    } else ctx.fillStyle = '#fff';
    ctx.strokeText(p.name, x, y - skinSize / 2 - 8);
    ctx.fillText(p.name, x, y - skinSize / 2 - 8);

    // HP bar
    if (p.hp !== undefined && p.maxHp !== undefined) {
      const barWidth = p.r * 1.8, barHeight = 6;
      const barX = x - barWidth / 2;
      const barY = y - skinSize / 2 - 26;
      ctx.fillStyle = 'rgba(0,0,0,0.7)';
      ctx.fillRect(barX, barY, barWidth, barHeight);
      const hpPercent = Math.max(0, p.hp / p.maxHp);
      const hpColor = hpPercent > 0.5 ? '#00ff00' : hpPercent > 0.25 ? '#ffff00' : '#ff0000';
      ctx.fillStyle = hpColor;
      ctx.fillRect(barX, barY, barWidth * hpPercent, barHeight);
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 1;
      ctx.strokeRect(barX, barY, barWidth, barHeight);
    }

    // Чат над головой
    if (p.chatText && p.chatTime) {
      const tx = x, ty = y - skinSize / 2 - 50;
      const elapsed = Date.now() - p.chatTime;
      const life = 4000;
      let alpha = 1;
      if (elapsed > life * 0.6) alpha = 1 - (elapsed - life * 0.6) / (life * 0.4);
      if (alpha > 0) {
        ctx.save();
        ctx.globalAlpha = Math.max(0, Math.min(1, alpha));
        ctx.font = 'bold 16px sans-serif';
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.strokeStyle = 'rgba(0,0,0,0.9)'; ctx.lineWidth = 4;
        ctx.strokeText(p.chatText, tx, ty);
        ctx.fillStyle = '#ffffff';
        ctx.fillText(p.chatText, tx, ty);
        ctx.restore();
      }
    }
  }

  // Частицы
  for (const p of particles) {
    ctx.globalAlpha = Math.max(0, p.life / p.maxLife);
    ctx.beginPath(); ctx.arc(p.x - camera.x, p.y - camera.y, p.size, 0, Math.PI * 2);
    ctx.fillStyle = p.color; ctx.fill();
  }
  ctx.globalAlpha = 1;

  // Damage numbers
  for (const d of damageNumbers) {
    ctx.globalAlpha = Math.max(0, d.life / d.maxLife);
    ctx.font = 'bold 20px sans-serif';
    ctx.textAlign = 'center';
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 4;
    ctx.strokeText(d.text, d.x - camera.x, d.y - camera.y);
    ctx.fillStyle = d.color;
    ctx.fillText(d.text, d.x - camera.x, d.y - camera.y);
  }
  ctx.globalAlpha = 1;
  ctx.restore();

  // Красный фильтр при низком HP
  if (lowHpFlash > 0) {
    ctx.fillStyle = `rgba(255, 0, 0, ${lowHpFlash})`;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    lowHpFlash -= dt * 1.5;
    if (lowHpFlash < 0) lowHpFlash = 0;
  }

  // Постоянное мигание при HP < 30%
  if (me && !me.dead && me.hp / me.maxHp < 0.3) {
    const alpha = 0.1 + Math.sin(Date.now() / 200) * 0.1;
    ctx.fillStyle = `rgba(255, 0, 0, ${alpha})`;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  // Leaderboard
  leaderboard.innerHTML = '<b>Топ:</b><br>' +
    sorted.filter(p => !p.isBot).slice(0, 5).map((p, i) => `${i + 1}. ${p.isSanta ? '🎅' : ''} ${p.name} — ${p.score}`).join('<br>');

  // Миникарта
  mmCtx.clearRect(0, 0, 160, 160);
  for (const b of biomes) {
    mmCtx.fillStyle = b.color;
    mmCtx.fillRect(b.x / world.width * 160, b.y / world.height * 160, b.w / world.width * 160, b.h / world.height * 160);
  }
  mmCtx.beginPath();
  mmCtx.arc(volcano.x / world.width * 160, volcano.y / world.height * 160, volcano.r / world.width * 160, 0, Math.PI * 2);
  mmCtx.fillStyle = '#ff6600'; mmCtx.fill();

  // Аномалии на миникарте
  for (const a of anomalies) {
    mmCtx.beginPath();
    mmCtx.arc(a.x / world.width * 160, a.y / world.height * 160, 3, 0, Math.PI * 2);
    mmCtx.fillStyle = a.type === 'vortex' ? '#00aaff'
                    : a.type === 'mirage' ? '#cc88ff'
                    : a.type === 'crack' ? '#88ddff'
                    : a.type === 'geyser' ? '#ff5500'
                    : a.type === 'quicksand' ? '#aa7733'
                    : a.type === 'pond' ? '#ffdd44'
                    : '#ffffff';
    mmCtx.fill();
  }

  if (arenaState) {
    mmCtx.beginPath();
    mmCtx.arc(arenaState.x / world.width * 160, arenaState.y / world.height * 160, arenaState.r / world.width * 160, 0, Math.PI * 2);
    mmCtx.fillStyle = arenaState.shrinking ? '#ff4500' : '#ffd700'; mmCtx.fill();
  }
  for (const id in players) {
    const p = players[id];
    if (p.hidden && id != myId) continue;
    if (p.dead) continue;
    if (p.isBot) continue;
    mmCtx.beginPath();
    mmCtx.arc(p.x / world.width * 160, p.y / world.height * 160, id == myId ? 4 : 3, 0, Math.PI * 2);
    mmCtx.fillStyle = id == myId ? '#fff' : p.color;
    mmCtx.fill();
  }

  requestAnimationFrame(draw);
}

// ═══════════════════════════════════════════════════════════
//  МОБИЛЬНОЕ УПРАВЛЕНИЕ
// ═══════════════════════════════════════════════════════════

function showMobileControls() {
  if (isMobile) {
    document.getElementById('joystick').style.display = 'block';
    document.getElementById('mobile-buttons').style.display = 'flex';
  }
}
function hideMobileControls() {
  document.getElementById('joystick').style.display = 'none';
  document.getElementById('mobile-buttons').style.display = 'none';
}

const joystickEl = document.getElementById('joystick-base');
const stickEl = document.getElementById('joystick-stick');
let joyActive = false;
let joyDir = { x: 0, y: 0, power: 0 };

function getJoyCenter() {
  const r = joystickEl.getBoundingClientRect();
  return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
}

joystickEl.addEventListener('touchstart', (e) => {
  e.preventDefault(); joyActive = true; updateJoystick(e.touches[0]);
}, { passive: false });
joystickEl.addEventListener('touchmove', (e) => {
  e.preventDefault(); if (!joyActive) return; updateJoystick(e.touches[0]);
}, { passive: false });
joystickEl.addEventListener('touchend', (e) => {
  e.preventDefault();
  joyActive = false;
  joyDir = { x: 0, y: 0, power: 0 };
  stickEl.style.transform = 'translate(0, 0)';
}, { passive: false });

function updateJoystick(touch) {
  const center = getJoyCenter();
  let dx = touch.clientX - center.x;
  let dy = touch.clientY - center.y;
  const dist = Math.hypot(dx, dy);
  const maxDist = 55;
  const clamped = Math.min(dist, maxDist);
  const nx = dist > 0 ? dx / dist : 0;
  const ny = dist > 0 ? dy / dist : 0;
  stickEl.style.transform = `translate(${nx * clamped}px, ${ny * clamped}px)`;
  joyDir.x = nx; joyDir.y = ny; joyDir.power = clamped / maxDist;
}

document.getElementById('btn-ability').addEventListener('touchstart', (e) => {
  e.preventDefault();
  if (myId && players[myId] && gameStarted) {
    const me = players[myId];
    if (me.inArena) { showNotification('🚫 На арене нельзя'); return; }
    if (me.dead) return;
    safeSend({ type: 'ability' });
  }
}, { passive: false });

document.getElementById('btn-boost').addEventListener('touchstart', (e) => {
  e.preventDefault();
  if (myId && players[myId] && gameStarted) {
    boostHeldLocal = true;
    safeSend({ type: 'boostStart' });
  }
}, { passive: false });
document.getElementById('btn-boost').addEventListener('touchend', (e) => {
  e.preventDefault();
  if (boostHeldLocal) { boostHeldLocal = false; safeSend({ type: 'boostStop' }); }
}, { passive: false });

// ═══════════════════════════════════════════════════════════
//  АРЕНА — обработчики
// ═══════════════════════════════════════════════════════════

function bindArenaUI() {
  const arenaBtn = document.getElementById('arena-btn');
  const inviteAccept = document.getElementById('arena-accept-btn');
  const inviteDecline = document.getElementById('arena-decline-btn');

  if (arenaBtn) {
    arenaBtn.addEventListener('click', () => {
      if (!myId || !players[myId]) return;
      const me = players[myId];
      if (me.level < 15 || me.dead || me.inArena) return;
      let best = null, bestDist = Infinity;
      for (const id in players) {
        const p = players[id];
        if (id == myId) continue;
        if (p.dead || p.inArena || p.isSanta || p.isBot) continue;
        if (p.level < 15) continue;
        const d = Math.hypot(p.x - me.x, p.y - me.y);
        if (d < bestDist) { bestDist = d; best = { id, dist: d }; }
      }
      if (!best || best.dist > 2000) {
        showNotification('❌ Рядом нет противников 15+ уровня');
        return;
      }
      safeSend({ type: 'arena_invite', targetId: parseInt(best.id) });
      showNotification('⚔️ Отправлен запрос...');
    });
  }

  if (inviteAccept) {
    inviteAccept.addEventListener('click', () => {
      if (!incomingArenaInvite) return;
      safeSend({ type: 'arena_accept' });
      hideArenaInvite();
    });
  }
  if (inviteDecline) {
    inviteDecline.addEventListener('click', () => {
      if (!incomingArenaInvite) return;
      safeSend({ type: 'arena_decline' });
      hideArenaInvite();
    });
  }
}

document.addEventListener('DOMContentLoaded', bindArenaUI);

setInterval(() => {
  if (incomingArenaInvite && Date.now() > incomingArenaInvite.expiresAt) {
    hideArenaInvite();
  }
}, 1000);

// ═══════════════════════════════════════════════════════════
//  ЗАПУСК
// ═══════════════════════════════════════════════════════════

draw();