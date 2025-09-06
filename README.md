# Mini-UFO 4: Agente de Programación con Auto-Corrección (DeepSeek + Open Interpreter)

**Descripción del Proyecto:**
Mini-UFO 4 es una aplicación web que actúa como un agente de programación inteligente. Permite a los usuarios describir una tarea en lenguaje natural (un "prompt"), y el agente genera el código necesario, lo ejecuta, y si encuentra errores, los depura y corrige de forma autónoma hasta que la tarea se completa con éxito. La aplicación está diseñada para ser segura, utilizando contenedores Docker para la ejecución del código, y ofrece una interfaz de usuario interactiva con retroalimentación en tiempo real.

**Características Clave:**
*   **Generación de Código:** Utiliza el modelo DeepSeek para generar código Python (extensible a otros lenguajes).
*   **Auto-Corrección:** El agente depura y corrige errores de forma iterativa basándose en la salida de la ejecución.
*   **Ejecución Segura:** Todo el código generado se ejecuta dentro de contenedores Docker aislados para proteger el sistema del usuario.
*   **Interfaz Web Interactiva:** Un frontend en React permite la interacción con el agente, mostrando el prompt, el código generado y una consola con la salida en tiempo real.
*   **Persistencia de Proyectos:** Cada sesión de desarrollo se guarda en una carpeta dedicada, incluyendo un log de la conversación para recuperar el contexto.
*   **Estilo de Programación:** El agente se esfuerza por generar código legible, bien comentado y siguiendo las mejores prácticas.

**Tecnologías Utilizadas:**
*   **Backend:** Python 3.11 con FastAPI.
*   **Motor de Agente/Ejecución:** `open-interpreter` (versión 0.4.0) para la orquestación del agente y la ejecución de código.
*   **Modelo de Lenguaje Grande (LLM):** DeepSeek (modelo `deepseek/deepseek-coder`).
*   **Contenedores:** Docker para el aislamiento del entorno de ejecución.
*   **Frontend:** React (JavaScript) con `react-bootstrap` para la interfaz de usuario.
*   **Comunicación:** WebSockets para la interacción en tiempo real entre frontend y backend.
*   **Control de Versiones:** Git.

**Cómo Abrir y Usar la Aplicación:**

**1. Abrir Gemini CLI:**
   Para iniciar una sesión con Gemini CLI, simplemente ejecuta el comando `gemini` en tu terminal. Si no lo tienes instalado, consulta la documentación oficial de Gemini CLI para su instalación.

**2. Comandos para Abrir la Aplicación Mini-UFO 4:**

   Asegúrate de tener Docker Desktop (o el servicio de Docker) corriendo en tu sistema.

   **Paso 1: Iniciar el Backend (en una terminal)**
   ```bash
   # Ve al directorio del backend
   cd /home/micasa/mini-ufo4/backend

   # Construye la imagen de Docker (solo la primera vez o si hay cambios en el Dockerfile/dependencias)
   docker build -t mini-ufo-backend .

   # Ejecuta el contenedor del backend
   docker run --rm -p 8000:8000 --name ufo-backend-container mini-ufo-backend
   ```
   Deja esta terminal abierta y corriendo.

   **Paso 2: Iniciar el Frontend (en una nueva terminal)**
   ```bash
   # Ve al directorio del frontend
   cd /home/micasa/mini-ufo4/frontend

   # Inicia la aplicación de React
   npm start
   ```
   Esto abrirá automáticamente la aplicación en tu navegador (normalmente en `http://localhost:3000`).

