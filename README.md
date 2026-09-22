# Asteroids

Clon del clásico arcade **Asteroids** implementado en canvas HTML5 puro, sin dependencias ni bundler.

## Descripción

Nave espacial en un campo de asteroides con envolvimiento de bordes (el espacio es toroidal). Destruye asteroides para sumar puntos: los grandes se parten en medianos, los medianos en pequeños. Incluye power-ups especiales y tipos de asteroides únicos como la estrella fugaz.

## Tecnologías

- **HTML5 Canvas** — renderizado 2D
- **JavaScript (ES6+)** — lógica del juego en un solo archivo `game.js`
- Sin frameworks, sin bundler, sin dependencias

## Cómo correr

Abre `index.html` directamente en el navegador (doble clic), o usa un servidor local:

```bash
npx serve .
```

Luego visita `http://localhost:3000`.

## Controles

| Tecla     | Acción     |
| --------- | ---------- |
| `←` `→`   | Rotar nave |
| `↑`       | Propulsar  |
| `Espacio` | Disparar   |

En la pantalla de inicio, `←` `→` cambian de nave y `Espacio` comienza la partida. Tras un game over, `Enter` vuelve a la pantalla de selección.

## Puntuación

| Asteroide       | Puntos |
| --------------- | ------ |
| Grande          | 20     |
| Mediano         | 50     |
| Pequeño         | 100    |
| Estrella fugaz  | 500    |

## Características

- 3 vidas con invencibilidad temporal al reaparecer (parpadeo)
- Asteroides se parten en fragmentos más pequeños al ser destruidos
- Partículas de explosión al destruir asteroides
- Power-up "Velocidad" (drop aleatorio de asteroides): duplica empuje y velocidad máxima por 5 s
- Power-up "Triple disparo" (drop aleatorio de asteroides): cada disparo emite 3 balas paralelas en línea recta por 5 s
- Power-up "Escudo" (drop aleatorio de asteroides): anillo protector de 8 s que absorbe un impacto
- Estrella fugaz: asteroide dorado, rápido y de puntos bonus que aparece periódicamente y desaparece con el tiempo
- Sistema de skins: elige entre 5 naves (Clásica, Dardo, Halcón, Neón y Colmena) en la pantalla inicial; tu elección se recuerda entre sesiones
