import os
import shutil
from typing import List, Optional, Tuple, Dict
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import json
from datetime import datetime
import asyncio
import sys
from fastapi.responses import StreamingResponse, HTMLResponse, FileResponse, Response
import re
import importlib.util

router = APIRouter()

PROJECTS_DIR = "generated_projects"

# Ensure the projects directory exists
if not os.path.exists(PROJECTS_DIR):
    os.makedirs(PROJECTS_DIR)

class Project(BaseModel):
    id: str
    name: str
    created_at: datetime

class ProjectContent(BaseModel):
    prompt: str
    code: str
    console_output: str

def _get_file_tree(path: str, root_path: str):
    """Devuelve el árbol de archivos con IDs relativos al directorio raíz.
    Esto permite que el frontend extraiga el project_id desde el ID
    (por ejemplo: "session-2025-09-08T12-00-00/prompt.txt").
    """
    tree = []
    for item in os.listdir(path):
        item_path = os.path.join(path, item)
        rel_path = os.path.relpath(item_path, root_path)
        rel_path = rel_path.replace(os.sep, "/")  # Normalizar a separador '/'

        if os.path.isdir(item_path):
            tree.append({
                "id": rel_path,
                "name": item,
                "type": "directory",
                "children": _get_file_tree(item_path, root_path)
            })
        else:
            # Only include relevant project files (extend to common web assets)
            if item in [
                "prompt.txt", "code.py", "console_output.txt", "metadata.json",
                "index.html", "styles.css", "script.js"
            ]:
                tree.append({
                    "id": rel_path,
                    "name": item,
                    "type": "file"
                })
    return tree

@router.get("/tree", response_model=List[dict])
async def get_project_tree():
    """Get the file tree structure of generated projects."""
    return _get_file_tree(PROJECTS_DIR, PROJECTS_DIR)

@router.get("/", response_model=List[Project])
async def list_projects():
    """List all available projects."""
    projects = []
    for project_id in os.listdir(PROJECTS_DIR):
        project_path = os.path.join(PROJECTS_DIR, project_id)
        if os.path.isdir(project_path):
            try:
                with open(os.path.join(project_path, "metadata.json"), "r") as f:
                    metadata = json.load(f)
                projects.append(Project(id=project_id, name=metadata.get("name", project_id), created_at=datetime.fromisoformat(metadata["created_at"]))) # type: ignore
            except (FileNotFoundError, json.JSONDecodeError, KeyError):
                # If metadata is missing or malformed, still list the project but with default values
                projects.append(Project(id=project_id, name=project_id, created_at=datetime.now()))
    return projects

@router.get("/{project_id}", response_model=ProjectContent)
async def get_project(project_id: str):
    """Get the content of a specific project."""
    project_path = os.path.join(PROJECTS_DIR, project_id)
    if not os.path.isdir(project_path):
        raise HTTPException(status_code=404, detail="Project not found")

    try:
        with open(os.path.join(project_path, "prompt.txt"), "r") as f:
            prompt = f.read()
        # Prefer HTML if present; else fall back to code.py
        code_file = os.path.join(project_path, "index.html")
        if os.path.isfile(code_file):
            with open(code_file, "r") as f:
                code = f.read()
        else:
            with open(os.path.join(project_path, "code.py"), "r") as f:
                code = f.read()
        with open(os.path.join(project_path, "console_output.txt"), "r") as f:
            console_output = f.read()
    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=f"Project content missing: {e}")
    
    return ProjectContent(prompt=prompt, code=code, console_output=console_output)

def _extract_heredoc_files(source: str) -> Tuple[Dict[str, str], str]:
    """Extrae bloques de tipo heredoc estilo shell:
    cat > filename << 'EOF'\n...\nEOF
    Devuelve un dict {filename: contenido} y el resto del texto sin esos bloques.
    Soporta comillas opcionales y delimitadores alfanuméricos.
    """
    pattern = re.compile(
        r"cat\s*>\s*(?P<fn>[^\s]+)\s*<<\s*['\"]?(?P<delim>[A-Za-z0-9_]+)['\"]?\s*\n(?P<body>.*?)(?:\n)?(?P=delim)\s*",
        re.DOTALL,
    )
    files: Dict[str, str] = {}
    out_parts: List[str] = []
    idx = 0
    while True:
        m = pattern.search(source, idx)
        if not m:
            out_parts.append(source[idx:])
            break
        # Append text before match as remainder
        out_parts.append(source[idx:m.start()])
        fn = m.group('fn')
        body = m.group('body')
        # Normalize filename: prevent path traversal
        fn = os.path.basename(fn)
        files[fn] = body
        idx = m.end()
    remainder = ''.join(out_parts)
    return files, remainder