**3. Cómo Continuar el Proyecto en Otra Sesión de Gemini CLI:**

   Si necesitas retomar este proyecto en una nueva sesión de Gemini CLI, puedes usar el siguiente prompt. Este prompt le recordará a Gemini CLI todo el contexto importante del proyecto:

   ```
   Hola Gemini. Estoy retomando el proyecto "Mini-UFO 4" que construimos juntos.

   **Contexto del Proyecto:**
   - **Objetivo:** Crear un agente de programación web que genera, ejecuta y auto-corrige código (tipo Replit).
   - **Tecnologías Clave:**
     - Backend: Python 3.11 (FastAPI)
     - Frontend: React (JavaScript)
     - Motor de Agente: `open-interpreter` (versión 0.4.0)
     - Comunicación: WebSockets
     - Ejecución Segura: Docker (con `python:3.11-slim`, usuario no-root `appuser`, y `venv` interno para evitar PEP 668).
     - Modelo LLM: DeepSeek (`deepseek/deepseek-coder`).
     - Gestión de Clave API: `DEEPSEEK_API_KEY` se mapea a `OPENAI_API_KEY` en el entorno del contenedor.
   - **Estructura de Carpetas:**
     - `/home/micasa/mini-ufo4/` (raíz del proyecto)
     - `backend/` (código FastAPI, Dockerfile, requirements.txt)
     - `frontend/` (código React)
     - `generated_projects/` (para proyectos generados por el agente, con logs de contexto).
   - **Problemas Resueltos:**
     - `ModuleNotFoundError` con `open-interpreter`: Se resolvió usando un `Dockerfile` robusto (Python 3.11-slim, usuario no-root, venv interno) y corrigiendo el `import` de `open_interpreter` a `interpreter`.
     - Problemas de espacio en disco.
     - Errores de `litellm` por proveedor/modelo incorrecto (solucionado con `deepseek/deepseek-coder` y mapeo de `DEEPSEEK_API_KEY` a `OPENAI_API_KEY`).
     - Formato de salida de consola en el frontend: Se mejoró la legibilidad de los mensajes del agente y la salida de código/consola.

   **Mi forma de programar:**
   - Prefiero soluciones robustas y seguras (Docker, entornos aislados).
   - Me gusta la retroalimentación en tiempo real en la interfaz.
   - Valoro la legibilidad del código y la organización del proyecto.

   **Lo que te pido:**
   Por favor, asume el rol de mi asistente de ingeniería de software para este proyecto. Estoy listo para continuar desarrollando nuevas funcionalidades o depurar cualquier problema que surja. ¿En qué podemos trabajar ahora?
   ```

## mini-ufo4.2 — Resumen de la sesión de trabajo
Breve plan: revisar y estabilizar el backend WebSocket, corregir errores de configuración (variables de entorno y duplicados en `main.py`), probar localmente y en Docker, y dejar una lista clara de tareas para continuar.

Checklist (estado):
- Revisar e integrar imports y clases en `backend/main.py` — Hecho
- Eliminar duplicados y código fuera de lugar en `backend/main.py` — Hecho
- Añadir `ConnectionManager` y `heartbeat_check` — Hecho
- Corregir manejo del WebSocket (timeouts, heartbeats, streaming) — Hecho
- Corregir formato de `.env` que provocaba 401 — Hecho
- Construir imagen Docker y probar container — Hecho
- Ejecutar smoke test HTTP + WebSocket — Hecho

Qué desechamos / eliminamos (por claridad):
- Eliminamos definiciones duplicadas de `ConnectionManager` que causaban confusión y errores de estado.
- Quitamos código suelto/fragmentos fuera del bucle en `websocket_endpoint` que rompía la indentación y el flujo.
- Eliminamos una comilla extra en `backend/.env` que convertía la API key en inválida (causaba 401 en DeepSeek).

Qué implementamos y por qué (detalles técnicos):
- `ConnectionManager` (en `backend/main.py`): centraliza conexiones WebSocket, último heartbeat y envío de estados (`send_status`). Permite cerrar conexiones inactivas.
- `heartbeat_check()` (task en startup): revisa periódicamente `manager.active_connections` y cierra conexiones muertas; además envía pings/heartbeats.
- WebSocket handler (`/ws`): ahora acepta heartbeats JSON (tipo `{"type":"heartbeat"}`), actualiza timestamps, aplica timeouts para ejecución de tareas (`EXECUTION_TIMEOUT`) y stream de chunks desde `interpreter.chat(...)` hacia el cliente.
- `.env` corregido: `DEEPSEEK_API_KEY` sin comillas alrededor del valor (antes tenía una comilla final que hacía la key inválida).
- Docker: añadimos y usamos `backend/Dockerfile` para construir la imagen `mini-ufo4-backend` y ejecutar el contenedor mapeando el puerto 8000.

Comandos principales para reproducir (rápido):

