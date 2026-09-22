'use strict';

const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const W = 800;
const H = 600;

// ── Input ─────────────────────────────────────────────────────────────────────
const keys = {};
const justPressed = {};

window.addEventListener('keydown', e => {
  justPressed[e.code] = !keys[e.code];
  keys[e.code] = true;
  if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code))
    e.preventDefault();
});
window.addEventListener('keyup', e => { keys[e.code] = false; });

function pressed(code) {
  const val = justPressed[code];
  justPressed[code] = false;
  return val;
}

// ── Utils ─────────────────────────────────────────────────────────────────────
const wrap  = (v, max) => ((v % max) + max) % max;
const dist  = (a, b)   => Math.hypot(a.x - b.x, a.y - b.y);
const rand  = (min, max) => min + Math.random() * (max - min);
const randInt = (min, max) => Math.floor(rand(min, max + 1));

// Traza sobre ctx un polígono cerrado a partir de una lista de [x, y]
function tracePoly(pts) {
  ctx.beginPath();
  ctx.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
  ctx.closePath();
}

// ── Skins ─────────────────────────────────────────────────────────────────────
// Apariencias de la nave. Cada skin define el color de trazo, el color y el
// ancla de la llama (tail, x trasera) y una lista de trazados cerrados
// (arrays de [x, y]; el primero es el casco, el resto son detalles).
// Todos encajan en el radio de colisión (12) y apuntan la nariz a ~20 px.
const SKINS = [
  {
    id: 'clasica', name: 'CLÁSICA', color: '#fff',
    flame: 'rgba(255, 130, 0, 0.85)', tail: -8,
    paths: [
      [[20, 0], [-12, -9], [-7, 0], [-12, 9]],  // triángulo con muesca trasera
    ],
  },
  {
    id: 'dardo', name: 'DARDO', color: '#ff5c5c',
    flame: 'rgba(255, 200, 0, 0.85)', tail: -13,
    paths: [
      [[22, 0], [-8, -5], [-15, 0], [-8, 5]],   // flecha fina
    ],
  },
  {
    id: 'halcon', name: 'HALCÓN', color: '#ffd54a',
    flame: 'rgba(255, 120, 0, 0.85)', tail: -14,
    paths: [
      [[14, 0], [6, -8], [-10, -11], [-14, -5], [-14, 5], [-10, 11], [6, 8]],  // cuerpo ancho
      [[8, 0], [2, -3], [-4, -3], [-4, 3], [2, 3]],                            // cabina
    ],
  },
  {
    id: 'neon', name: 'NEÓN', color: '#0ff',
    flame: 'rgba(0, 255, 255, 0.7)', tail: -8,
    paths: [
      [[18, 0], [-13, -10], [-8, 0], [-13, 10]],  // contorno exterior
      [[12, 0], [-8, -6], [-5, 0], [-8, 6]],      // doble trazo interior
    ],
  },
  {
    id: 'colmena', name: 'COLMENA', color: '#9dff57',
    flame: 'rgba(120, 255, 80, 0.85)', tail: -16,
    paths: [
      [[20, -5], [6, -13], [-11, -8], [-16, 0], [-11, 8], [6, 13], [20, 5]],  // casco hexagonal
      [[0, -11], [0, 11]],                                                    // línea dorsal
    ],
  },
];

// Skin elegida, recordada entre sesiones (localStorage puede fallar en
// navegadores privados: por eso los try/catch)
const SKIN_KEY = 'asteroids.skin';

function loadSkinIndex() {
  try {
    const i = SKINS.findIndex(s => s.id === localStorage.getItem(SKIN_KEY));
    return i >= 0 ? i : 0;
  } catch { return 0; }
}

function saveSkinIndex(i) {
  try { localStorage.setItem(SKIN_KEY, SKINS[i].id); } catch {}
}

let skinIndex = loadSkinIndex();

function cycleSkin(dir) {
  skinIndex = (skinIndex + dir + SKINS.length) % SKINS.length;
  saveSkinIndex(skinIndex);
}