@router.post("/", response_model=Project)
async def create_project(content: ProjectContent, project_name: Optional[str] = None):
    """Create a new project from the current session content."""
    timestamp = datetime.now().isoformat(timespec='seconds').replace(':', '-')
    if project_name:
        project_id = f"{project_name.replace(' ', '-')}-{timestamp}"
    else:
        project_id = f"session-{timestamp}"
    
    project_path = os.path.join(PROJECTS_DIR, project_id)
    os.makedirs(project_path, exist_ok=True)

    with open(os.path.join(project_path, "prompt.txt"), "w") as f:
        f.write(content.prompt)
    # Intentar extraer archivos desde bloques heredoc tipo "cat > file << 'EOF'...EOF"
    extracted_files, remainder = _extract_heredoc_files(content.code)

    # Si se extrajeron archivos, guardarlos
    if extracted_files:
        for name, body in extracted_files.items():
            safe_name = os.path.basename(name)
            # Solo permitimos escribir en el directorio del proyecto (no subdirectorios)
            dest = os.path.join(project_path, safe_name)
            try:
                with open(dest, "w", encoding="utf-8") as f:
                    f.write(body)
            except Exception as e:
                # Si hay un error al escribir, lo ignoramos para no romper el guardado del proyecto completo
                pass

    # Heurística: si parece HTML puro (o ya se extrajo index.html), guardar index.html
    index_path = os.path.join(project_path, "index.html")
    wrote_index = False
    if os.path.isfile(index_path):
        wrote_index = True
    else:
        is_html = "<html" in content.code.lower() or "<!doctype" in content.code.lower()
        if is_html and not extracted_files:
            with open(index_path, "w", encoding="utf-8") as f:
                f.write(content.code)
            wrote_index = True

    # Guardar code.py con el resto no-heredoc (si existe); si está vacío y hay index.html, dejar code.py como copia del HTML para el editor
    code_to_save = remainder.strip() if extracted_files else content.code
    if not code_to_save.strip() and wrote_index:
        try:
            with open(index_path, "r", encoding="utf-8") as f:
                code_to_save = f.read()
        except Exception:
            code_to_save = content.code

    with open(os.path.join(project_path, "code.py"), "w", encoding="utf-8") as f:
        f.write(code_to_save)
    with open(os.path.join(project_path, "console_output.txt"), "w") as f:
        f.write(content.console_output)
    
    metadata = {
        "name": project_name if project_name else project_id,
        "created_at": datetime.now().isoformat()
    }
    with open(os.path.join(project_path, "metadata.json"), "w") as f:
        json.dump(metadata, f, indent=2)

    return Project(id=project_id, name=metadata["name"], created_at=datetime.fromisoformat(metadata["created_at"])) # type: ignore

@router.delete("/{project_id}")
async def delete_project(project_id: str):
    """Delete a project by its ID."""
    project_path = os.path.join(PROJECTS_DIR, project_id)
    if not os.path.isdir(project_path):
        raise HTTPException(status_code=404, detail="Project not found")
    
    try:
        shutil.rmtree(project_path)
    except Exception as e:
        # It's good practice to log the error
        # logger.error(f"Error deleting project '{project_id}': {e}")
        raise HTTPException(status_code=500, detail=f"Internal server error: {e}")
    return {"message": f"Project '{project_id}' deleted successfully", "project_id": project_id}


EXECUTION_TIMEOUT_SECONDS = 120