1) Build y run con Docker (recomendado):
```bash
# desde la raíz del repo
docker build -t mini-ufo4-backend ./backend
docker run --rm -d --name mini-ufo4-backend -p 8000:8000 --env-file ./backend/.env mini-ufo4-backend
```

2) Probar endpoint raíz (host):
```bash
curl http://127.0.0.1:8000/
```

3) Probar WebSocket (cliente de prueba incluido):
- En `backend/` hay un script de prueba `test_ws_client.py` usado para validar heartbeats y prompts.
- Ejecutado con el Python del `venv` o con un Python que tenga `websockets`:
```bash
python backend/test_ws_client.py
```

Pruebas realizadas y resultados clave:
- `curl /` devolvió 200 OK con el mensaje de servicio activo.
- El cliente WebSocket envió un heartbeat y recibió confirmación (`{"type":"status","status":"connected"}`).
- Envío de prompt de prueba `print('hello from test')` produjo streaming de chunks desde el LLM y la ejecución del código dentro del entorno (se recibió `hello from test` en la consola del stream).
- Inicialmente el LLM devolvía 401; root cause: comilla extra en `backend/.env`. Tras corregir `.env` el servicio de generación y ejecución funcionó correctamente.

Tareas pendientes / para el día siguiente:
- Revisar y, si procede, aislar por sesión el `interpreter` (crear instancia por sesión/usuario) para evitar estado compartido entre conexiones.
- Añadir tests automáticos (unit + smoke) y un pequeño `Makefile` con comandos `build`, `run`, `test`.
- Reforzar seguridad y límites en ejecución de código (cgroup/timeout/recursos) si se va a exponer más ampliamente.
- Revisar el frontend para evitar bloqueos (el problema original de 'hang' puede necesitar ajustes en la reconexión WS y manejo de errores de stream).
- Añadir logging estructurado y rotación de logs para `backend` y `generated_projects`.
- Integrar CI simple que haga build Docker y ejecute el smoke test.

Notas operativas importantes:
- Archivo principal backend: `backend/main.py` (contiene la lógica WebSocket / interpreter).
- Variables sensibles: `backend/.env` (no subir claves a repositorio público).
- Imagen Docker creada en esta sesión: `mini-ufo4-backend` y el contenedor se lanzó mapeando `8000:8000`.

Si quieres, mañana puedo:
- Añadir un `Makefile` y tests automáticos.
- Hacer que el `interpreter` sea por sesión y añadir limpieza más agresiva al desconectar.
- Revisar el frontend para mejorar reconexiones y evitar bloqueos.

## mini-ufo4.3 — Resumen de la sesión de trabajo

En esta sesión, nos hemos centrado en mejorar la robustez, seguridad y experiencia de usuario de Mini-UFO 4. Hemos abordado varias tareas clave y resuelto problemas complejos, especialmente en el frontend.

**Logros Clave de la Sesión:**

*   **Aislamiento de Instancias de `interpreter` por Sesión:** Hemos refactorizado el backend para que cada conexión WebSocket tenga su propia instancia aislada de `open-interpreter`. Esto previene conflictos de estado entre usuarios concurrentes y mejora la estabilidad.
*   **Tests Automatizados y `Makefile`:** Hemos añadido `pytest` y `httpx` al backend, creado un "smoke test" para el endpoint principal y actualizado el `Makefile` con un comando `test` para ejecutarlo. Esto facilita la verificación continua del backend.
*   **Refuerzo de Seguridad (Límites de Recursos Docker):** Hemos configurado el comando `docker run` en el `Makefile` para aplicar límites de memoria (512MB) y CPU (1 núcleo) al contenedor del backend. Además, hemos habilitado el modo seguro experimental de `open-interpreter` para un análisis adicional del código generado.
*   **Mejoras en la Resiliencia del Frontend:**
    *   **Reconexión Automática:** El frontend ahora intenta reconectarse automáticamente al backend con un retardo exponencial si la conexión WebSocket se pierde.
    *   **Heartbeats del Cliente:** Se envían mensajes de "heartbeat" periódicos desde el frontend para mantener la conexión activa y evitar timeouts por inactividad.
    *   **Indicador de Estado de Conexión:** Se ha añadido un indicador visual en la UI para mostrar claramente el estado de la conexión (conectado/desconectado/reconectando).
