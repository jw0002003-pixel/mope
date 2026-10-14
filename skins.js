// ═══════════════════════════════════════════════════════════
//  SKINS.JS — 17 PNG-скинов + lambo (админ) + еда
// ═══════════════════════════════════════════════════════════

window.skinNames = [
  'mouse',
  'rabbit',
  'pig',
  'fox',
  'mole',
  'deer',
  'gorilla',
  'zebra',
  'lion',
  'cheetah',
  'bear',
  'croc',
  'rhino',
  'hippo',
  'dragon',
  'blackdragon',
  'kingdragon',
  'lambo'
];

window.SKIN_EMOJI = {
  mouse:       '🐭',
  rabbit:      '🐰',
  pig:         '🐷',
  fox:         '🦊',
  mole:        '🦫',
  deer:        '🦌',
  gorilla:     '🦍',
  zebra:       '🦓',
  lion:        '🦁',
  cheetah:     '🐆',
  bear:        '🐻',
  croc:        '🐊',
  rhino:       '🦏',
  hippo:       '🦛',
  dragon:      '🐉',
  blackdragon: '🖤',
  kingdragon:  '👑',
  lambo:       '🏎️'
};

window.skinImages = {};
window.skinNames.forEach(name => {
  const img = new Image();
  img.src = `skins/${name}.png`;
  img.onload = () => console.log(`✅ Скин загружен: ${name}`);
  img.onerror = () => console.warn(`⚠️ Скин НЕ загружен: ${name}.png`);
  window.skinImages[name] = img;
});

window.foodImages = {};
['berry', 'banana', 'carrot', 'meat', 'cactus'].forEach(name => {
  const img = new Image();
  img.src = `skins/food/${name}.png`;
  img.onload = () => console.log(`✅ Еда загружена: ${name}`);
  img.onerror = () => console.warn(`⚠️ Еда НЕ загружена: ${name}.png`);
  window.foodImages[name] = img;
});

// ═══════════════════════════════════════════════════════════
//  ОТРИСОВКА ЖИВОТНОГО
// ═══════════════════════════════════════════════════════════