@router.post("/{project_id}/execute")
async def execute_project(project_id: str):
    """Execute saved code.py for a project and stream its stdout/stderr as text/plain.
    Runs inside the backend container with an execution timeout for safety.
    """
    project_path = os.path.join(PROJECTS_DIR, project_id)
    code_path = os.path.join(project_path, "code.py")
    if not os.path.isdir(project_path):
        raise HTTPException(status_code=404, detail="Project not found")
    if not os.path.isfile(code_path):
        raise HTTPException(status_code=404, detail="code.py not found")

    async def streamer():
        try:
            # Read and sanitize code, detect inline 'pip install' directives
            with open(code_path, "r", encoding="utf-8", errors="replace") as f:
                raw_code = f.read()

            # Find inline pip install directives (e.g., 'pip install pandas numpy')
            pkg_matches = re.findall(r"(?i)(?:^|\s)(?:python\s+-m\s+)?pip\s+install\s+([^\n;#]+)", raw_code)
            packages: list[str] = []
            for m in pkg_matches:
                parts = [p.strip() for p in m.split() if p.strip() and not p.startswith('-')]
                packages.extend(parts)

            # Remove pip install directives from code, ensuring a newline where they were
            sanitized_code = re.sub(r"(?im)^[ \t]*!?(?:python\s+-m\s+)?pip\s+install[^\n]*\n?", "\n", raw_code)
            sanitized_code = re.sub(r"(?i)(?:python\s+-m\s+)?pip\s+install[^\n]*", "\n", sanitized_code)

            # Write sanitized code to a temporary file in project directory
            sanitized_path = os.path.join(project_path, "__sanitized__.py")
            with open(sanitized_path, "w", encoding="utf-8") as f:
                f.write(sanitized_code)

            start = asyncio.get_event_loop().time()

            # Additionally, detect missing imports and prepare to install them
            try:
                import ast
                tree = ast.parse(sanitized_code)
                import_names: set[str] = set()
                for node in ast.walk(tree):
                    if isinstance(node, ast.Import):
                        for alias in node.names:
                            if alias.name:
                                import_names.add(alias.name.split('.')[0])
                    elif isinstance(node, ast.ImportFrom):
                        if node.module:
                            import_names.add(node.module.split('.')[0])
                # Map import name to pip name where they differ
                pip_name_map = {
                    'sklearn': 'scikit-learn',
                    'cv2': 'opencv-python',
                    'yaml': 'pyyaml',
                    'PIL': 'Pillow',
                    'bs4': 'beautifulsoup4',
                    'Crypto': 'pycryptodome',
                }
                missing: list[str] = []
                for mod in sorted(import_names):
                    # Skip obvious stdlib modules quickly
                    if mod in {'sys','os','re','json','math','time','datetime','itertools','functools','subprocess','typing','pathlib','statistics','random','string','traceback','collections'}:
                        continue
                    if importlib.util.find_spec(mod) is None:
                        missing.append(pip_name_map.get(mod, mod))
            except Exception:
                missing = []

            # Union of explicitly requested packages and missing imports
            to_install = []
            if packages:
                to_install.extend(packages)
            for pkg in missing:
                if pkg not in to_install:
                    to_install.append(pkg)

            # If packages to install, install them with pip using the same Python
            if to_install:
                yield "[Preparing environment] pip install: " + " ".join(packages) + "\n"
                pip_proc = await asyncio.create_subprocess_exec(
                    sys.executable,
                    "-m",
                    "pip",
                    "install",
                    *to_install,
                    cwd=project_path,
                    stdout=asyncio.subprocess.PIPE,
                    stderr=asyncio.subprocess.STDOUT,
                )
                while True:
                    try:
                        chunk = await asyncio.wait_for(pip_proc.stdout.read(1024), timeout=1.0)  # type: ignore
                    except asyncio.TimeoutError:
                        chunk = b""
                    if chunk:
                        try:
                            yield chunk.decode("utf-8", errors="replace")
                        except Exception:
                            yield "\n"
                    if pip_proc.returncode is not None:
                        remainder = await pip_proc.stdout.read()  # type: ignore
                        if remainder:
                            yield remainder.decode("utf-8", errors="replace")
                        break
                    if asyncio.get_event_loop().time() - start > EXECUTION_TIMEOUT_SECONDS:
                        try:
                            pip_proc.kill()
                        except Exception:
                            pass
                        yield "\n[Preparation timed out]\n"
                        return

            # Now execute the sanitized code
            proc = await asyncio.create_subprocess_exec(
                sys.executable,
                "__sanitized__.py",
                cwd=project_path,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.STDOUT,
                env={
                    "PYTHONUNBUFFERED": "1",
                },
            )

            decoder = None
            while True:
                # Lee en trozos con pequeño timeout para poder chequear el límite global
                try:
                    chunk = await asyncio.wait_for(proc.stdout.read(1024), timeout=1.0)  # type: ignore
                except asyncio.TimeoutError:
                    chunk = b""

                if chunk:
                    # Evita problemas de decodificación parcial
                    if decoder is None:
                        import codecs
                        decoder = codecs.getincrementaldecoder("utf-8")()
                    text = decoder.decode(chunk)
                    yield text

                # Terminado
                if proc.returncode is not None:
                    # Vacía cualquier resto en el buffer
                    remainder = await proc.stdout.read()  # type: ignore
                    if remainder:
                        if decoder is None:
                            import codecs
                            decoder = codecs.getincrementaldecoder("utf-8")()
                        yield decoder.decode(remainder)
                    break

                # Chequea timeout global
                if asyncio.get_event_loop().time() - start > EXECUTION_TIMEOUT_SECONDS:
                    try:
                        proc.kill()
                    except Exception:
                        pass
                    yield "\n[Execution timed out]\n"
                    break

            # Asegura que el proceso termine
            try:
                await asyncio.wait_for(proc.wait(), timeout=2)
            except Exception:
                pass
            finally:
                # Clean temp file
                try:
                    os.remove(sanitized_path)
                except Exception:
                    pass

        except Exception as e:
            yield f"[Execution error] {e}\n"

    return StreamingResponse(streamer(), media_type="text/plain; charset=utf-8")