*   **Gestión de Proyectos (`generated_projects`):**
    *   Hemos implementado endpoints API en el backend (`/projects`) para listar, cargar, guardar y eliminar sesiones de trabajo (prompt, código, salida de consola).
    *   Se han integrado botones y una lista en el frontend para interactuar con estas funcionalidades, permitiendo a los usuarios guardar y retomar su trabajo.
*   **Logging Estructurado en el Backend:** Hemos integrado `structlog` y `fastapi-structlog` para generar logs en formato JSON, lo que facilita el monitoreo y análisis de la aplicación en entornos de producción. Se ha configurado Uvicorn para que sus logs también sean estructurados.
*   **Integración Continua (CI) Simple:** Hemos creado un workflow básico de GitHub Actions que automatiza la construcción de la imagen Docker del backend y la ejecución de los tests con cada `push` a la rama `main`. Esto asegura que el proyecto se mantenga en un estado funcional y testeable.
*   **Resolución de Errores de Compilación/Runtime del Frontend:** Hemos dedicado un esfuerzo considerable a depurar y corregir errores de compilación y de tiempo de ejecución en el frontend, especialmente los relacionados con la integración de `xterm.js` y el manejo de cadenas de texto con caracteres de escape. Aunque ha sido un proceso iterativo, hemos logrado estabilizar el frontend.

**Tareas Pendientes / Próximos Pasos:**

Aunque hemos avanzado significativamente, aún quedan áreas para mejorar y expandir Mini-UFO 4:

*   **Mejora del Indicador de Progreso de Ejecución (Frontend):** Actualmente, el indicador de carga es general. Podríamos implementar un feedback más granular durante la ejecución del código (ej. mostrar la línea de código que se está ejecutando, o una barra de progreso más detallada).
*   **Configuración Dinámica del Modelo LLM (Frontend):** Permitir a los usuarios cambiar el modelo de lenguaje grande (LLM) y la clave API directamente desde la interfaz de usuario, en lugar de depender de variables de entorno.
*   **Opciones de Despliegue:** Crear configuraciones de despliegue más completas (ej. archivos Docker Compose para orquestar backend y frontend, o manifiestos de Kubernetes) para facilitar la puesta en producción de la aplicación.
*   **Tests Más Exhaustivos:** Aunque hemos añadido tests básicos, se podría expandir la cobertura con más tests unitarios y de integración para asegurar la robustez de todas las funcionalidades.
*   **Timeouts Más Robustos para la Ejecución de Código:** Investigar mecanismos más sofisticados para manejar los timeouts de ejecución de código, especialmente para procesos que puedan colgarse o consumir recursos excesivos, posiblemente integrando soluciones a nivel de Docker o del sistema operativo.
*   **Gestión de Proyectos - Mejoras de UI/UX:** La interfaz actual para guardar/cargar proyectos es funcional. Podríamos mejorarla con una vista más amigable, búsqueda, filtrado o previsualizaciones.

Estamos en un punto donde la aplicación es robusta y funcional. El siguiente paso dependerá de la dirección que quieras tomar: ¿más funcionalidades, más estabilidad, o preparación para el despliegue?