// ── Bullet ────────────────────────────────────────────────────────────────────
class Bullet {
  constructor(x, y, angle) {
    this.x = x;
    this.y = y;
    const SPEED = 520;
    this.vx = Math.cos(angle) * SPEED;
    this.vy = Math.sin(angle) * SPEED;
    this.ttl  = 1.1;
    this.radius = 2;
    this.dead = false;
  }

  update(dt) {
    this.x = wrap(this.x + this.vx * dt, W);
    this.y = wrap(this.y + this.vy * dt, H);
    this.ttl -= dt;
    if (this.ttl <= 0) this.dead = true;
  }

  draw() {
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fill();
  }
}

// ── Asteroid ──────────────────────────────────────────────────────────────────
const RADII  = [0, 16, 30, 50];   // por tamaño 1, 2, 3
const SPEEDS = [0, 85, 55, 32];   // velocidad base por tamaño
const POINTS = [0, 100, 50, 20];  // puntos por tamaño

class Asteroid {
  constructor(x, y, size = 3) {
    this.x    = x;
    this.y    = y;
    this.size = size;
    this.radius = RADII[size];
    this.dead = false;

    const angle = rand(0, Math.PI * 2);
    const speed = SPEEDS[size] + rand(-15, 15);
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed;
    this.rotSpeed = rand(-1.2, 1.2);
    this.rot = rand(0, Math.PI * 2);

    // Polígono irregular
    const n = randInt(8, 13);
    this.verts = [];
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      const r = this.radius * rand(0.6, 1.0);
      this.verts.push([Math.cos(a) * r, Math.sin(a) * r]);
    }

    this.points = POINTS[size];
    this.color  = '#fff';
  }

  update(dt) {
    this.x   = wrap(this.x + this.vx * dt, W);
    this.y   = wrap(this.y + this.vy * dt, H);
    this.rot += this.rotSpeed * dt;
  }

  split() {
    if (this.size <= 1) return [];
    return [
      new Asteroid(this.x, this.y, this.size - 1),
      new Asteroid(this.x, this.y, this.size - 1),
    ];
  }

  draw() {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.rot);
    ctx.strokeStyle = this.color;
    ctx.lineWidth   = 1.5;
    ctx.lineJoin    = 'round';
    ctx.beginPath();
    ctx.moveTo(this.verts[0][0], this.verts[0][1]);
    for (let i = 1; i < this.verts.length; i++)
      ctx.lineTo(this.verts[i][0], this.verts[i][1]);
    ctx.closePath();
    ctx.stroke();
    ctx.restore();
  }
}

// ── Estrella fugaz ────────────────────────────────────────────────────────────
class ShootingStar extends Asteroid {
  constructor() {
    // Aparece en un borde aleatorio apuntando al centro de la pantalla
    const side = randInt(0, 3);
    let x, y;
    switch (side) {
      case 0: x = rand(0, W); y = -30;    break; // arriba
      case 1: x = W + 30;    y = rand(0, H); break; // derecha
      case 2: x = rand(0, W); y = H + 30;    break; // abajo
      case 3: x = -30;        y = rand(0, H); break; // izquierda
    }
    super(x, y, 1);

    this.radius = 13;
    this.points = 500;
    this.ttl    = 8;
    this.color  = '#ffd54a';

    const speed = rand(280, 340);
    const targetX = rand(W * 0.25, W * 0.75);
    const targetY = rand(H * 0.25, H * 0.75);
    const angle = Math.atan2(targetY - y, targetX - x);
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed;

    // Estrella de 5 puntas (radios alternos r y r * 0.45)
    const spikes = 5;
    const inner  = this.radius * 0.45;
    this.verts = [];
    for (let i = 0; i < spikes * 2; i++) {
      const a = (i / (spikes * 2)) * Math.PI * 2 - Math.PI / 2;
      const r = i % 2 === 0 ? this.radius : inner;
      this.verts.push([Math.cos(a) * r, Math.sin(a) * r]);
    }
  }

  update(dt) {
    super.update(dt);
    this.ttl -= dt;
    if (this.ttl <= 0) this.dead = true;
  }

  split() { return []; }
}

// ── Ship ──────────────────────────────────────────────────────────────────────
class Ship {
  constructor() { this.reset(); }

