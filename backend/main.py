import os
import json
import asyncio
import logging
from datetime import datetime
from typing import Optional, Dict, List
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, status
from fastapi.middleware.cors import CORSMiddleware
from interpreter import OpenInterpreter
from dotenv import load_dotenv
from asgi_correlation_id import CorrelationIdMiddleware
from fastapi_structlog.middleware import StructlogMiddleware
from routers import projects # Import the new router

# Configure logging
logging.basicConfig(level=logging.DEBUG)
logging.getLogger("uvicorn.access").disabled = True

logger = logging.getLogger(__name__)

# Load environment variables from .env file
load_dotenv()


def _validate_and_normalize_env():
    """Valida y normaliza variables de entorno críticas.
    - Comprueba que DEEPSEEK_API_KEY exista y no tenga comillas alrededor.
    - Si encuentra comillas las elimina automáticamente y avisa por stdout.
    - Si OPENAI_API_KEY no está definida la rellena con DEEPSEEK_API_KEY.
    """
    key = os.getenv("DEEPSEEK_API_KEY")
    if not key:
        logger.warning("DEEPSEEK_API_KEY not defined. LLM calls will fail without it.")
        return

    # Detectar y eliminar comillas envolventes accidentales
    if (key.startswith("'") and key.endswith("'")) or (key.startswith('"') and key.endswith('"')):
        cleaned = key[1:-1]
        os.environ["DEEPSEEK_API_KEY"] = cleaned
        logger.warning("DEEPSEEK_API_KEY contained quotes; they have been removed automatically.")

    # Asegurar compatibilidad con librerías que usan OPENAI_API_KEY
    if os.getenv("DEEPSEEK_API_KEY") and not os.getenv("OPENAI_API_KEY"):
        os.environ["OPENAI_API_KEY"] = os.environ["DEEPSEEK_API_KEY"]


_validate_and_normalize_env()

# Constants
HEARTBEAT_INTERVAL = 30  # seconds
EXECUTION_TIMEOUT = 300  # seconds  # 5 minutes máximo por tarea

class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[WebSocket, Dict] = {}

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        
        # Create a new interpreter instance for this session
        session_interpreter = OpenInterpreter()
        session_interpreter.llm.model = "deepseek/deepseek-coder"
        session_interpreter.llm.api_key = os.getenv("DEEPSEEK_API_KEY")
        session_interpreter.llm.api_base = os.getenv("OPENAI_API_BASE")
        session_interpreter.auto_run = True
        session_interpreter.disable_telemetry = True
        session_interpreter.safe_mode = "auto"

        self.active_connections[websocket] = {
            "last_heartbeat": datetime.now(),
            "interpreter": session_interpreter
        }
        logger.info("New client connected, interpreter instance created.", extra={"client": websocket.client})

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            # Clean up the interpreter instance
            session_interpreter = self.active_connections[websocket].get("interpreter")
            if session_interpreter:
                session_interpreter.reset()
                logger.info("Interpreter state reset for disconnected client.", extra={"client": websocket.client})
            del self.active_connections[websocket]

    async def send_status(self, websocket: WebSocket, status: str, message: str):
        """Envía un mensaje de estado al cliente"""
        try:
            await websocket.send_json({
                "type": "status",
                "status": status,
                "message": message
            })
        except Exception as e:
            logger.error("Error sending status", extra={"error": str(e), "client": websocket.client})

    async def check_connections(self):
        """Verifica y cierra conexiones inactivas"""
        now = datetime.now()
        for ws in list(self.active_connections.keys()):
            last_heartbeat = self.active_connections[ws]["last_heartbeat"]
            if (now - last_heartbeat).seconds > HEARTBEAT_INTERVAL * 2:
                try:
                    await self.send_status(ws, "timeout", "Conexión inactiva")
                    await ws.close()
                except Exception:
                    pass
                self.disconnect(ws)

app = FastAPI()
app.add_middleware(CorrelationIdMiddleware)
app.add_middleware(StructlogMiddleware)

app.include_router(projects.router, prefix="/projects", tags=["projects"])

manager = ConnectionManager()