```
Hola Gemini. Estoy retomando el proyecto "Mini-UFO 4" que construimos juntos.

**Contexto del Proyecto:**
- **Objetivo:** Crear un agente de programación web que genera, ejecuta y auto-corrige código (tipo Replit).
- **Tecnologías Clave:**
  - Backend: Python 3.11 (FastAPI)
  - Frontend: React (JavaScript)
  - Motor de Agente: `open-interpreter` (versión 0.4.0)
  - Comunicación: WebSockets
  - Ejecución Segura: Docker (con `python:3.11-slim`, usuario no-root `appuser`, y `venv` interno para evitar PEP 668).
  - Modelo LLM: DeepSeek (`deepseek/deepseek-coder`).
  - Gestión de Clave API: `DEEPSEEK_API_KEY` se mapea a `OPENAI_API_KEY` en el entorno del contenedor.
- **Estructura de Carpetas:**
  - `/home/micasa/mini-ufo4/` (raíz del proyecto)
  - `backend/` (código FastAPI, Dockerfile, requirements.txt)
  - `frontend/` (código React)
  - `generated_projects/` (para proyectos generados por el agente, con logs de contexto).

**Problemas Resueltos (hasta ahora):**
- `ModuleNotFoundError` con `open-interpreter`: Se resolvió usando un `Dockerfile` robusto (Python 3.11-slim, usuario no-root, venv interno) y corrigiendo el `import` de `open_interpreter` a `interpreter`.
- Problemas de espacio en disco.
- Errores de `litellm` por proveedor/modelo incorrecto (solucionado con `deepseek/deepseek-coder` y mapeo de `DEEPSEEK_API_KEY` a `OPENAI_API_KEY`).
- Formato de salida de consola en el frontend: Se mejoró la legibilidad de los mensajes del agente y la salida de código/consola.
- Aislamiento de instancias de `interpreter` por sesión.
- Tests automatizados y `Makefile`.
- Refuerzo de seguridad con límites de recursos Docker y modo seguro de `open-interpreter`.
- Mejoras en la resiliencia del frontend (reconexión, heartbeats, indicador de estado).
- Gestión de proyectos (guardar/cargar/eliminar).
- Logging estructurado en el backend.
- Integración CI simple con GitHub Actions.
- **¡Importante!** Se han resuelto los errores de compilación y runtime del frontend relacionados con `xterm.js` y el manejo de cadenas de texto. El frontend ahora debería funcionar correctamente.
- **¡Novedad!** Se ha implementado un modo oscuro en el frontend.
- **¡Novedad!** Se ha realizado una limpieza exhaustiva de archivos y carpetas innecesarias en el proyecto.
- **¡Novedad!** Se han resuelto las advertencias de React en `App.js` y `Terminal.js`.
- **¡Novedad!** Se ha implementado el diseño de paneles de UI (Fase 1) con una barra lateral de proyectos y un área principal reestructurada.
- **¡Novedad!** Se ha implementado la visualización del árbol de archivos de proyectos en el frontend, con correcciones de enrutamiento en el backend.
- **¡Novedad!** Se ha corregido la persistencia de proyectos en disco mediante el montaje de volumen de Docker.

**Mi forma de programar:**
- Prefiero soluciones robustas y seguras (Docker, entornos aislados).
- Me gusta la retroalimentación en tiempo real en la interfaz.
- Valoro la legibilidad del código y la organización del proyecto.

**Lo que te pido:**
Por favor, asume el rol de mi asistente de ingeniería de software para este proyecto. Estamos en un excelente punto. Las próximas tareas prioritarias son:
1.  **Implementar la Funcionalidad de Reproducir/Eliminar en el Árbol de Archivos (Fase 2 del Árbol de Archivos):** Conectar los iconos de "play" y "papelera" en el árbol de archivos para que el botón de "play" ejecute el código del proyecto (enviando el prompt al agente) y el botón de "papelera" elimine el proyecto del disco.
2.  **Implementar la Pantalla de Salida Dedicada (Fase 2 del Rediseño de UI):** Crear el área grande y dedicada en la interfaz para mostrar la salida gráfica o la renderización de páginas web, como se discutió previamente. Esto implicará modificar el backend para enviar este tipo de salida y el frontend para renderizarla.

¿Estás listo para continuar con estas tareas?
```

## mini-ufo4.5 — Resumen de la sesión de trabajo (Día 5)

En esta sesión, nos hemos centrado en mejorar la interfaz de usuario del frontend y la persistencia de los proyectos.

**Logros Clave de la Sesión:**

*   **Resolución de Advertencias de React:**
    *   Se corrigieron las advertencias de `useEffect` relacionadas con dependencias faltantes en `App.js` (envolviendo `connectWebSocket` y `fetchProjectMetadata` en `useCallback`).
    *   Se resolvió la advertencia de `ref` en `Terminal.js` capturando el valor de `termRef.current` en una variable local para la función de limpieza.
*   **Implementación del Diseño de Paneles de UI (Fase 1):**
    *   Se reestructuró el layout de `App.js` para incluir una barra lateral izquierda dedicada a los proyectos, y un área principal dividida verticalmente para la entrada del prompt, el editor de código y la consola.
    *   Se añadió el CSS correspondiente en `App.css` para estilizar el nuevo diseño de paneles.