  reset() {
    this.x      = W / 2;
    this.y      = H / 2;
    this.angle  = -Math.PI / 2;
    this.vx     = 0;
    this.vy     = 0;
    this.radius = 12;
    this.thrusting     = false;
    this.invincible    = 3;
    this.shootCooldown = 0;
    this.speedBoost    = 0;
    this.tripleShot    = 0;
    this.shield        = 0;
    this.dead          = false;
  }

  update(dt) {
    if (this.dead) return;
    if (this.invincible    > 0) this.invincible    -= dt;
    if (this.shootCooldown > 0) this.shootCooldown -= dt;
    if (this.speedBoost    > 0) this.speedBoost    -= dt;
    if (this.tripleShot    > 0) this.tripleShot    -= dt;
    if (this.shield        > 0) this.shield        -= dt;

    const ROT   = 3.5;   // rad/s
    const THRUST = 260 * (this.speedBoost > 0 ? 2 : 1);  // px/s²
    const DRAG   = 0.987;

    if (keys['ArrowLeft'])  this.angle -= ROT * dt;
    if (keys['ArrowRight']) this.angle += ROT * dt;

    this.thrusting = !!keys['ArrowUp'];
    if (this.thrusting) {
      this.vx += Math.cos(this.angle) * THRUST * dt;
      this.vy += Math.sin(this.angle) * THRUST * dt;
    }

    this.vx *= DRAG;
    this.vy *= DRAG;
    this.x = wrap(this.x + this.vx * dt, W);
    this.y = wrap(this.y + this.vy * dt, H);
  }

  tryShoot() {
    if (this.shootCooldown > 0 || this.dead) return [];
    this.shootCooldown = 0.2;
    const NOSE = 21;
    const ox = this.x + Math.cos(this.angle) * NOSE;
    const oy = this.y + Math.sin(this.angle) * NOSE;
    // Triple disparo: 3 balas paralelas en línea recta (offset perpendicular)
    if (this.tripleShot > 0) {
      const px = -Math.sin(this.angle) * 8;
      const py =  Math.cos(this.angle) * 8;
      return [
        new Bullet(ox - px, oy - py, this.angle),
        new Bullet(ox,      oy,      this.angle),
        new Bullet(ox + px, oy + py, this.angle),
      ];
    }
    return [new Bullet(ox, oy, this.angle)];
  }

  draw() {
    if (this.dead) return;
    // Parpadeo durante invencibilidad de reaparición
    if (this.invincible > 0 && Math.floor(this.invincible * 8) % 2 === 0) return;

    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.angle);
    ctx.strokeStyle = SKINS[skinIndex].color;
    ctx.lineWidth   = 1.5;
    ctx.lineJoin    = 'round';

    // Casco y detalles del skin activo
    for (const pts of SKINS[skinIndex].paths) {
      tracePoly(pts);
      ctx.stroke();
    }

    // Llama del propulsor
    if (this.thrusting && Math.random() > 0.35) {
      const tail = SKINS[skinIndex].tail;
      ctx.beginPath();
      ctx.moveTo(tail, -4);
      ctx.lineTo(tail - rand(6, 14), 0);
      ctx.lineTo(tail,  4);
      ctx.strokeStyle = SKINS[skinIndex].flame;
      ctx.stroke();
    }

    // Escudo activo: anillo pulsante (parpadea cuando queda poco tiempo)
    if (this.shield > 0) {
      const blink = this.shield < 3 && Math.floor(this.shield * 8) % 2 === 0;
      ctx.globalAlpha = blink ? 0.15 : 0.45 + 0.4 * (0.5 + 0.5 * Math.sin(this.shield * 6));
      ctx.beginPath();
      ctx.arc(0, 0, 18, 0, Math.PI * 2);
      ctx.strokeStyle = '#0f0';
      ctx.lineWidth   = 1.5;
      ctx.stroke();
      ctx.globalAlpha = 1;
    }

    ctx.restore();
  }
}

// ── Partículas (explosión) ────────────────────────────────────────────────────
class Particle {
  constructor(x, y) {
    this.x  = x;
    this.y  = y;
    const angle = rand(0, Math.PI * 2);
    const speed = rand(30, 130);
    this.vx   = Math.cos(angle) * speed;
    this.vy   = Math.sin(angle) * speed;
    this.life = rand(0.4, 1.1);
    this.ttl  = this.life;
    this.dead = false;
  }