@router.get("/{project_id}/run", response_class=HTMLResponse)
async def run_page(project_id: str):
    """Simple HTML page that streams execution output in a new tab."""
    project_path = os.path.join(PROJECTS_DIR, project_id)
    if not os.path.isdir(project_path):
        raise HTTPException(status_code=404, detail="Project not found")

    # Build the HTML without f-string interpolation to avoid brace escaping issues
    html = r"""
<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <title>Run Project: __PID__</title>
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <style>
    body { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; background: #111; color: #eee; margin: 0; }
    header { padding: 8px 12px; background: #222; border-bottom: 1px solid #333; display: flex; align-items: center; justify-content: space-between; }
    pre { margin: 0; padding: 12px; white-space: pre-wrap; word-wrap: break-word; }
    .btn { background:#2d6cdf; color:#fff; border:none; padding:8px 12px; border-radius:6px; cursor:pointer; }
    .btn:disabled { opacity:.6; cursor: not-allowed; }
  </style>
  <script>
    async function runProject() {
      const btn = document.getElementById('runbtn');
      const out = document.getElementById('out');
      btn.disabled = true;
      out.textContent = '';
      try {
        const resp = await fetch('/projects/__PID__/execute', { method: 'POST' });
        if (!resp.ok) {
          out.textContent = 'Error: ' + resp.status + ' ' + resp.statusText;
          btn.disabled = false;
          return;
        }
        const reader = resp.body.getReader();
        const decoder = new TextDecoder();
        while (true) {
          const r = await reader.read();
          if (r.done) break;
          out.textContent += decoder.decode(r.value);
          window.scrollTo(0, document.body.scrollHeight);
        }
      } catch (e) {
        out.textContent += '\n[Client error] ' + e;
      } finally {
        btn.disabled = false;
      }
    }
    window.addEventListener('load', runProject);
  </script>
</head>
<body>
  <header>
    <div>Running project: __PID__</div>
    <button id="runbtn" class="btn" onclick="runProject()">Run again</button>
  </header>
  <pre id="out">Starting...
</pre>
</body>
</html>
"""
    return HTMLResponse(content=html.replace("__PID__", project_id))


def _safe_join(base: str, *paths: str) -> str:
    # Join and ensure path is within base directory
    joined = os.path.abspath(os.path.join(base, *paths))
    base = os.path.abspath(base)
    if os.path.commonpath([joined, base]) != base:
        raise HTTPException(status_code=400, detail="Invalid path")
    return joined


@router.get("/{project_id}/files/{path:path}")
async def get_project_file(project_id: str, path: str):
    project_path = os.path.join(PROJECTS_DIR, project_id)
    if not os.path.isdir(project_path):
        raise HTTPException(status_code=404, detail="Project not found")
    full_path = _safe_join(project_path, path)
    if not os.path.isfile(full_path):
        raise HTTPException(status_code=404, detail="File not found")
    # Let Starlette guess content type
    return FileResponse(full_path)


@router.get("/{project_id}/preview", response_class=HTMLResponse)
async def preview_project(project_id: str):
    project_path = os.path.join(PROJECTS_DIR, project_id)
    index_file = os.path.join(project_path, "index.html")
    if not os.path.isdir(project_path):
        raise HTTPException(status_code=404, detail="Project not found")
    if not os.path.isfile(index_file):
        return HTMLResponse(
            content=f"<html><body style='font-family:monospace;background:#111;color:#eee;padding:16px'>"
                    f"<h3>No se encontró index.html en el proyecto {project_id}</h3>"
                    f"<p>Guarda tu HTML como <code>index.html</code> o pide al agente que genere una web con archivos.</p>"
                    f"<p><a style='color:#8ab4f8' href='/projects/{project_id}/run'>Ejecutar code.py</a></p>"
                    f"</body></html>",
            status_code=200,
        )

    try:
        with open(index_file, "r", encoding="utf-8", errors="replace") as f:
            html = f.read()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error reading index.html: {e}")

    # Inject <base> for relative assets
    base_tag = f"<base href=\"/projects/{project_id}/files/\">"
    if "<head" in html.lower():
        # Insert after <head>
        import re as _re
        def _insert_base(m):
            return m.group(0) + "\n  " + base_tag
        html = _re.sub(r"(?i)<head[^>]*>", _insert_base, html, count=1)
    else:
        html = base_tag + html

    return HTMLResponse(content=html)
