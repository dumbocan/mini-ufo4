# Changelog

Todas las novedades y cambios relevantes de Mini‑UFO4.

Formato inspirado en “Keep a Changelog”. Fechas en AAAA‑MM‑DD. Secciones: Added (añadido), Changed (cambiado), Fixed (corregido), Security (seguridad), Breaking (cambios rompientes).

## 2025-09-09 — Día 7

### Added
- Vista previa HTML del proyecto:
  - `GET /projects/{id}/preview` renderiza `index.html` con `<base href="/projects/{id}/files/">` para assets relativos. Ruta: `backend/routers/projects.py`.
  - `GET /projects/{id}/files/{path}` sirve CSS/JS/imagenes del proyecto con validación de path. Ruta: `backend/routers/projects.py`.
- Guardado de HTML: si el código parece HTML se guarda también como `index.html` (además de `code.py`) y se prioriza al cargar. Rutas: `backend/routers/projects.py` (POST/GET de proyecto).
- “Play” inteligente en frontend: si el editor contiene HTML abre Preview; si no, abre Run. Ruta: `frontend/src/App.js`.
- Flujo “Plan First” (planificar antes de implementar):
  - Backend WebSocket acepta intents: `{"intent":"plan","prompt":"..."}` y `{"intent":"implement","prompt":"...","plan":"..."}`. Ruta: `backend/main.py`.
  - UI: toggle “Plan first”, modal “Proposed Plan” y botón “Proceed”. Rutas: `frontend/src/App.js`, `frontend/src/HomeView.js`, `frontend/src/ProjectView.js`.

### Changed
- Al obtener un proyecto, si existe `index.html` se devuelve su contenido en el campo `code` (para edición/preview). Ruta: `backend/routers/projects.py`.

### Fixed
- Terminal saturada al volcar grandes blobs de texto: se añadió cola con backpressure y chunking; ya no se imprime el código completo en terminal (solo `[Code updated: N chars]`). Rutas: `frontend/src/App.js`, `frontend/src/Terminal.js`.
- Página Run: corregida la función JS y el HTML para evitar `Invalid or unexpected token` y asegurar streaming estable. Ruta: `backend/routers/projects.py`.

---

## 2025-09-08 — Día 6

### Added
- Endpoint de ejecución con streaming: `POST /projects/{id}/execute` corre `code.py` del proyecto con timeout global (120s) y devuelve salida en vivo. Ruta: `backend/routers/projects.py`.
- Página de ejecución: `GET /projects/{id}/run` abre una pestaña nueva que muestra la salida en vivo y permite “Run again”. Ruta: `backend/routers/projects.py`.
- Sanitización y dependencias automáticas antes de ejecutar:
  - Elimina líneas/fragmentos `pip install ...` del código.
  - Detecta paquetes a instalar (por líneas explícitas y por análisis de imports con AST) y los instala en el venv del contenedor (mapeos comunes: `sklearn→scikit-learn`, `cv2→opencv-python`, `PIL→Pillow`, `bs4→beautifulsoup4`, `Crypto→pycryptodome`). Ruta: `backend/routers/projects.py`.
- Script de prueba WS manual: `backend/manual_ws_test.py`.

### Changed
- IDs del árbol de archivos ahora son relativos (p. ej. `session-.../prompt.txt`) para permitir que el frontend resuelva `projectId`. Ruta: `backend/routers/projects.py`.
- `make docker-run` monta `generated_projects` como volumen para persistir fuera del contenedor. Ruta: `backend/Makefile`.

### Fixed
- Payload de estado WS: backend envía `type: "status"` con `content` (alineado con el frontend). Ruta: `backend/main.py`.
- Guardado manual desde frontend: el botón “Save Session” pasa `prompt`, `code` y el buffer de la terminal correctamente. Ruta: `frontend/src/ProjectView.js`.

### Security
- Ejecución bajo usuario no‑root en contenedor con límites de CPU/RAM (según `docker run` del Makefile) y timeout de ejecución.

