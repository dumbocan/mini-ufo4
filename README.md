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
   Por favor, asume el rol de mi asistente de ingeniería de ingeniería de software para este proyecto. Estoy listo para continuar desarrollando nuevas funcionalidades o depurar cualquier problema que surja.

   **Próximos Pasos / Funcionalidades a Desarrollar:**
   - **Explorador de Archivos y Gestión Multi-Archivo en Frontend:** Extender la interfaz web para incluir un explorador de archivos que permita visualizar, seleccionar y editar múltiples archivos dentro de un proyecto generado por el agente, similar a un IDE web (como Replit). Esto permitirá trabajar en proyectos más complejos directamente desde la interfaz.

   ¿En qué podemos trabajar ahora?
   ```