*   **Visualización del Árbol de Archivos de Proyectos (Fase 1 - Frontend y Backend API):**
    *   **Backend:** Se añadió un nuevo endpoint `GET /projects/tree` a `backend/routers/projects.py` para devolver la estructura jerárquica del directorio `generated_projects/`.
    *   **Backend - Corrección Crítica de Enrutamiento:** Se identificó y corrigió un problema de enrutamiento en FastAPI donde el endpoint `/projects/tree` era incorrectamente interpretado como un `project_id`. La solución fue reordenar las rutas en `backend/routers/projects.py` para que las rutas literales (como `/tree`) se definan antes que las rutas con parámetros (como `/{project_id}`).
    *   **Frontend:** Se creó un nuevo componente `frontend/src/FileTree.js` para renderizar de forma recursiva la estructura del árbol de archivos en la barra lateral izquierda.
    *   **Frontend:** Se modificó `frontend/src/App.js` para consumir el nuevo endpoint `/projects/tree`, almacenar los datos del árbol en un nuevo estado (`fileTreeData`), e integrar el componente `FileTree`.
    *   **Frontend - Corrección de Dependencia:** Se instaló la dependencia `react-icons` (`npm install react-icons`) que era necesaria para los iconos del árbol de archivos y estaba causando un error de "Module not found".
*   **Persistencia de Proyectos en Disco (Corrección de Docker):**
    *   Se identificó que los proyectos guardados no eran persistentes en el host debido a que el directorio `generated_projects` dentro del contenedor Docker no estaba montado en el sistema de archivos del host.
    *   **Solución:** Se modificó el comando `docker run` para incluir un montaje de volumen (`-v /home/micasa/mini-ufo4/backend/generated_projects:/home/appuser/app/generated_projects`) asegurando que los proyectos se guarden y persistan correctamente en el disco del host.

**Desafíos y Lecciones Aprendidas:**

*   **Depuración de Advertencias de React:** Aunque las advertencias de `useEffect` y `ref` no causaban fallos directos, su resolución mejora la robustez y mantenibilidad del código. La depuración requirió un análisis cuidadoso de las dependencias de los hooks.
*   **Errores de Enrutamiento en FastAPI:** El problema del 404 para `/projects/tree` fue un ejemplo clásico de cómo el orden de definición de rutas en frameworks web puede afectar el enrutamiento. Las rutas más específicas (literales) deben definirse antes que las rutas más generales (con parámetros de ruta) para evitar coincidencias incorrectas.
*   **Persistencia de Datos en Docker:** La falta de persistencia de los proyectos guardados resaltó la importancia fundamental de los montajes de volumen en Docker para asegurar que los datos generados dentro de un contenedor se almacenen de forma segura y accesible en el sistema de archivos del host. Este fue un error de configuración del entorno de ejecución más que un error de código.

**Estado Actual del Proyecto:**

La aplicación Mini-UFO 4 es ahora mucho más robusta y funcional. El frontend presenta un nuevo diseño de paneles y un árbol de archivos interactivo para la gestión de proyectos. El backend maneja correctamente el historial de conversación y la persistencia de proyectos en disco. Las advertencias de React han sido abordadas, mejorando la calidad del código.

**Próximos Pasos (Prioridades):**

1.  **Implementar la Funcionalidad de Reproducir/Eliminar en el Árbol de Archivos (Fase 2 del Árbol de Archivos):** Actualmente, los iconos de "play" y "papelera" en el árbol de archivos no tienen funcionalidad completa. Necesitamos implementar la lógica en el frontend para que el botón de "play" ejecute el código del proyecto (enviando el prompt al agente) y el botón de "papelera" elimine el proyecto del disco.
2.  **Implementar la Pantalla de Salida Dedicada (Fase 2 del Rediseño de UI):** Crear el área grande y dedicada en la interfaz para mostrar la salida gráfica o la renderización de páginas web, como se discutió previamente. Esto implicará modificar el backend para enviar este tipo de salida y el frontend para renderizarla.

**Prompt para la Siguiente Sesión:**

