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
- Game state machine: module-level `state` var with `'playing' | 'dead' | 'gameover'`.
- Code is organized with `// ── Section ──` banner comments; follow that layout when adding sections.

## Conventions

- Comments, UI strings (HUD, overlays), and the README are in **Spanish**; identifiers are in English. Keep new comments/UI text in Spanish.
- ES6+ (`'use strict'`, classes, arrow functions), single quotes, 2-space indent.

## Known doc drift

- `README.md` claims power-ups and an "estrella fugaz" (shooting star) asteroid type — neither exists in the code. Trust `game.js` over the README.