  update(dt) {
    this.x  += this.vx * dt;
    this.y  += this.vy * dt;
    this.ttl -= dt;
    if (this.ttl <= 0) this.dead = true;
  }

  draw() {
    const alpha = this.ttl / this.life;
    ctx.strokeStyle = `rgba(255,255,255,${alpha.toFixed(2)})`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(this.x, this.y);
    ctx.lineTo(this.x - this.vx * 0.05, this.y - this.vy * 0.05);
    ctx.stroke();
  }
}

// ── Power-up ──────────────────────────────────────────────────────────────────
class PowerUp {
  constructor(x, y, type = 'speed') {
    this.x = x;
    this.y = y;
    this.type = type;
    const angle = rand(0, Math.PI * 2);
    const speed = 40;
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed;
    this.radius = 10;
    this.ttl  = 10;
    this.dead = false;
  }

  update(dt) {
    this.x = wrap(this.x + this.vx * dt, W);
    this.y = wrap(this.y + this.vy * dt, H);
    this.ttl -= dt;
    if (this.ttl <= 0) this.dead = true;
  }

  draw() {
    // Parpadeo cuando le quedan menos de 3 segundos
    if (this.ttl < 3 && Math.floor(this.ttl * 8) % 2 === 0) return;
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.lineWidth = 1.8;
    ctx.lineJoin  = 'round';
    if (this.type === 'triple') {
      // Triple disparo: tres barras paralelas ‖‖‖
      ctx.strokeStyle = '#f0f';
      ctx.beginPath();
      for (const dx of [-5, 0, 5]) {
        ctx.moveTo(dx, -6);
        ctx.lineTo(dx,  6);
      }
      ctx.stroke();
    } else if (this.type === 'shield') {
      // Escudo: anillo protector
      ctx.strokeStyle = '#0f0';
      ctx.beginPath();
      ctx.arc(0, 0, 7, 0, Math.PI * 2);
      ctx.stroke();
    } else {
      // Velocidad: doble chevron » apuntando a la derecha
      ctx.strokeStyle = '#0ff';
      ctx.fillStyle   = '#0ff';
      ctx.beginPath();
      ctx.moveTo(-6, -6);
      ctx.lineTo(-2,  0);
      ctx.lineTo(-6,  6);
      ctx.moveTo( 0, -6);
      ctx.lineTo( 4,  0);
      ctx.lineTo( 0,  6);
      ctx.stroke();
    }
    ctx.restore();
  }
}

// ── Estado del juego ──────────────────────────────────────────────────────────
let ship, bullets, asteroids, particles, powerups;
let score, lives, level;
let state;      // 'menu' | 'playing' | 'dead' | 'gameover'
let deadTimer;
let starTimer;  // temporizador para la próxima estrella fugaz
let menuAngle = 0;  // rotación de la nave de muestra en el menú

function spawnAsteroids(count) {
  const SAFE_DIST = 130;
  for (let i = 0; i < count; i++) {
    let x, y;
    do {
      x = rand(0, W);
      y = rand(0, H);
    } while (Math.hypot(x - W / 2, y - H / 2) < SAFE_DIST);
    asteroids.push(new Asteroid(x, y, 3));
  }
}

function initGame() {
  ship      = new Ship();
  bullets   = [];
  asteroids = [];
  particles = [];
  powerups  = [];
  score  = 0;
  lives  = 3;
  level  = 1;
  state  = 'playing';
  starTimer = rand(8, 15);
  spawnAsteroids(4);
}

function nextLevel() {
  level++;
  bullets   = [];
  asteroids = [];
  particles = [];
  powerups  = [];
  ship.reset();
  spawnAsteroids(3 + level);
}

function explode(x, y, count = 8) {
  for (let i = 0; i < count; i++) particles.push(new Particle(x, y));
}

function killShip() {
  explode(ship.x, ship.y, 14);
  ship.dead = true;
  lives--;
  if (lives <= 0) {
    state = 'gameover';
  } else {
    state     = 'dead';
    deadTimer = 2;
  }
}

