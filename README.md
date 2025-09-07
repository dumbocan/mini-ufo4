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
   docker build -t mini-ufo4-backend .

   # Ejecuta el contenedor del backend
   docker run --rm -d --name mini-ufo4-backend -p 8000:8000 --env-file ./.env mini-ufo4-backend
   ```
   Deja esta terminal abierta y corriendo.

   **Paso 2: Iniciar el Frontend (en una nueva terminal)**
   ```bash
   # Ve al directorio del frontend
   cd /home/micasa/mini-ufo4/frontend

   # Instala las dependencias (solo la primera vez o si hay cambios en package.json)
   npm install

   # Inicia la aplicación de React
   npm start
   ```
   Esto abrirá automáticamente la aplicación en tu navegador (normalmente en `http://localhost:3000`).

---

## Resumen de la Sesión de Trabajo Actual

En esta sesión, nos hemos centrado en refinar la interfaz de usuario del frontend, mejorar la carga y persistencia de proyectos, y corregir errores en el backend relacionados con la estructura del árbol de archivos.

**Logros Clave de la Sesión:**

### Frontend (React)
*   **Rediseño de UI (Vistas Home/Proyecto):**
    *   Implementada una página de inicio "tipo ChatGPT" con un campo de prompt central y una lista de proyectos recientes.
    *   Creada una vista de proyecto dedicada con el árbol de archivos, editor de código y terminal.
    *   Añadido un botón "Home" en la esquina superior izquierda de la vista de proyecto para regresar a la página de inicio.
*   **Mejoras en la Barra Superior:**
    *   Simplificada la barra superior para incluir solo el botón "Home" (en vista de proyecto) y el nombre del proyecto.
    *   Implementado un menú desplegable en la barra superior que contiene:
        *   Indicador de estado de conexión del backend (punto de color y texto).
        *   Selector de tema (modo claro/oscuro).
    *   Ajustado el estilo del botón del menú (padding más pequeño, centrado).
    *   Asegurado que el fondo del menú desplegable coincida con el tema oscuro.
    *   Añadida una línea separadora gris debajo de la barra superior.
*   **Carga y Persistencia de Proyectos:**
    *   Corregido el problema por el cual el contenido del proyecto (prompt, código, consola) no se cargaba al seleccionar un proyecto desde la página principal.
    *   Implementada la carga automática del proyecto más reciente al iniciar la aplicación.
*   **Componente `FileTree`:**
    *   Actualizado `FileTree.js` para usar las props `onOpen`, `onRun` y `onDelete` para mayor consistencia.
*   **Gestión de Dependencias y Limpieza:**
    *   Instalada la dependencia `react-bootstrap-icons`.
    *   Solucionado el problema de importación de `xterm.css` cambiando a una ruta relativa.
    *   Limpiadas las advertencias `no-unused-vars` en `App.js`.

### Backend (FastAPI)
*   **Endpoint del Árbol de Archivos (`/projects/tree`):**
    *   Modificada la función `_get_file_tree` para devolver el árbol de archivos en el formato solicitado (`id` con ruta relativa completa, `type` como `dir` o `file`).
    *   Corregido un `TypeError` en la llamada recursiva de `_get_file_tree` pasando correctamente el argumento `root_path`.
*   **Gestión de Proyectos:**
    *   Corregida una línea duplicada en la función `delete_project`.

### Docker
*   Proporcionados comandos `docker build` y `docker run` actualizados, incluyendo el montaje de volumen para la persistencia de proyectos.
*   Aclarado el proceso de detener, eliminar, reconstruir y ejecutar contenedores Docker.

---

## Tareas Pendientes / Próximos Pasos

1.  **Implementar la Funcionalidad de Reproducir/Eliminar en el Árbol de Archivos (Fase 2 del Árbol de Archivos):** Conectar los iconos de "play" y "papelera" en el árbol de archivos para que el botón de "play" ejecute el código del proyecto (enviando el prompt al agente) y el botón de "papelera" elimine el proyecto del disco.
2.  **Implementar la Pantalla de Salida Dedicada (Fase 2 del Rediseño de UI):** Crear el área grande y dedicada en la interfaz para mostrar la salida gráfica o la renderización de páginas web, como se discutió previamente. Esto implicará modificar el backend para enviar este tipo de salida y el frontend para renderizarla.

---

## Prompt para la Siguiente Sesión

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
- Tests automatizados y `Makefile` (básicos).
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
- **¡Novedad!** Se ha implementado una página de inicio "tipo ChatGPT" con un campo de prompt central y una lista de proyectos recientes.
- **¡Novedad!** Se ha creado una vista de proyecto dedicada con el árbol de archivos, editor de código y terminal.
- **¡Novedad!** Se ha añadido un botón "Home" en la esquina superior izquierda de la vista de proyecto para regresar a la página de inicio.
- **¡Novedad!** Se ha simplificado la barra superior para incluir solo el botón "Home" (en vista de proyecto) y el nombre del proyecto.
- **¡Novedad!** Se ha implementado un menú desplegable en la barra superior que contiene el indicador de estado de conexión del backend (punto de color y texto) y el selector de tema (modo claro/oscuro).
- **¡Novedad!** Se ha ajustado el estilo del botón del menú (padding más pequeño, centrado) y asegurado que el fondo del menú desplegable coincida con el tema oscuro.
- **¡Novedad!** Se ha añadido una línea separadora gris debajo de la barra superior.
- **¡Novedad!** Se ha corregido el problema por el cual el contenido del proyecto (prompt, código, consola) no se cargaba al seleccionar un proyecto desde la página principal.
- **¡Novedad!** Se ha implementado la carga automática del proyecto más reciente al iniciar la aplicación.
- **¡Novedad!** Se ha actualizado `FileTree.js` para usar las props `onOpen`, `onRun` y `onDelete` para mayor consistencia.
- **¡Novedad!** Se ha solucionado el problema de importación de `xterm.css` cambiando a una ruta relativa.
- **¡Novedad!** Se han limpiado las advertencias `no-unused-vars` en `App.js`.
- **¡Novedad!** Se ha modificado la función `_get_file_tree` en el backend para devolver el árbol de archivos en el formato solicitado y se ha corregido un `TypeError` en su llamada recursiva.
- **¡Novedad!** Se ha corregido una línea duplicada en la función `delete_project` del backend.
- **¡Novedad!** Se han proporcionado comandos `docker build` y `docker run` actualizados, incluyendo el montaje de volumen para la persistencia de proyectos.

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