```
Hola Gemini. Estoy retomando el proyecto "Mini-UFO 4" que construimos juntos.

**Contexto del Proyecto:**
- **Objetivo:** Crear un agente de programación web que genera, ejecuta y auto-corrige código (tipo Replit).
- **Tecnologías Clave:**
  - Backend: Python 3.11 (FastAPI)
  - Frontend: React (JavaScript)
  - Motor de Agente: `open-interpreter` (versión 0.4.0)
  - Comunicación: WebSockets
  - Ejecución Segura: Docker (con `python:3.11-slim`, usuario no-root `appuser`, y `venv` interno para evitar PEP 668).
  - Modelo LLM: DeepSeek (`deepseek/deepseek-coder`).
  - Gestión de Clave API: `DEEPSEEK_API_KEY` se mapea a `OPENAI_API_KEY` en el entorno del contenedor.
- **Estructura de Carpetas:**
  - `/home/micasa/mini-ufo4/` (raíz del proyecto)
  - `backend/` (código FastAPI, Dockerfile, requirements.txt)
  - `frontend/` (código React)
  - `generated_projects/` (para proyectos generados por el agente, con logs de contexto).

**Problemas Resueltos (hasta ahora):**
- `ModuleNotFoundError` con `open-interpreter`: Se resolvió usando un `Dockerfile` robusto (Python 3.11-slim, usuario no-root, venv interno) y corrigiendo el `import` de `open_interpreter` a `interpreter`.
- Problemas de espacio en disco.
- Errores de `litellm` por proveedor/modelo incorrecto (solucionado con `deepseek/deepseek-coder` y mapeo de `DEEPSEEK_API_KEY` a `OPENAI_API_KEY`).
- Formato de salida de consola en el frontend: Se mejoró la legibilidad de los mensajes del agente y la salida de código/consola.
- Aislamiento de instancias de `interpreter` por sesión.
- Tests automatizados y `Makefile`.
- Refuerzo de seguridad con límites de recursos Docker y modo seguro de `open-interpreter`.
- Mejoras en la resiliencia del frontend (reconexión, heartbeats, indicador de estado).
- Gestión de proyectos (guardar/cargar/eliminar).
- Logging estructurado en el backend.
- Integración CI simple con GitHub Actions.
- **¡Importante!** Se han resuelto los errores de compilación y runtime del frontend relacionados con `xterm.js` y el manejo de cadenas de texto. El frontend ahora debería funcionar correctamente.
- **¡Novedad!** Se ha implementado un modo oscuro en el frontend.
- **¡Novedad!** Se ha realizado una limpieza exhaustiva de archivos y carpetas innecesarias en el proyecto.
- **¡Novedad!** Se han resuelto las advertencias de React en `App.js` y `Terminal.js`.
- **¡Novedad!** Se ha implementado el diseño de paneles de UI (Fase 1) con una barra lateral de proyectos y un área principal reestructurada.
- **¡Novedad!** Se ha implementado la visualización del árbol de archivos de proyectos en el frontend, con correcciones de enrutamiento en el backend.
- **¡Novedad!** Se ha corregido la persistencia de proyectos en disco mediante el montaje de volumen de Docker.

**Mi forma de programar:**
- Prefiero soluciones robustas y seguras (Docker, entornos aislados).
- Me gusta la retroalimentación en tiempo real en la interfaz.
- Valoro la legibilidad del código y la organización del proyecto.

**Lo que te pido:**
Por favor, asume el rol de mi asistente de ingeniería de software para este proyecto. Estamos en un excelente punto. Las próximas tareas prioritarias son:
1.  **Implementar la Funcionalidad de Reproducir/Eliminar en el Árbol de Archivos (Fase 2 del Árbol de Archivos):** Conectar los iconos de "play" y "papelera" en el árbol de archivos para que el botón de "play" ejecute el código del proyecto (enviando el prompt al agente) y el botón de "papelera" elimine el proyecto del disco.
2.  **Implementar la Pantalla de Salida Dedicada (Fase 2 del Rediseño de UI):** Crear el área grande y dedicada en la interfaz para mostrar la salida gráfica o la renderización de páginas web, como se discutió previamente. Esto implicará modificar el backend para enviar este tipo de salida y el frontend para renderizarla.

¿Estás listo para continuar con estas tareas?
```