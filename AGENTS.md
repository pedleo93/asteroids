# AGENTS.md

Vanilla JavaScript Asteroids clone. No dependencies, no build step, no tests, no linter, no CI — do not assume `npm`/`npx` scripts exist.

## Running / verifying

- Open `index.html` directly in a browser (`file://` works; `game.js` is a classic script, not a module), or `npx serve .` → `http://localhost:3000`.
- There is no automated verification; changes must be tested manually in the browser.

## Architecture

- All game logic lives in `game.js` (single file, by design). `index.html` only hosts the canvas and loads the script.
- Canvas size is hardcoded in two places that must stay in sync: the `<canvas width height>` attributes in `index.html` and the `W`/`H` constants in `game.js`. The game never reads the canvas element's size.
- Entities (`Ship`, `Asteroid`, `Bullet`, `Particle`) share an `update(dt)` / `draw()` pattern driven by a `requestAnimationFrame` loop; `dt` is clamped to 0.05 s.
- The world is toroidal: positions go through `wrap(v, max)` — use it for anything that moves.
- Held keys read `keys[code]`; one-shot input uses `pressed(code)` (edge detection via `justPressed`).
- Game state machine: module-level `state` var with `'menu' | 'playing' | 'dead' | 'gameover'`. The game boots into `'menu'` (skin selection); `initGame()` is only called when the player presses Space there.
- Ship skins live in the `// ── Skins ──` section: each is `{ id, name, color, flame, tail, paths }`, plus optional `scale` (multiplies drawn size, collision radius 12·scale and nose 21·scale; e.g. `titan` uses `scale: 2`) and optional `scoreMultiplier` (multiplies all points scored while flying it), where `paths` are closed polygons around the origin (first one is the hull; also drawn scaled down for the HUD life icons). All skins must fit their collision radius (12·scale) and nose (~21·scale px, where bullets spawn). The chosen skin persists via `localStorage`.
- Code is organized with `// ── Section ──` banner comments; follow that layout when adding sections.

## Conventions

- Comments, UI strings (HUD, overlays), and the README are in **Spanish**; identifiers are in English. Keep new comments/UI text in Spanish.
- ES6+ (`'use strict'`, classes, arrow functions), single quotes, 2-space indent.

## Known doc drift

- `README.md` uses the plural "power-ups especiales" in the description, but currently only the "Velocidad" power-up exists in the code. The "estrella fugaz" (shooting star) now exists. Trust `game.js` over the README for anything else.
