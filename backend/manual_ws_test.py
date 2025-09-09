import asyncio
import websockets
import json

async def test_websocket():
    uri = "ws://localhost:8000/ws"
    async with websockets.connect(uri) as websocket:
        print(f"Connected to {uri}")

        # Prompt de prueba
        prompt = "print('Hello from open-interpreter!')"
        print(f"Sending prompt: {prompt}")
        await websocket.send(prompt)

        try:
            while True:
                message = await websocket.recv()
                print(f"Received: {message}")
                # Puedes añadir lógica aquí para parsear el JSON y buscar 'code' o 'console'
        except websockets.exceptions.ConnectionClosedOK:
            print("Connection closed normally.")
        except Exception as e:
            print(f"An error occurred: {e}")

if __name__ == "__main__":
    # Asegúrate de que el backend esté corriendo antes de ejecutar este script
    asyncio.run(test_websocket())