origins = [
    "http://localhost:3000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)



async def heartbeat_check():
    """Tarea en segundo plano para verificar la salud de las conexiones"""
    while True:
        await asyncio.sleep(HEARTBEAT_INTERVAL)
        current_time = datetime.now()
        for ws in list(manager.active_connections.keys()):
            try:
                if (current_time - manager.active_connections[ws]["last_heartbeat"]).seconds > HEARTBEAT_INTERVAL * 2:
                    await manager.send_status(ws, "timeout", "Conexión expirada")
                    await ws.close()
                    manager.disconnect(ws)
                else:
                    await ws.send_text(json.dumps({"type": "heartbeat"}))
            except Exception:
                manager.disconnect(ws)

@app.on_event("startup")
async def startup_event():
    """Inicia las tareas en segundo plano cuando arranca la aplicación"""
    asyncio.create_task(heartbeat_check())

@app.get("/")
async def root():
    return {"message": "Mini-UFO 4 Backend is running and ready for WebSocket connections."}

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    """Punto de entrada principal para conexiones WebSocket"""
    await manager.connect(websocket)
    try:
        session_data = manager.active_connections[websocket]
        session_interpreter = session_data["interpreter"]
        # messages = session_data["messages"] # No longer needed here, interpreter manages its own messages

        while True:
            logger.debug("Waiting for message from client...")
            # Esperar mensaje o heartbeat con timeout
            data = await asyncio.wait_for(
                websocket.receive_text(),
                timeout=HEARTBEAT_INTERVAL * 2
            )
            logger.debug(f"Received data: {data}")

            # Actualizar timestamp del último heartbeat
            session_data["last_heartbeat"] = datetime.now()

            # Verificar si es un mensaje de heartbeat
            if data.startswith("{"):
                try:
                    message = json.loads(data)
                    if message.get("type") == "heartbeat":
                        logger.debug("Received heartbeat.")
                        await manager.send_status(websocket, "connected", "Heartbeat recibido")
                        continue
                except json.JSONDecodeError:
                    pass  # No es un mensaje JSON válido, tratar como prompt

            # Procesar el prompt
            await manager.send_status(websocket, "processing", "Iniciando ejecución de tarea")

            # Procesar con interpreter
            logger.debug("Calling interpreter.chat()")
            task_start_time = datetime.now()
            # Pass the user's prompt directly, interpreter manages its own history
            response_stream = session_interpreter.chat(data, display=False, stream=True)
            
            logger.debug("Iterating through interpreter response stream...")
            for chunk in response_stream:
                try:
                    logger.debug(f"Processing chunk: {chunk}")
                    if isinstance(chunk, dict):
                        # Enviar actualizaciones de estado basadas en el tipo de chunk
                        if chunk.get("type") == "code":
                            await manager.send_status(websocket, "executing", "Ejecutando código")
                        elif chunk.get("type") == "error":
                            await manager.send_status(websocket, "error", chunk.get("content"))

                        # Enviar el chunk al cliente
                        await websocket.send_text(json.dumps(chunk, ensure_ascii=False))
                    else:
                        logger.warning(f"Received non-dict chunk: {chunk}")

                except KeyError as e:
                    logger.error(f"KeyError processing chunk: {e}. Chunk: {chunk}")
                except Exception as e:
                    logger.error(f"An unexpected error occurred while processing a chunk: {e}. Chunk: {chunk}")

            logger.debug("Finished iterating through stream.")
            # Update the session's message history from the interpreter's internal messages
            logger.debug("Updating session message history from interpreter.messages.")
            session_data["messages"] = session_interpreter.messages

            # Señalar finalización exitosa
            await manager.send_status(websocket, "completed", "Tarea completada")
            await websocket.send_text(json.dumps({"end_of_stream": True}))
                
    except WebSocketDisconnect:
        logger.info("Client disconnected", extra={"client": websocket.client})
    except asyncio.TimeoutError:
        await manager.send_status(websocket, "timeout", "Conexión expirada")
    except Exception as e:
        error_message = str(e)
        logger.error(f"An error occurred: {error_message}")
        await manager.send_status(websocket, "error", error_message)
    finally:
        # Limpieza centralizada a través del manager
        manager.disconnect(websocket)
        logger.info("Connection closed and resources released.", extra={"client": websocket.client})

