---
description: Crea un git worktree en .worktrees/ a partir del argumento
---

Crea un worktree de git ejecutando exactamente este comando:

git worktree add .worktrees/<nombre>

El argumento recibido es: $ARGUMENTS

Reglas:
- Deriva <nombre> a partir del argumento, normalizado a kebab-case:
  minúsculas, sin espacios (usa guiones), sin acentos ni caracteres especiales.
  Ejemplo: "Fix Colisión Bug" → fix-colision-bug
- Si no se recibió argumento, pide al usuario el nombre antes de continuar.
- No hagas nada más: no cambies de directorio, no hagas commit, no edites
  archivos, no ejecutes ningún otro comando.
- Ejecuta el comando desde el directorio actual (raíz del proyecto).
- Si el argumento es muy largo, simplificalo a un nombre significativo.
