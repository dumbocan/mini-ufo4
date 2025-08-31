import os
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from open_interpreter import interpreter
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

app = FastAPI()

# Configure the interpreter instance
# This will be configured once and reused for all connections.
# For a multi-user scenario, you'd create one instance per user/session.
interpreter.llm.model = "deepseek-coder"
interpreter.llm.api_key = os.getenv("DEEPSEEK_API_KEY")
interpreter.llm.api_base = os.getenv("OPENAI_API_BASE")
interpreter.auto_run = True
interpreter.disable_telemetry = True

@app.get("/")
async def root():
    return {"message": "Mini-UFO 4 Backend is running and ready for WebSocket connections."}


@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    try:
        while True:
            # Wait for a message (the prompt) from the client
            prompt = await websocket.receive_text()

            # The .chat() method returns a generator that yields messages
            for chunk in interpreter.chat(prompt, display=False, stream=True):
                # Send each chunk over the websocket to the client
                await websocket.send_json(chunk)

            # Signal the end of the stream
            await websocket.send_json({"end_of_stream": True})

    except WebSocketDisconnect:
        print("Client disconnected")
    except Exception as e:
        print(f"An error occurred: {e}")
        await websocket.send_json({"error": str(e)})
    finally:
        # Reset the interpreter's state for the next session if needed
        interpreter.reset()
        print("Connection closed and interpreter reset.")