function drawSkin(ctx, x, y, size, level, angle) {
  let skinName;
  if (level === 'santa') skinName = 'santa';
  else {
    const idx = Math.min(Math.max((level | 0) - 1, 0), 16);
    skinName = window.skinNames[idx];
  }

  ctx.save();
  ctx.fillStyle = 'rgba(0, 0, 0, 0.28)';
  ctx.beginPath();
  ctx.ellipse(x, y + size * 0.3, size * 0.38, size * 0.13, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  const img = window.skinImages[skinName];
  if (img && img.complete && img.naturalWidth > 0) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate((angle || 0) - Math.PI / 2);
    const aspect = img.naturalWidth / img.naturalHeight;
    let drawW, drawH;
    if (aspect > 1) { drawW = size; drawH = size / aspect; }
    else { drawH = size; drawW = size * aspect; }
    ctx.drawImage(img, -drawW / 2, -drawH / 2, drawW, drawH);
    ctx.restore();
  } else {
    ctx.save();
    ctx.translate(x, y);
    ctx.font = `${size * 0.9}px serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(window.SKIN_EMOJI[skinName] || '🐾', 0, 0);
    ctx.restore();
  }
}

window.drawSkin = drawSkin;

// ═══════════════════════════════════════════════════════════
//  🏎️ LAMBO — админ-скин
// ═══════════════════════════════════════════════════════════

window.drawLambo = function(ctx, x, y, size, angle) {
  // Тень
  ctx.save();
  ctx.fillStyle = 'rgba(0, 0, 0, 0.28)';
  ctx.beginPath();
  ctx.ellipse(x, y + size * 0.3, size * 0.35, size * 0.12, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  ctx.save();
  ctx.translate(x, y);
  ctx.rotate((angle || 0) - Math.PI / 2);
  const s = size * 1.4;

  // Кузов
  ctx.fillStyle = '#e8e8e8';
  ctx.beginPath();
  ctx.moveTo(-s * 0.35, -s * 0.55);
  ctx.lineTo(s * 0.35, -s * 0.55);
  ctx.lineTo(s * 0.42, -s * 0.15);
  ctx.lineTo(s * 0.42, s * 0.4);
  ctx.lineTo(s * 0.3, s * 0.6);
  ctx.lineTo(-s * 0.3, s * 0.6);
  ctx.lineTo(-s * 0.42, s * 0.4);
  ctx.lineTo(-s * 0.42, -s * 0.15);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = '#555';
  ctx.lineWidth = s * 0.025;
  ctx.stroke();

  // Капот
  ctx.fillStyle = '#f4f4f4';
  ctx.beginPath();
  ctx.moveTo(-s * 0.32, -s * 0.55);
  ctx.lineTo(s * 0.32, -s * 0.55);
  ctx.lineTo(s * 0.38, -s * 0.2);
  ctx.lineTo(-s * 0.38, -s * 0.2);
  ctx.closePath();
  ctx.fill();

  // Лобовое стекло
  ctx.fillStyle = '#1a1a2e';
  ctx.beginPath();
  ctx.moveTo(-s * 0.3, -s * 0.18);
  ctx.lineTo(s * 0.3, -s * 0.18);
  ctx.lineTo(s * 0.28, s * 0.02);
  ctx.lineTo(-s * 0.28, s * 0.02);
  ctx.closePath();
  ctx.fill();

  // Крыша
  ctx.fillStyle = '#d0d0d0';
  ctx.fillRect(-s * 0.28, s * 0.02, s * 0.56, s * 0.15);

  // Заднее стекло
  ctx.fillStyle = '#1a1a2e';
  ctx.beginPath();
  ctx.moveTo(-s * 0.28, s * 0.17);
  ctx.lineTo(s * 0.28, s * 0.17);
  ctx.lineTo(s * 0.32, s * 0.4);
  ctx.lineTo(-s * 0.32, s * 0.4);
  ctx.closePath();
  ctx.fill();

  // Зеркала
  ctx.fillStyle = '#888';
  ctx.beginPath(); ctx.arc(-s * 0.4, -s * 0.1, s * 0.05, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(s * 0.4, -s * 0.1, s * 0.05, 0, Math.PI * 2); ctx.fill();

  // Фары
  ctx.fillStyle = '#ffe08a';
  ctx.beginPath(); ctx.arc(-s * 0.25, -s * 0.52, s * 0.07, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(s * 0.25, -s * 0.52, s * 0.07, 0, Math.PI * 2); ctx.fill();

  // Задние фары
  ctx.fillStyle = '#ff3333';
  ctx.beginPath(); ctx.arc(-s * 0.25, s * 0.57, s * 0.06, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(s * 0.25, s * 0.57, s * 0.06, 0, Math.PI * 2); ctx.fill();

  ctx.restore();
};

// ═══════════════════════════════════════════════════════════
//  ЕДА
// ═══════════════════════════════════════════════════════════

window.drawFood = function(ctx, x, y, r, f) {
  ctx.save();
  ctx.fillStyle = 'rgba(0,0,0,0.22)';
  ctx.beginPath();
  ctx.ellipse(x, y + r * 0.5, r * 0.6, r * 0.2, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(f.angle || 0);

  const img = window.foodImages[f.sprite];
  if (img && img.complete && img.naturalWidth > 0) {
    const aspect = img.naturalWidth / img.naturalHeight;
    let w, h;
    if (aspect > 1) { w = r * 2.4; h = w / aspect; }
    else { h = r * 2.4; w = h * aspect; }
    ctx.drawImage(img, -w / 2, -h / 2, w, h);
  } else {
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fillStyle = f.color || '#888';
    ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.4)';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    if (f.emoji) {
      ctx.save();
      ctx.rotate(-(f.angle || 0));
      ctx.font = `${r * 1.1}px serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(f.emoji, 0, 1);
      ctx.restore();
    }
  }
  ctx.restore();
};