// ── Update ────────────────────────────────────────────────────────────────────
function update(dt) {
  // Menú de selección de skin
  if (state === 'menu') {
    menuAngle += dt * 0.8;
    if (pressed('ArrowLeft'))  cycleSkin(-1);
    if (pressed('ArrowRight')) cycleSkin(1);
    if (pressed('Space')) initGame();
    return;
  }

  if (state === 'gameover') {
    if (pressed('Space')) initGame();
    if (pressed('Enter')) state = 'menu';
    particles.forEach(p => p.update(dt));
    particles = particles.filter(p => !p.dead);
    return;
  }

  if (state === 'dead') {
    deadTimer -= dt;
    particles.forEach(p => p.update(dt));
    particles = particles.filter(p => !p.dead);
    asteroids.forEach(a => a.update(dt));
    powerups.forEach(p => p.update(dt));
    powerups  = powerups.filter(p => !p.dead);
    if (deadTimer <= 0) { state = 'playing'; ship.reset(); }
    return;
  }

  // Disparar
  if (pressed('Space')) {
    bullets.push(...ship.tryShoot());
  }

  ship.update(dt);
  bullets.forEach(b => b.update(dt));
  asteroids.forEach(a => a.update(dt));
  particles.forEach(p => p.update(dt));

  bullets   = bullets.filter(b => !b.dead);
  particles = particles.filter(p => !p.dead);

  // Bala vs asteroide
  const newAsteroids = [];
  for (const b of bullets) {
    for (const a of asteroids) {
      if (!a.dead && !b.dead && dist(b, a) < a.radius) {
        b.dead = true;
        a.dead = true;
        score += a.points;
        const burstCount = a instanceof ShootingStar ? 12 : a.size * 5;
        explode(a.x, a.y, burstCount);
        newAsteroids.push(...a.split());
        // 12% de probabilidad de soltar power-up (velocidad, triple o escudo)
        if (Math.random() < 0.12)
          powerups.push(new PowerUp(a.x, a.y, ['speed', 'triple', 'shield'][randInt(0, 2)]));
      }
    }
  }
  asteroids = asteroids.filter(a => !a.dead).concat(newAsteroids);
  bullets   = bullets.filter(b => !b.dead);

  // Power-ups: actualizar y colisión con la nave
  powerups.forEach(p => p.update(dt));
  powerups = powerups.filter(p => !p.dead);
  for (const p of powerups) {
    if (!p.dead && !ship.dead && dist(ship, p) < ship.radius + p.radius) {
      if (p.type === 'triple')      ship.tripleShot = 5;
      else if (p.type === 'shield') ship.shield     = 8;
      else                          ship.speedBoost = 5;
      p.dead = true;
      explode(p.x, p.y, 6);
    }
  }

  // Nave vs asteroide
  if (ship.invincible <= 0) {
    for (const a of asteroids) {
      if (dist(ship, a) < ship.radius + a.radius * 0.82) {
        // El escudo absorbe el impacto: destruye el asteroide (sin puntos)
        if (ship.shield > 0) {
          ship.shield     = 0;
          ship.invincible = 1.5;
          a.dead = true;
          explode(a.x, a.y, a instanceof ShootingStar ? 12 : a.size * 5);
        } else {
          killShip();
        }
        break;
      }
    }
  }

  // Spawn periódico de estrella fugaz (máx. 1 en pantalla)
  starTimer -= dt;
  if (starTimer <= 0) {
    if (!asteroids.some(a => a instanceof ShootingStar)) {
      asteroids.push(new ShootingStar());
      starTimer = rand(8, 15);
    } else {
      starTimer = 1;
    }
  }

  // Nivel completado (ignoramos las estrellas fugaces)
  if (asteroids.filter(a => !(a instanceof ShootingStar)).length === 0) nextLevel();
}

// ── Draw ──────────────────────────────────────────────────────────────────────
function drawLifeIcon(x, y) {
  const skin = SKINS[skinIndex];
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(-Math.PI / 2);
  ctx.scale(0.45, 0.45);
  ctx.strokeStyle = skin.color;
  ctx.lineWidth   = 2.7;   // 2.7 · 0.45 ≈ 1.2 px en pantalla
  ctx.lineJoin    = 'round';
  tracePoly(skin.paths[0]);   // solo el casco: los detalles no se leen a este tamaño
  ctx.stroke();
  ctx.restore();
}

function drawHUD() {
  ctx.fillStyle = '#fff';
  ctx.font = '15px monospace';

  ctx.textAlign = 'left';
  ctx.fillText(`SCORE  ${score}`, 14, 26);

  ctx.textAlign = 'center';
  ctx.fillText(`NIVEL ${level}`, W / 2, 26);

  for (let i = 0; i < lives; i++)
    drawLifeIcon(W - 16 - i * 22, 18);

  // Indicadores de power-ups activos
  if (ship && ship.speedBoost > 0) {
    ctx.fillStyle = '#0ff';
    ctx.font      = '13px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(`VELOCIDAD ${ship.speedBoost.toFixed(1)}s`, W / 2, 46);
  }
  if (ship && ship.tripleShot > 0) {
    ctx.fillStyle = '#f0f';
    ctx.font      = '13px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(`TRIPLE ${ship.tripleShot.toFixed(1)}s`, W / 2, 64);
  }
  if (ship && ship.shield > 0) {
    ctx.fillStyle = '#0f0';
    ctx.font      = '13px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(`ESCUDO ${ship.shield.toFixed(1)}s`, W / 2, 82);
  }
}

function drawOverlay(title, sub) {
  ctx.textAlign   = 'center';
  ctx.fillStyle   = '#fff';
  ctx.font        = 'bold 46px monospace';
  ctx.fillText(title, W / 2, H / 2 - 18);
  ctx.font        = '18px monospace';
  ctx.fillStyle   = 'rgba(255,255,255,0.65)';
  ctx.fillText(sub, W / 2, H / 2 + 22);
}

function drawMenu() {
  const skin = SKINS[skinIndex];

  // Nave de muestra girando lentamente, con llama pulsante
  ctx.save();
  ctx.translate(W / 2, H / 2 - 40);
  ctx.rotate(menuAngle);
  ctx.scale(1.6, 1.6);
  ctx.strokeStyle = skin.color;
  ctx.lineWidth   = 1.5;
  ctx.lineJoin    = 'round';
  for (const pts of skin.paths) {
    tracePoly(pts);
    ctx.stroke();
  }
  ctx.beginPath();
  ctx.moveTo(skin.tail, -4);
  ctx.lineTo(skin.tail - 10 - Math.sin(menuAngle * 5) * 4, 0);
  ctx.lineTo(skin.tail,  4);
  ctx.strokeStyle = skin.flame;
  ctx.stroke();
  ctx.restore();

  ctx.textAlign = 'center';
  ctx.fillStyle = '#fff';
  ctx.font      = 'bold 38px monospace';
  ctx.fillText('ELIGE TU NAVE', W / 2, 140);

  ctx.fillStyle = skin.color;
  ctx.font      = 'bold 22px monospace';
  ctx.fillText(`${skin.name}   ${skinIndex + 1}/${SKINS.length}`, W / 2, H - 140);

  ctx.fillStyle = 'rgba(255,255,255,0.65)';
  ctx.font      = '17px monospace';
  ctx.fillText('←/→ CAMBIAR   ·   ESPACIO PARA JUGAR', W / 2, H - 100);
}

function draw() {
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, W, H);

  if (state === 'menu') {
    drawMenu();
    return;
  }

  particles.forEach(p => p.draw());
  asteroids.forEach(a => a.draw());
  powerups.forEach(p => p.draw());
  bullets.forEach(b => b.draw());
  ship.draw();

  drawHUD();

  if (state === 'gameover')
    drawOverlay('GAME OVER', `PUNTAJE: ${score}   —   ESPACIO REINICIAR · ENTER MENÚ`);
}

// ── Loop principal ────────────────────────────────────────────────────────────
let lastTime = null;

function loop(ts) {
  const dt = lastTime === null ? 0 : Math.min((ts - lastTime) / 1000, 0.05);
  lastTime = ts;
  update(dt);
  draw();
  requestAnimationFrame(loop);
}

state = 'menu';
requestAnimationFrame(loop);
